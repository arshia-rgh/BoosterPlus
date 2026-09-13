package identity

import (
	"context"
	"crypto/hmac"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authchallenge"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authrate"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/user"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
)

// EmailRequest binds a challenge to its browser, purpose, and current session where applicable.
type EmailRequest struct {
	Email        string
	AccountEmail string
	Purpose      string
	Browser      string
	IP           string
	TermsVersion string
	AcceptTerms  bool
	Principal    *Principal
}

// Throttle is a shared fixed-window limiter; rejected attempts remain counted.
func (s *Service) Throttle(ctx context.Context, scope, identity string, limit int, window time.Duration) (bool, error) {
	bucket := s.now().Unix() / int64(window.Seconds())
	key := s.digest("rate", scope, identity, strconv.FormatInt(bucket, 10))
	allowed := false
	err := s.transaction(ctx, func(tx *ent.Tx) error {
		_, writeErr := tx.ExecContext(ctx, "INSERT INTO auth_rates (id,count,expires_at) VALUES (?,1,?) ON DUPLICATE KEY UPDATE count=LEAST(count+1,1000000)", key, s.now().Add(2*window))
		if writeErr != nil {
			return writeErr
		}
		rate, readErr := tx.AuthRate.Query().Where(authrate.IDEQ(key)).Only(ctx)
		if readErr != nil {
			return readErr
		}
		allowed = rate.Count <= limit
		return nil
	})
	return allowed, err
}

// RequestEmail returns an opaque challenge ID even when issuance is throttled or an account is unavailable.
func (s *Service) RequestEmail(ctx context.Context, input EmailRequest) (string, error) {
	id := randomToken()
	email, normalizeErr := NormalizeEmail(input.Email)
	if normalizeErr != nil {
		return "", ErrInvalid
	}
	if len(input.Browser) < 40 || len(input.Browser) > 128 {
		return "", ErrInvalid
	}
	var accountID, sessionID string
	switch input.Purpose {
	case "login":
	case "reauth":
		if input.Principal == nil {
			return "", ErrUnauthenticated
		}
		email = input.Principal.User.Email
		accountID = input.Principal.User.ID
		sessionID = input.Principal.Session.ID
	case "email_change":
		if err := Require(input.Principal, "account"); err != nil {
			return "", err
		}
		if err := s.recent(input.Principal); err != nil {
			return "", err
		}
		if input.Principal.User.MfaEnabled {
			if err := s.sensitive(input.Principal); err != nil {
				return "", err
			}
		}
		accountID = input.Principal.User.ID
		sessionID = input.Principal.Session.ID
	case "recovery":
		original, originalErr := NormalizeEmail(input.AccountEmail)
		if originalErr != nil {
			return "", ErrInvalid
		}
		account, findErr := s.client.User.Query().Where(user.EmailEQ(original)).Only(ctx)
		if findErr != nil && !ent.IsNotFound(findErr) {
			return "", findErr
		}
		if account != nil {
			accountID = account.ID
		}
	default:
		return "", ErrInvalid
	}
	for _, rule := range []struct {
		scope, value string
		limit        int
		window       time.Duration
	}{{"email.ip", input.IP, 30, time.Hour}, {"email.address", email, 5, time.Hour}} {
		allowed, limitErr := s.Throttle(ctx, rule.scope, rule.value, rule.limit, rule.window)
		if limitErr != nil {
			return "", limitErr
		}
		if !allowed {
			return id, nil
		}
	}
	allowed, cooldownErr := s.cooldown(ctx, email)
	if cooldownErr != nil {
		return "", cooldownErr
	}
	if !allowed {
		return id, nil
	}
	code, codeErr := newCode()
	if codeErr != nil {
		return "", codeErr
	}
	err := s.transaction(ctx, func(tx *ent.Tx) error {
		if e := lockSecurity(ctx, tx); e != nil {
			return e
		}
		// A newly issued code invalidates previous codes for the same destination/purpose.
		if _, invalidateErr := tx.AuthChallenge.Update().Where(authchallenge.EmailEQ(email), authchallenge.PurposeEQ(input.Purpose), authchallenge.ConsumedEQ(false)).SetConsumed(true).Save(ctx); invalidateErr != nil {
			return invalidateErr
		}
		terms := ""
		if input.AcceptTerms {
			var termsErr error
			terms, termsErr = s.acceptedTerms(ctx, tx.Client(), input.TermsVersion)
			if termsErr != nil {
				return termsErr
			}
		}
		_, createErr := tx.AuthChallenge.Create().SetID(id).SetEmail(email).SetPurpose(input.Purpose).SetUserID(accountID).SetSessionID(sessionID).SetBrowserHash(s.digest("browser", input.Browser)).SetCodeDigest(s.digest("code", id, input.Purpose, code)).SetTermsVersion(terms).SetCreatedAt(s.now()).SetExpiresAt(s.now().Add(10 * time.Minute)).Save(ctx)
		if createErr != nil {
			return createErr
		}
		return s.queueMessage(ctx, tx, id, email, "Your PLAYORA verification code", fmt.Sprintf("Your code is %s. It expires in 10 minutes. Use it only for the %s request you started. If you did not request this code, ignore this email.", code, input.Purpose), 10*time.Minute)
	})
	return id, err
}

