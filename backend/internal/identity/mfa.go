package identity

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"strings"
	"time"

	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authsession"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/user"
)

// Enrollment contains a secret shown once to its authenticated owner. Never log it.
type Enrollment struct {
	Secret string `json:"secret"`
	URL    string `json:"url"`
}

// EnrollMFA requires recent first-factor proof and cannot replace an existing second factor.
func (s *Service) EnrollMFA(ctx context.Context, p *Principal) (Enrollment, error) {
	output := Enrollment{}
	err := s.transaction(ctx, func(tx *ent.Tx) error {
		actor, actorErr := s.fresh(ctx, tx, p)
		if actorErr != nil {
			return actorErr
		}
		if recentErr := s.recent(actor); recentErr != nil {
			return recentErr
		}
		if actor.User.MfaEnabled {
			return ErrConflict
		}
		key, keyErr := totp.Generate(totp.GenerateOpts{Issuer: "Booster Plus", AccountName: actor.User.Email, SecretSize: 32, Period: 30, Digits: otp.DigitsSix})
		if keyErr != nil {
			return keyErr
		}
		encrypted, encryptErr := s.seal("mfa:"+actor.User.ID, []byte(key.Secret()))
		if encryptErr != nil {
			return encryptErr
		}
		count, updateErr := tx.User.Update().Where(user.IDEQ(actor.User.ID), user.MfaEnabledEQ(false)).SetMfaPending(encrypted).SetMfaPendingExpires(s.now().Add(10 * time.Minute)).Save(ctx)
		if updateErr != nil {
			return updateErr
		}
		if count != 1 {
			return ErrConflict
		}
		output = Enrollment{Secret: key.Secret(), URL: key.URL()}
		return nil
	})
	return output, err
}

// MFAResult returns a rotated session; recovery codes are disclosed only on enrollment/regeneration.
type MFAResult struct {
	Token         string
	RecoveryCodes []string
}

func (s *Service) recoveryCodes(id string) ([]string, []string) {
	codes := make([]string, 10)
	hashes := make([]string, 10)
	for i := range codes {
		codes[i] = rand.Text()
		hashes[i] = s.digest("mfa.recovery", id, codes[i])
	}
	return codes, hashes
}

func matchingCounter(secret, code string, now time.Time) (int64, error) {
	for _, offset := range []time.Duration{0, -30 * time.Second, 30 * time.Second} {
		moment := now.Add(offset)
		candidate, err := totp.GenerateCodeCustom(secret, moment, totp.ValidateOpts{Period: 30, Digits: otp.DigitsSix, Algorithm: otp.AlgorithmSHA1})
		if err != nil {
			return -1, err
		}
		if hmac.Equal([]byte(candidate), []byte(code)) {
			return moment.Unix() / 30, nil
		}
	}
	return -1, ErrInvalid
}

// VerifyMFA accepts a fresh authenticator code, or consumes a single-use recovery code.
func (s *Service) VerifyMFA(ctx context.Context, p *Principal, code, ip string) (MFAResult, error) {
	if p == nil {
		return MFAResult{}, ErrUnauthenticated
	}
	code = strings.TrimSpace(strings.ToUpper(code))
	if len(code) != 6 && len(code) != 26 {
		return MFAResult{}, ErrInvalid
	}
	for _, rule := range []struct {
		scope, value string
		limit        int
	}{{"mfa.user", p.User.ID, 10}, {"mfa.ip", ip, 50}} {
		allowed, limitErr := s.Throttle(ctx, rule.scope, rule.value, rule.limit, 5*time.Minute)
		if limitErr != nil {
			return MFAResult{}, limitErr
		}
		if !allowed {
			return MFAResult{}, ErrLimited
		}
	}
	output := MFAResult{}
	err := s.transaction(ctx, func(tx *ent.Tx) error {
		output = MFAResult{}
		actor, actorErr := s.fresh(ctx, tx, p)
		if actorErr != nil {
			return actorErr
		}
		account := actor.User
		enrolling := !account.MfaEnabled
		ciphertext := account.MfaSecret
		if enrolling {
			if recentErr := s.recent(actor); recentErr != nil {
				return recentErr
			}
			if account.MfaPendingExpires == nil || !account.MfaPendingExpires.After(s.now()) {
				return ErrInvalid
			}
			ciphertext = account.MfaPending
		}
		update := tx.User.Update().Where(user.IDEQ(account.ID), user.AuthVersionEQ(account.AuthVersion), user.MfaCounterEQ(account.MfaCounter))
		if len(code) == 26 && !enrolling {
			digest := s.digest("mfa.recovery", account.ID, code)
			found := -1
			for i, hash := range account.MfaRecoveryHashes {
				if hmac.Equal([]byte(hash), []byte(digest)) {
					found = i
				}
			}
			if found < 0 {
				return ErrInvalid
			}
			hashes := append([]string{}, account.MfaRecoveryHashes[:found]...)
			hashes = append(hashes, account.MfaRecoveryHashes[found+1:]...)
			// Version increment plus session reissue fences concurrent recovery-code consumption.
			update.SetMfaRecoveryHashes(hashes).AddAuthVersion(1)
		} else {
			secret, decryptErr := s.open("mfa:"+account.ID, ciphertext)
			if decryptErr != nil {
				return decryptErr
			}
			counter, counterErr := matchingCounter(string(secret), code, s.now())
			if counterErr != nil || counter <= account.MfaCounter {
				return ErrInvalid
			}
			update.SetMfaCounter(counter)
			if enrolling {
				codes, hashes := s.recoveryCodes(account.ID)
				output.RecoveryCodes = codes
				update.SetMfaSecret(ciphertext).SetMfaEnabled(true).SetMfaRecoveryHashes(hashes).ClearMfaPending().ClearMfaPendingExpires().AddAuthVersion(1)
			}
		}
		count, updateErr := update.Save(ctx)
		if updateErr != nil {
			return updateErr
		}
		if count != 1 {
			return ErrInvalid
		}
		if enrolling || len(code) == 26 {
			token, issueErr := s.reissueMFA(ctx, tx, actor, s.now())
			if issueErr != nil {
				return issueErr
			}
			output.Token = token
		} else {
			token, rotateErr := s.rotate(ctx, tx, actor, false, true)
			if rotateErr != nil {
				return rotateErr
			}
			output.Token = token
		}
		action := "mfa.verified"
		if enrolling {
			action = "mfa.enrolled"
		}
		if len(code) == 26 {
			action = "mfa.recovery_used"
		}
		return audit(ctx, tx, s.now(), account.ID, "", action, account.ID, map[string]string{})
	})
	return output, err
}

