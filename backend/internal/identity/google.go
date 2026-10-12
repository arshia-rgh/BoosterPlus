package identity

import (
	"context"
	"crypto/hmac"
	"errors"
	"net/http"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authflow"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authidentity"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/user"
)

// GoogleIdentity is a verified provider assertion, never an unverified browser payload.
type GoogleIdentity struct {
	Subject, Email  string
	AuthenticatedAt time.Time
	IssuedAt        time.Time
}

// GoogleProvider separates verified OIDC communication from transactional account linking.
type GoogleProvider interface {
	AuthorizationURL(state, nonce, verifier string, portal Portal) string
	Exchange(context.Context, string, string, string, Portal) (GoogleIdentity, error)
}
type oidcGoogle struct {
	origins  Config
	oauth    oauth2.Config
	verifier *oidc.IDTokenVerifier
	client   *http.Client
}

// NewGoogle always discovers the official Google issuer; no request/config input can replace it.
func NewGoogle(ctx context.Context, cfg Config) (GoogleProvider, error) {
	if cfg.GoogleClientID == "" {
		return nil, nil
	}
	return newOIDC(ctx, "https://accounts.google.com", cfg, &http.Client{Timeout: 10 * time.Second})
}
func newOIDC(ctx context.Context, issuer string, cfg Config, client *http.Client) (GoogleProvider, error) {
	provider, err := oidc.NewProvider(oidc.ClientContext(ctx, client), issuer)
	if err != nil {
		return nil, errors.New("google discovery unavailable")
	}
	return &oidcGoogle{origins: Config{PublicOrigin: cfg.PublicOrigin, AdminPublicOrigin: cfg.AdminPublicOrigin, BoosterPublicOrigin: cfg.BoosterPublicOrigin}, oauth: oauth2.Config{ClientID: cfg.GoogleClientID, ClientSecret: cfg.GoogleClientSecret, Endpoint: provider.Endpoint(), Scopes: []string{oidc.ScopeOpenID, "email"}}, verifier: provider.VerifierContext(oidc.ClientContext(ctx, client), &oidc.Config{ClientID: cfg.GoogleClientID, SupportedSigningAlgs: []string{"RS256"}}), client: client}, nil
}
func (g *oidcGoogle) AuthorizationURL(state, nonce, verifier string, portal Portal) string {
	if !portal.valid() {
		return ""
	}
	config := g.oauth
	config.RedirectURL = g.origins.portalOrigin(portal) + "/api/v1/auth/portals/" + string(portal) + "/google/callback"
	return config.AuthCodeURL(state, oidc.Nonce(nonce), oauth2.S256ChallengeOption(verifier), oauth2.SetAuthURLParam("prompt", "select_account"), oauth2.SetAuthURLParam("claims", `{"id_token":{"auth_time":{"essential":true}}}`))
}
func (g *oidcGoogle) Exchange(ctx context.Context, code, verifier, nonce string, portal Portal) (GoogleIdentity, error) {
	if !portal.valid() {
		return GoogleIdentity{}, ErrInvalid
	}
	config := g.oauth
	config.RedirectURL = g.origins.portalOrigin(portal) + "/api/v1/auth/portals/" + string(portal) + "/google/callback"
	token, err := config.Exchange(oidc.ClientContext(ctx, g.client), code, oauth2.VerifierOption(verifier))
	if err != nil {
		return GoogleIdentity{}, ErrInvalid
	}
	raw, ok := token.Extra("id_token").(string)
	if !ok {
		return GoogleIdentity{}, ErrInvalid
	}
	verified, verifyErr := g.verifier.Verify(ctx, raw)
	if verifyErr != nil || !recentGoogleTime(verified.IssuedAt, time.Now()) {
		return GoogleIdentity{}, ErrInvalid
	}
	if !hmac.Equal([]byte(verified.Nonce), []byte(nonce)) || len(verified.Subject) == 0 || len(verified.Subject) > 255 {
		return GoogleIdentity{}, ErrInvalid
	}
	var claims struct {
		Email           string `json:"email"`
		EmailVerified   bool   `json:"email_verified"`
		AuthorizedParty string `json:"azp"`
		AuthTime        int64  `json:"auth_time"`
	}
	if claimErr := verified.Claims(&claims); claimErr != nil || !claims.EmailVerified {
		return GoogleIdentity{}, ErrInvalid
	}
	if (len(verified.Audience) > 1 && claims.AuthorizedParty != g.oauth.ClientID) || (claims.AuthorizedParty != "" && claims.AuthorizedParty != g.oauth.ClientID) {
		return GoogleIdentity{}, ErrInvalid
	}
	email, emailErr := NormalizeEmail(claims.Email)
	if emailErr != nil {
		return GoogleIdentity{}, ErrInvalid
	}
	return GoogleIdentity{Subject: verified.Subject, Email: email, AuthenticatedAt: time.Unix(claims.AuthTime, 0), IssuedAt: verified.IssuedAt}, nil
}

