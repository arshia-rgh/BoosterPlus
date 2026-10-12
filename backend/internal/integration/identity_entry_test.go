//go:build integration

package integration

import (
	"errors"
	"net/url"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/authchallenge"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func TestEmailResendTwoMinuteBoundary(t *testing.T) {
	f := authDB(t, nil)
	id, _ := f.request(t, "resend-boundary@example.test", "login", nil)
	f.clock.Add(119)
	request := identity.EmailRequest{Portal: identity.PortalCustomer, Email: "resend-boundary@example.test", Purpose: "login", Browser: f.browser, IP: "127.0.0.1", AcceptTerms: true}
	if _, err := f.service.RequestEmail(t.Context(), request); !errors.Is(err, identity.ErrLimited) {
		t.Fatal("resend allowed before two minutes", err)
	}
	first, err := f.client.AuthChallenge.Get(t.Context(), id)
	if err != nil || first.Consumed {
		t.Fatal("blocked resend invalidated original code", err)
	}
	f.clock.Add(1)
	newID, err := f.service.RequestEmail(t.Context(), request)
	if err != nil || newID == id || newID == "" {
		t.Fatal("resend failed at exactly two minutes", err)
	}
	first, err = f.client.AuthChallenge.Get(t.Context(), id)
	if err != nil || !first.Consumed {
		t.Fatal("successful resend retained old code", err)
	}
	if count, countErr := f.client.AuthChallenge.Query().Where(authchallenge.ConsumedEQ(false)).Count(t.Context()); countErr != nil || count != 1 {
		t.Fatal("resend must leave exactly one usable challenge", countErr)
	}
}

func TestStaffEntryUnavailableAccessNeverSendsOrCreatesIdentity(t *testing.T) {
	for _, portal := range []identity.Portal{identity.PortalAdmin, identity.PortalBooster} {
		t.Run(string(portal), func(t *testing.T) {
			provider := &googleStub{}
			f := authDB(t, provider)
			ctx := t.Context()
			role := identity.RoleAdmin
			if portal == identity.PortalBooster {
				role = identity.RoleBooster
			}
			for _, state := range []string{"missing", "suspended", "deleted"} {
				email := state + "@example.test"
				if state != "missing" {
					create := f.client.User.Create().SetPortal(string(portal)).SetEmail(email).SetRole(role).SetTermsVersion("test-v1")
					if state == "suspended" {
						create.SetSuspended(true)
					} else {
						create.SetDeletedAt(time.Unix(f.clock.Load(), 0))
					}
					if _, err := create.Save(ctx); err != nil {
						t.Fatal(err)
					}
				}
				if _, err := f.service.RequestEmail(ctx, identity.EmailRequest{Portal: portal, Email: email, Purpose: "login", Browser: f.browser, IP: "127.0.0.1"}); !errors.Is(err, identity.ErrStaffAccess) {
					t.Fatal("unavailable staff email must explain access", state, err)
				}
				provider.assertion = identity.GoogleIdentity{Email: email, Subject: state, IssuedAt: time.Unix(f.clock.Load(), 0), AuthenticatedAt: time.Unix(f.clock.Load(), 0)}
				destination, err := f.service.StartGoogle(ctx, nil, f.browser, "127.0.0.1", "login", false, portal)
				if err != nil {
					t.Fatal(err)
				}
				parsed, err := url.Parse(destination)
				if err != nil {
					t.Fatal(err)
				}
				if _, err = f.service.FinishGoogle(ctx, nil, f.browser, parsed.Query().Get("state"), "code", portal); !errors.Is(err, identity.ErrStaffAccess) {
					t.Fatal("unavailable Google staff access must be distinguished from provider failure", state, err)
				}
			}
			if count, err := f.client.AuthChallenge.Query().Count(ctx); err != nil || count != 0 {
				t.Fatal("unavailable staff access issued challenges", err)
			}
			if count, err := f.client.AuthMessage.Query().Count(ctx); err != nil || count != 0 {
				t.Fatal("unavailable staff access queued messages", err)
			}
			if count, err := f.client.User.Query().Count(ctx); err != nil || count != 2 {
				t.Fatal("unavailable staff access created an account", err)
			}
		})
	}
}