// DisableMFA is limited to customers and revokes every existing session.
func (s *Service) DisableMFA(ctx context.Context, p *Principal) error {
	return s.transaction(ctx, func(tx *ent.Tx) error {
		actor, actorErr := s.fresh(ctx, tx, p)
		if actorErr != nil {
			return actorErr
		}
		if actor.User.Role != RoleCustomer {
			return ErrForbidden
		}
		if sensitiveErr := s.sensitive(actor); sensitiveErr != nil {
			return sensitiveErr
		}
		count, updateErr := tx.User.Update().Where(user.IDEQ(actor.User.ID), user.RoleEQ(RoleCustomer), user.AuthVersionEQ(actor.User.AuthVersion)).SetMfaEnabled(false).ClearMfaSecret().ClearMfaPending().ClearMfaPendingExpires().SetMfaCounter(-1).SetMfaRecoveryHashes([]string{}).AddAuthVersion(1).Save(ctx)
		if updateErr != nil {
			return updateErr
		}
		if count != 1 {
			return ErrConflict
		}
		if revokeErr := revokeAll(ctx, tx, actor.User.ID, s.now()); revokeErr != nil {
			return revokeErr
		}
		return audit(ctx, tx, s.now(), actor.User.ID, "", "mfa.disabled", actor.User.ID, map[string]string{})
	})
}

// reissueMFA revokes all prior sessions while preserving the original first-factor time.
func (s *Service) reissueMFA(ctx context.Context, tx *ent.Tx, actor *Principal, verifiedAt time.Time) (string, error) {
	changed, readErr := tx.User.Get(ctx, actor.User.ID)
	if readErr != nil {
		return "", readErr
	}
	if revokeErr := revokeAll(ctx, tx, actor.User.ID, s.now()); revokeErr != nil {
		return "", revokeErr
	}
	token, issueErr := s.issueSession(ctx, tx, changed, "")
	if issueErr != nil {
		return "", issueErr
	}
	session, sessionErr := tx.AuthSession.Query().Where(authsession.TokenHashEQ(s.digest("session", token))).Only(ctx)
	if sessionErr != nil {
		return "", sessionErr
	}
	if _, markErr := tx.AuthSession.UpdateOne(session).SetAuthenticatedAt(actor.Session.AuthenticatedAt).SetMfaVerifiedAt(verifiedAt).Save(ctx); markErr != nil {
		return "", markErr
	}
	return token, nil
}

// RegenerateRecoveryCodes fences concurrent use of old codes and rotates the current session.
func (s *Service) RegenerateRecoveryCodes(ctx context.Context, p *Principal) (MFAResult, error) {
	output := MFAResult{}
	err := s.transaction(ctx, func(tx *ent.Tx) error {
		output = MFAResult{}
		actor, actorErr := s.fresh(ctx, tx, p)
		if actorErr != nil {
			return actorErr
		}
		if sensitiveErr := s.sensitive(actor); sensitiveErr != nil {
			return sensitiveErr
		}
		codes, hashes := s.recoveryCodes(actor.User.ID)
		count, updateErr := tx.User.Update().Where(user.IDEQ(actor.User.ID), user.AuthVersionEQ(actor.User.AuthVersion)).SetMfaRecoveryHashes(hashes).AddAuthVersion(1).Save(ctx)
		if updateErr != nil {
			return updateErr
		}
		if count != 1 {
			return ErrConflict
		}
		token, tokenErr := s.reissueMFA(ctx, tx, actor, *actor.Session.MfaVerifiedAt)
		if tokenErr != nil {
			return tokenErr
		}
		output = MFAResult{Token: token, RecoveryCodes: codes}
		return audit(ctx, tx, s.now(), actor.User.ID, "", "mfa.recovery_regenerated", actor.User.ID, map[string]string{})
	})
	return output, err
}