// recentGoogleTime validates provider timestamps without treating issued-at as auth-time.
func recentGoogleTime(stamp, now time.Time) bool {
	return !stamp.IsZero() && stamp.Add(RecentTTL).After(now) && !stamp.After(now.Add(time.Minute))
}

// StartGoogle stores a short-lived, browser-bound, one-use flow; verifier material is encrypted at rest.
func (s *Service) StartGoogle(ctx context.Context, p *Principal, browser, ip, purpose string, acceptTerms bool, portal Portal, acceptedVersion ...string) (string, error) {
	if s.google == nil {
		return "", ErrUnavailable
	}
	if !portal.valid() || len(browser) < 40 || len(browser) > 128 {
		return "", ErrInvalid
	}
	if err := portalMatches(p, portal); err != nil {
		return "", err
	}
	switch purpose {
	case "login":
	case "link":
		if err := Require(p, "self"); err != nil {
			return "", err
		}
		if err := s.sensitive(p); err != nil {
			return "", err
		}
	case "reauth":
		if p == nil {
			return "", ErrUnauthenticated
		}
	default:
		return "", ErrInvalid
	}
	allowed, limitErr := s.Throttle(ctx, "google.ip", ip, 30, time.Hour)
	if limitErr != nil {
		return "", limitErr
	}
	if !allowed {
		return "", ErrLimited
	}
	state := randomToken()
	nonce := randomToken()
	verifier := oauth2.GenerateVerifier()
	id := s.digest("flow.portal", string(portal), state)
	encrypted, encryptErr := s.seal("flow:"+id, []byte(verifier))
	if encryptErr != nil {
		return "", encryptErr
	}
	terms := ""
	if acceptTerms {
		version := ""
		if len(acceptedVersion) > 1 {
			return "", ErrInvalid
		}
		if len(acceptedVersion) == 1 {
			version = acceptedVersion[0]
		}
		var termsErr error
		terms, termsErr = s.acceptedTerms(ctx, s.client, version)
		if termsErr != nil {
			return "", termsErr
		}
	}
	create := s.client.AuthFlow.Create().SetID(id).SetPortal(string(portal)).SetBrowserHash(s.browserDigest(portal, browser)).SetPurpose(purpose).SetNonce(nonce).SetVerifier(encrypted).SetTermsVersion(terms).SetExpiresAt(s.now().Add(10 * time.Minute))
	if p != nil && purpose != "login" {
		create.SetUserID(p.User.ID).SetSessionID(p.Session.ID)
	}
	if _, createErr := create.Save(ctx); createErr != nil {
		return "", createErr
	}
	destination := s.google.AuthorizationURL(state, nonce, verifier, portal)
	if destination == "" {
		return "", ErrUnavailable
	}
	return destination, nil
}