func (s *Service) queueMessage(ctx context.Context, tx *ent.Tx, challengeID, email, subject, body string, lifetime time.Duration) error {
	id := randomToken()
	payload, marshalErr := json.Marshal(Message{To: email, Subject: subject, Body: body})
	if marshalErr != nil {
		return marshalErr
	}
	ciphertext, sealErr := s.seal("message:"+id, payload)
	if sealErr != nil {
		return sealErr
	}
	if _, createErr := tx.AuthMessage.Create().SetID(id).SetChallengeID(challengeID).SetEncryptedPayload(ciphertext).SetCreatedAt(s.now()).SetExpiresAt(s.now().Add(lifetime)).Save(ctx); createErr != nil {
		return createErr
	}
	reference, referenceErr := json.Marshal(map[string]string{"message_id": id})
	if referenceErr != nil {
		return referenceErr
	}
	_, enqueueErr := jobs.EnqueueEntTx(ctx, tx, "identity.email", "identity.email:"+id, reference)
	return enqueueErr
}

// Verification never grants a login session for email-change/recovery challenges.
type Verification struct {
	Token   string
	Purpose string
}

// VerifyEmail consumes codes and creates identity/session state in one transaction.
func (s *Service) VerifyEmail(ctx context.Context, id, code, browser, ip string, p *Principal) (Verification, error) {
	if len(id) > 64 || len(code) != 6 || len(browser) < 40 {
		return Verification{}, ErrInvalid
	}
	for _, digit := range code {
		if digit < '0' || digit > '9' {
			return Verification{}, ErrInvalid
		}
	}
	allowed, limitErr := s.Throttle(ctx, "verify.ip", ip, 100, time.Hour)
	if limitErr != nil {
		return Verification{}, limitErr
	}
	if !allowed {
		return Verification{}, ErrLimited
	}
	output := Verification{}
	resultErr := ErrInvalid
	// Preserve failed-attempt/consumption state while returning a public rejection after commit.
	reject := func(reason error) error { resultErr = reason; return nil }
	txErr := s.transaction(ctx, func(tx *ent.Tx) error {
		if e := lockSecurity(ctx, tx); e != nil {
			return e
		}
		output = Verification{}
		resultErr = ErrInvalid
		if p != nil {
			fresh, refreshErr := s.fresh(ctx, tx, p)
			if refreshErr != nil {
				return refreshErr
			}
			p = fresh
		}
		count, claimErr := tx.AuthChallenge.Update().Where(authchallenge.IDEQ(id), authchallenge.BrowserHashEQ(s.digest("browser", browser)), authchallenge.ConsumedEQ(false), authchallenge.ExpiresAtGT(s.now()), authchallenge.AttemptsLT(5)).AddAttempts(1).Save(ctx)
		if claimErr != nil {
			return claimErr
		}
		if count != 1 {
			return nil
		}
		challenge, readErr := tx.AuthChallenge.Get(ctx, id)
		if readErr != nil {
			return readErr
		}
		if !hmac.Equal([]byte(challenge.CodeDigest), []byte(s.digest("code", id, challenge.Purpose, code))) {
			return nil
		}
		if challenge.SessionID != "" && (p == nil || p.Session.ID != challenge.SessionID || p.User.ID != challenge.UserID) {
			return nil
		}
		if _, consumeErr := tx.AuthChallenge.UpdateOneID(id).SetConsumed(true).Save(ctx); consumeErr != nil {
			return consumeErr
		}
		output.Purpose = challenge.Purpose
		switch challenge.Purpose {
		case "login":
			currentTerms, termsErr := s.TermsVersion(ctx, tx.Client())
			if termsErr != nil {
				return termsErr
			}
			account, accountErr := tx.User.Query().Where(user.EmailEQ(challenge.Email)).Only(ctx)
			if ent.IsNotFound(accountErr) {
				if challenge.TermsVersion == "" || challenge.TermsVersion != currentTerms {
					resultErr = ErrTerms
					return nil
				}
				account, accountErr = tx.User.Create().SetEmail(challenge.Email).SetEmailVerifiedAt(s.now()).SetTermsVersion(challenge.TermsVersion).SetTermsAcceptedAt(s.now()).Save(ctx)
			} else if accountErr == nil && account.EmailVerifiedAt == nil {
				account, accountErr = tx.User.UpdateOne(account).SetEmailVerifiedAt(s.now()).Save(ctx)
			}
			if accountErr != nil {
				if ent.IsConstraintError(accountErr) {
					resultErr = ErrConflict
					return nil
				}
				return accountErr
			}
			if account.Suspended {
				return nil
			}
			if account.TermsVersion != currentTerms {
				if challenge.TermsVersion != currentTerms || challenge.TermsVersion == "" {
					resultErr = ErrTerms
					return nil
				}
				account, accountErr = tx.User.UpdateOne(account).SetTermsVersion(challenge.TermsVersion).SetTermsAcceptedAt(s.now()).Save(ctx)
				if accountErr != nil {
					return accountErr
				}
			}
			old := ""
			if p != nil {
				old = p.Session.ID
			}
			token, sessionErr := s.issueSession(ctx, tx, account, old)
			if sessionErr != nil {
				return sessionErr
			}
			output.Token = token
			if auditErr := audit(ctx, tx, s.now(), account.ID, "", "auth.email", account.ID, map[string]string{}); auditErr != nil {
				return auditErr
			}
		case "reauth":
			if _, activeErr := activeUser(ctx, tx, challenge.UserID); activeErr != nil {
				return reject(activeErr)
			}
			token, rotateErr := s.rotate(ctx, tx, p, true, false)
			if rotateErr != nil {
				return rotateErr
			}
			output.Token = token
			if auditErr := audit(ctx, tx, s.now(), p.User.ID, "", "auth.reauthenticated", p.User.ID, map[string]string{"method": "email"}); auditErr != nil {
				return auditErr
			}
		case "email_change":
			if recentErr := s.recent(p); recentErr != nil {
				return reject(recentErr)
			}
			if p.User.MfaEnabled {
				if sensitiveErr := s.sensitive(p); sensitiveErr != nil {
					return reject(sensitiveErr)
				}
			}
			if changeErr := s.changeEmail(ctx, tx, p.User.ID, challenge.Email, p.User.ID, "email.changed", false); changeErr != nil {
				if errors.Is(changeErr, ErrConflict) {
					resultErr = ErrConflict
					return nil
				}
				return changeErr
			}
		case "recovery":
			if challenge.UserID != "" {
				if _, recoveryErr := tx.AuthRecovery.Create().SetID(randomToken()).SetUserID(challenge.UserID).SetNewEmail(challenge.Email).SetCreatedAt(s.now()).SetExpiresAt(s.now().Add(24 * time.Hour)).Save(ctx); recoveryErr != nil {
					return recoveryErr
				}
			}
		default:
			return ErrInvalid
		}
		resultErr = nil
		return nil
	})
	if txErr != nil {
		return Verification{}, txErr
	}
	if resultErr != nil {
		return Verification{}, resultErr
	}
	return output, nil
}

// A rolling cooldown is separate from hourly fixed windows, so crossing a minute boundary cannot permit a resend.
func (s *Service) cooldown(ctx context.Context, email string) (bool, error) {
	key := s.digest("email.cooldown", email)
	allowed := false
	err := s.transaction(ctx, func(tx *ent.Tx) error {
		_, writeErr := tx.ExecContext(ctx, "INSERT INTO auth_rates (id,count,expires_at) VALUES (?,1,?) ON DUPLICATE KEY UPDATE count=IF(expires_at<=?,1,LEAST(count+1,1000000)),expires_at=IF(expires_at<=?,VALUES(expires_at),expires_at)", key, s.now().Add(time.Minute), s.now(), s.now())
		if writeErr != nil {
			return writeErr
		}
		rate, readErr := tx.AuthRate.Get(ctx, key)
		if readErr != nil {
			return readErr
		}
		allowed = rate.Count == 1
		return nil
	})
	return allowed, err
}