// FinishGoogle consumes state before contacting the provider; failed flows cannot be replayed.
func (s *Service) FinishGoogle(ctx context.Context, p *Principal, browser, state, code string, portal Portal) (string, error) {
	if s.google == nil {
		return "", ErrUnavailable
	}
	if !portal.valid() || len(browser) < 40 || len(browser) > 128 || len(state) > 128 || len(code) > 4096 || state == "" || code == "" {
		return "", ErrInvalid
	}
	if err := portalMatches(p, portal); err != nil {
		return "", err
	}
	id := s.digest("flow.portal", string(portal), state)
	var flow *ent.AuthFlow
	claimErr := s.transaction(ctx, func(tx *ent.Tx) error {
		count, updateErr := tx.AuthFlow.Update().Where(authflow.IDEQ(id), authflow.PortalEQ(string(portal)), authflow.ConsumedEQ(false), authflow.ExpiresAtGT(s.now()), authflow.BrowserHashEQ(s.browserDigest(portal, browser))).SetConsumed(true).Save(ctx)
		if updateErr != nil {
			return updateErr
		}
		if count != 1 {
			return ErrInvalid
		}
		var readErr error
		flow, readErr = tx.AuthFlow.Get(ctx, id)
		return readErr
	})
	if claimErr != nil {
		return "", claimErr
	}
	if flow.SessionID != "" && (p == nil || p.Session.ID != flow.SessionID || p.User.ID != flow.UserID) {
		return "", ErrInvalid
	}
	verifier, decryptErr := s.open("flow:"+id, flow.Verifier)
	if decryptErr != nil {
		return "", decryptErr
	}
	assertion, providerErr := s.google.Exchange(ctx, code, string(verifier), flow.Nonce, portal)
	if providerErr != nil {
		return "", ErrInvalid
	}
	var token string
	err := s.transaction(ctx, func(tx *ent.Tx) error {
		if e := lockSecurity(ctx, tx); e != nil {
			return e
		}
		currentTerms, termsErr := s.TermsVersion(ctx, tx.Client())
		if termsErr != nil {
			return termsErr
		}

		if p != nil {
			fresh, freshErr := s.fresh(ctx, tx, p)
			if freshErr != nil {
				return freshErr
			}
			p = fresh
		}
		linked, findErr := tx.AuthIdentity.Query().Where(authidentity.PortalEQ(string(portal)), authidentity.ProviderEQ("google"), authidentity.SubjectEQ(assertion.Subject)).Only(ctx)
		if findErr != nil && !ent.IsNotFound(findErr) {
			return findErr
		}
		var account *ent.User
		switch flow.Purpose {
		case "link":
			if err := Require(p, "self"); err != nil {
				return err
			}
			if err := s.sensitive(p); err != nil {
				return err
			}
			if linked != nil && linked.UserID != p.User.ID {
				return ErrConflict
			}
			account = p.User
			if linked == nil {
				if _, createErr := tx.AuthIdentity.Create().SetID(randomToken()).SetUserID(account.ID).SetPortal(string(portal)).SetProvider("google").SetSubject(assertion.Subject).SetCreatedAt(s.now()).Save(ctx); createErr != nil {
					if ent.IsConstraintError(createErr) {
						return ErrConflict
					}
					return createErr
				}
			}
			var rotateErr error
			token, rotateErr = s.rotate(ctx, tx, p, false, false)
			if rotateErr != nil {
				return rotateErr
			}
		case "reauth":
			if p == nil || linked == nil || linked.UserID != p.User.ID {
				return ErrInvalid
			}
			if !assertion.AuthenticatedAt.Add(RecentTTL).After(s.now()) || assertion.AuthenticatedAt.After(s.now().Add(time.Minute)) {
				return ErrRecent
			}
			account = p.User
			var rotateErr error
			token, rotateErr = s.rotate(ctx, tx, p, true, false)
			if rotateErr != nil {
				return rotateErr
			}
		case "login":
			if portal != PortalCustomer && !recentGoogleTime(assertion.IssuedAt, s.now()) {
				return ErrRecent
			}
			if linked != nil {
				var accountErr error
				account, accountErr = activeUser(ctx, tx, linked.UserID)
				if accountErr != nil {
					return accountErr
				}
			} else {
				var accountErr error
				account, accountErr = s.firstGoogleAccount(ctx, tx, assertion, flow, portal, currentTerms)
				if accountErr != nil {
					return accountErr
				}
			}
			if !portal.permitsUser(account) {
				return ErrInvalid
			}
			if account.TermsVersion != currentTerms {
				if flow.TermsVersion == "" || flow.TermsVersion != currentTerms {
					return ErrTerms
				}
				var termsErr error
				account, termsErr = tx.User.UpdateOne(account).SetTermsVersion(flow.TermsVersion).SetTermsAcceptedAt(s.now()).Save(ctx)
				if termsErr != nil {
					return termsErr
				}
			}
			old := ""
			if p != nil {
				old = p.Session.ID
			}
			var issueErr error
			// Google account-session age is optional and does not describe this
			// nonce/PKCE-bound application sign-in. Staff still need PLAYORA MFA.
			// Never promote token issuance into recent credential proof: sensitive
			// actions require fresh auth_time or explicit email re-verification.
			authenticatedAt := s.now()
			if portal != PortalCustomer {
				authenticatedAt = time.Unix(0, 0)
				if recentGoogleTime(assertion.AuthenticatedAt, s.now()) {
					authenticatedAt = assertion.AuthenticatedAt
				}
			}
			token, issueErr = s.issueSessionAt(ctx, tx, account, old, portal, authenticatedAt)
			if issueErr != nil {
				return issueErr
			}
		default:
			return ErrInvalid
		}
		return audit(ctx, tx, s.now(), account.ID, "", "google."+flow.Purpose, account.ID, map[string]string{})
	})
	return token, err
}

// UnlinkGoogle requires fresh account control; email remains the verified primary fallback.
func (s *Service) UnlinkGoogle(ctx context.Context, p *Principal) error {
	return s.transaction(ctx, func(tx *ent.Tx) error {
		actor, actorErr := s.fresh(ctx, tx, p)
		if actorErr != nil {
			return actorErr
		}
		if err := Require(actor, "self"); err != nil {
			return err
		}
		if err := s.sensitive(actor); err != nil {
			return err
		}
		if actor.User.EmailVerifiedAt == nil {
			return ErrForbidden
		}
		if _, deleteErr := tx.AuthIdentity.Delete().Where(authidentity.UserIDEQ(actor.User.ID), authidentity.ProviderEQ("google")).Exec(ctx); deleteErr != nil {
			return deleteErr
		}
		if _, updateErr := tx.User.UpdateOne(actor.User).AddAuthVersion(1).Save(ctx); updateErr != nil {
			return updateErr
		}
		if err := revokeAll(ctx, tx, actor.User.ID, s.now()); err != nil {
			return err
		}
		return audit(ctx, tx, s.now(), actor.User.ID, "", "google.unlinked", actor.User.ID, map[string]string{})
	})
}

// A verified Google assertion can activate a pending invited staff account only
// in its exact namespace or a validated, unverified migration customer clone.
// Returning email identities must link Google explicitly.
func (s *Service) firstGoogleAccount(ctx context.Context, tx *ent.Tx, assertion GoogleIdentity, flow *ent.AuthFlow, portal Portal, terms string) (*ent.User, error) {
	account, err := tx.User.Query().Where(user.PortalEQ(string(portal)), user.EmailEQ(assertion.Email)).Only(ctx)
	if err != nil && !ent.IsNotFound(err) {
		return nil, err
	}
	if portal != PortalCustomer {
		if account == nil || !portal.permitsUser(account) || account.Suspended || account.DeletedAt != nil {
			return nil, ErrStaffAccess
		}
		if account.EmailVerifiedAt != nil {
			return nil, ErrConflict
		}
		account, err = tx.User.UpdateOne(account).SetEmailVerifiedAt(s.now()).Save(ctx)
	} else {
		if flow.TermsVersion == "" || flow.TermsVersion != terms {
			return nil, ErrTerms
		}
		if account == nil {
			account, err = tx.User.Create().SetPortal(string(portal)).SetEmail(assertion.Email).SetEmailVerifiedAt(s.now()).SetTermsVersion(flow.TermsVersion).SetTermsAcceptedAt(s.now()).Save(ctx)
		} else {
			migrated, migrationErr := pendingMigratedCustomer(ctx, tx, account)
			if migrationErr != nil {
				return nil, migrationErr
			}
			if !migrated {
				return nil, ErrConflict
			}
			linked, linkedErr := tx.AuthIdentity.Query().Where(authidentity.UserIDEQ(account.ID)).Exist(ctx)
			if linkedErr != nil {
				return nil, linkedErr
			}
			if linked {
				return nil, ErrConflict
			}
			account, err = tx.User.UpdateOne(account).SetEmailVerifiedAt(s.now()).SetTermsVersion(flow.TermsVersion).SetTermsAcceptedAt(s.now()).Save(ctx)
		}
	}
	if err != nil {
		if ent.IsConstraintError(err) {
			return nil, ErrConflict
		}
		return nil, err
	}
	_, err = tx.AuthIdentity.Create().SetID(randomToken()).SetUserID(account.ID).SetPortal(string(portal)).SetProvider("google").SetSubject(assertion.Subject).SetCreatedAt(s.now()).Save(ctx)
	if ent.IsConstraintError(err) {
		return nil, ErrConflict
	}
	return account, err
}
