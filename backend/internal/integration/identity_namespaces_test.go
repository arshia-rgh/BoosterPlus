//go:build integration

package integration

import (
	"errors"
	"net/url"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authidentity"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authsession"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/user"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/privacy"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/privacyjournal"
)

func TestIndependentAccountsInvitationsProfilesSessionsAndEmail(t *testing.T) {
	f := authDB(t, nil)
	ctx := t.Context()
	_, pendingOwner := f.staffLogin(t, "namespace-owner@example.test", identity.RoleOwner)
	_, _, owner := f.enroll(t, pendingOwner)
	customerToken, customer := f.login(t, "same-person@example.test")
	principals := map[identity.Portal]*identity.Principal{identity.PortalCustomer: customer}
	tokens := map[identity.Portal]string{identity.PortalCustomer: customerToken}
	for _, portal := range []identity.Portal{identity.PortalAdmin, identity.PortalBooster} {
		role := identity.RoleAdmin
		if portal == identity.PortalBooster {
			role = identity.RoleBooster
		}
		input := identity.StaffInvitation{Email: customer.User.Email, Portal: portal, Role: role, DisplayName: string(portal)}
		if _, err := f.service.InviteStaff(ctx, customer, input); !errors.Is(err, identity.ErrForbidden) {
			t.Fatal("customer invited staff", err)
		}
		invited, err := f.service.InviteStaff(ctx, owner, input)
		if err != nil || invited.ID == customer.User.ID || invited.Portal != string(portal) || invited.EmailVerifiedAt != nil || invited.MfaEnabled {
			t.Fatal("staff invitation did not create independent pending identity", err)
		}
		if _, err = f.service.InviteStaff(ctx, owner, input); !errors.Is(err, identity.ErrConflict) {
			t.Fatal("duplicate namespace invitation accepted", err)
		}
		f.clock.Add(121)
		_, pending := f.login(t, input.Email, portal)
		if err = identity.Require(pending, "self"); !errors.Is(err, identity.ErrMFA) {
			t.Fatal("invited staff bypassed own authenticator", err)
		}
		_, _, tokens[portal], principals[portal] = f.enrollToken(t, pending)
		if err = f.service.UpdateProfile(ctx, principals[portal], "Independent "+string(portal), "Staff "+string(portal), false); err != nil {
			t.Fatal(err)
		}
	}
	if principals[identity.PortalAdmin].User.ID == principals[identity.PortalBooster].User.ID {
		t.Fatal("staff panels shared account ID")
	}
	for portal, principal := range principals {
		directory, directoryErr := f.service.Directory(ctx, owner, identity.UserQuery{Portal: string(portal), Search: customer.User.Email})
		if directoryErr != nil || len(directory.Users) != 1 || directory.Users[0].ID != principal.User.ID || directory.Users[0].Portal != string(portal) {
			t.Fatal("staff directory mixed same-email account namespaces", portal, directoryErr)
		}
		rows, err := f.service.Sessions(ctx, principal)
		if err != nil || len(rows) != 1 || rows[0].Portal != string(portal) || rows[0].UserID != principal.User.ID {
			t.Fatal("account session directory mixed namespaces", portal, err)
		}
		for _, role := range []string{identity.RoleCustomer, identity.RoleBooster, identity.RoleAdmin} {
			if role == principal.User.Role || portal == identity.PortalAdmin && role == identity.RoleAdmin {
				continue
			}
			if err = f.service.GrantRole(ctx, owner, principal.User.ID, role); !errors.Is(err, identity.ErrForbidden) {
				t.Fatal("role change moved account between namespaces", portal, role, err)
			}
		}
	}
	loaded, err := f.client.User.Get(ctx, customer.User.ID)
	if err != nil || loaded.DisplayName != "" || !loaded.NotifyUpdates || loaded.MfaEnabled {
		t.Fatal("staff profile or MFA changed customer account", err)
	}
	// A mailbox already used by the owner in admin is still available to this
	// independent customer account; a same-namespace conflict remains forbidden.
	id, code := f.request(t, owner.User.Email, "email_change", customer)
	if _, err = f.service.VerifyEmail(ctx, id, code, f.browser, "127.0.0.1", customer, identity.PortalCustomer); err != nil {
		t.Fatal("sibling namespace blocked independent email change", err)
	}
	recovery, err := f.client.AuthRecovery.Create().SetID(uuid.NewString()).SetUserID(customer.User.ID).SetNewEmail("recovery-destination@example.test").SetCreatedAt(time.Unix(f.clock.Load(), 0)).SetExpiresAt(time.Unix(f.clock.Load(), 0).Add(time.Hour)).Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if err = f.service.ResolveRecovery(ctx, owner, recovery.ID, "independent-case", true); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("same-email independent owner approved own recovery", err)
	}
	for _, portal := range []identity.Portal{identity.PortalAdmin, identity.PortalBooster} {
		p := f.principal(t, tokens[portal], portal)
		if p.User.Email != "same-person@example.test" {
			t.Fatal("customer email change mutated staff", portal)
		}
	}
	if _, err = f.service.Authenticate(ctx, customerToken, identity.PortalCustomer); !errors.Is(err, identity.ErrUnauthenticated) {
		t.Fatal("email change retained old own session", err)
	}
	if err = f.service.Revoke(ctx, principals[identity.PortalAdmin], "", true); err != nil {
		t.Fatal(err)
	}
	f.principal(t, tokens[identity.PortalBooster], identity.PortalBooster)
}

func TestGoogleSubjectIsIndependentInEveryAccountNamespace(t *testing.T) {
	provider := &googleStub{assertion: identity.GoogleIdentity{Subject: "one-provider-subject", Email: "same-google@example.test"}}
	f := authDB(t, provider)
	_, pendingOwner := f.staffLogin(t, "google-inviter@example.test", identity.RoleOwner)
	_, _, owner := f.enroll(t, pendingOwner)
	for _, portal := range []identity.Portal{identity.PortalAdmin, identity.PortalBooster} {
		role := identity.RoleAdmin
		if portal == identity.PortalBooster {
			role = identity.RoleBooster
		}
		if _, err := f.service.InviteStaff(t.Context(), owner, identity.StaffInvitation{Email: provider.assertion.Email, Portal: portal, Role: role}); err != nil {
			t.Fatal(err)
		}
	}
	ids := map[string]bool{}
	for _, portal := range []identity.Portal{identity.PortalCustomer, identity.PortalAdmin, identity.PortalBooster} {
		provider.assertion.AuthenticatedAt, provider.assertion.IssuedAt = time.Unix(f.clock.Load(), 0), time.Unix(f.clock.Load(), 0)
		location, err := f.service.StartGoogle(t.Context(), nil, f.browser, "127.0.0.1", "login", true, portal)
		if err != nil {
			t.Fatal(err)
		}
		parsed, err := url.Parse(location)
		if err != nil {
			t.Fatal(err)
		}
		token, err := f.service.FinishGoogle(t.Context(), nil, f.browser, parsed.Query().Get("state"), "fixture-code", portal)
		if err != nil {
			t.Fatal("same Google subject could not independently verify invited namespace", portal, err)
		}
		p := f.principal(t, token, portal)
		ids[p.User.ID] = true
		if p.User.Portal != string(portal) || p.NeedsMFA() != (portal != identity.PortalCustomer) {
			t.Fatal("Google login reused sibling identity or factor", portal)
		}
		linked, err := f.client.AuthIdentity.Query().Where(authidentity.PortalEQ(string(portal)), authidentity.SubjectEQ(provider.assertion.Subject)).Only(t.Context())
		if err != nil || linked.UserID != p.User.ID {
			t.Fatal("Google subject mapping namespace mismatch", err)
		}
	}
	if len(ids) != 3 {
		t.Fatal("same Google subject merged accounts")
	}
	if count, err := f.client.User.Query().Where(user.EmailEQ(provider.assertion.Email)).Count(t.Context()); err != nil || count != 3 {
		t.Fatal("same mailbox namespace uniqueness wrong", count, err)
	}
}

func TestOwnerPreparationRequiresOwnAdminVerificationAndMFA(t *testing.T) {
	f := authDB(t, nil)
	ctx := t.Context()
	token, customer := f.login(t, "prepared-owner@example.test")
	if err := f.service.BootstrapOwner(ctx, customer.User.ID, "fixture-operator"); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer identity promoted to owner", err)
	}
	prepared, err := f.service.PrepareOwner(ctx, customer.User.Email, "fixture-operator")
	if err != nil || prepared.ID == customer.User.ID || prepared.Portal != string(identity.PortalAdmin) || prepared.MfaEnabled || prepared.EmailVerifiedAt != nil {
		t.Fatal("prepare-owner copied customer identity/factors", err)
	}
	replayed, err := f.service.PrepareOwner(ctx, customer.User.Email, "fixture-operator")
	if err != nil || replayed.ID != prepared.ID {
		t.Fatal("prepare-owner was not idempotent", err)
	}
	if _, err = f.service.PrepareOwner(ctx, "different@example.test", "fixture-operator"); !errors.Is(err, identity.ErrConflict) {
		t.Fatal("initial owner provision expanded to another identity", err)
	}
	if err = f.service.BootstrapOwner(ctx, prepared.ID, "fixture-operator"); !errors.Is(err, identity.ErrMFA) {
		t.Fatal("unverified admin bootstrap succeeded", err)
	}
	f.clock.Add(121)
	_, pending := f.login(t, customer.User.Email, identity.PortalAdmin)
	_, _, admin := f.enroll(t, pending)
	if err = f.service.BootstrapOwner(ctx, admin.User.ID, "fixture-operator"); err != nil {
		t.Fatal(err)
	}
	f.principal(t, token, identity.PortalCustomer)
	if _, err = f.service.PrepareOwner(ctx, "later@example.test", "fixture-operator"); !errors.Is(err, identity.ErrConflict) {
		t.Fatal("owner preparation allowed after bootstrap", err)
	}
	if _, err = f.client.User.Create().SetPortal(string(identity.PortalCustomer)).SetEmail(customer.User.Email).Save(ctx); !ent.IsConstraintError(err) {
		t.Fatal("duplicate within customer namespace accepted", err)
	}
}

func TestNamespacePrivacyReplayPreservesSiblingStaffAndChallenges(t *testing.T) {
	f := authDB(t, nil)
	ctx := t.Context()
	staff, err := f.client.User.Create().SetPortal(string(identity.PortalAdmin)).SetRole(identity.RoleOwner).SetEmail("privacy-same@example.test").Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	customerID, err := identity.LegacyCustomerID(staff.ID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.client.User.Create().SetID(customerID).SetPortal(string(identity.PortalCustomer)).SetEmail(staff.Email).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.db.ExecContext(ctx, "INSERT INTO identity_namespace_splits(original_id,customer_id,created_at) VALUES (?,?,UTC_TIMESTAMP(6))", staff.ID, customerID); err != nil {
		t.Fatal(err)
	}
	requestID := uuid.NewString()
	if _, err = f.client.PrivacyRequest.Create().SetID(requestID).SetUserID(customerID).SetActiveUserID(customerID).SetPolicyID("fixture-policy").SetCreatedAt(time.Now()).SetUpdatedAt(time.Now()).Save(ctx); err != nil {
		t.Fatal(err)
	}
	for _, portal := range []identity.Portal{identity.PortalCustomer, identity.PortalAdmin} {
		if _, err = f.client.AuthChallenge.Create().SetID(string(portal)).SetPortal(string(portal)).SetEmail(staff.Email).SetPurpose("login").SetBrowserHash("fixture-browser").SetCodeDigest("fixture-code").SetCreatedAt(time.Now()).SetExpiresAt(time.Now().Add(time.Minute)).Save(ctx); err != nil {
			t.Fatal(err)
		}
	}
	entry := privacyjournal.Entry{Version: 1, Project: "fixture", Request: requestID, User: staff.ID, Action: "erased", At: time.Now()}
	if err = privacy.ReplayRecovery(ctx, f.client, []privacyjournal.Entry{entry}); err != nil {
		t.Fatal("legacy customer journal could not resolve namespace", err)
	}
	unchanged, err := f.client.User.Get(ctx, staff.ID)
	if err != nil || unchanged.Suspended || unchanged.DeletedAt != nil || unchanged.Email != staff.Email {
		t.Fatal("customer recovery erased or suspended staff", err)
	}
	removed, err := f.client.User.Get(ctx, customerID)
	if err != nil || removed.DeletedAt == nil || !removed.Suspended {
		t.Fatal("customer erasure was not replayed", err)
	}
	if _, err = f.client.AuthChallenge.Get(ctx, string(identity.PortalAdmin)); err != nil {
		t.Fatal("customer erasure removed sibling email challenge", err)
	}
	if _, err = f.client.AuthChallenge.Get(ctx, string(identity.PortalCustomer)); !ent.IsNotFound(err) {
		t.Fatal("customer challenge survived erasure", err)
	}
}

func TestMigratedCustomerGoogleActivationIsExplicitAndBounded(t *testing.T) {
	provider := &googleStub{}
	f := authDB(t, provider)
	for _, scenario := range []string{"valid", "mapping mismatch", "missing mapping", "wrong realm", "suspended", "deleted", "verified email", "existing factor", "existing Google link"} {
		t.Run(scenario, func(t *testing.T) {
			ctx := t.Context()
			original := uuid.NewString()
			customerID, err := identity.LegacyCustomerID(original)
			if err != nil {
				t.Fatal(err)
			}
			provider.assertion = identity.GoogleIdentity{Subject: uuid.NewString(), Email: original + "@example.test", AuthenticatedAt: time.Unix(f.clock.Load(), 0), IssuedAt: time.Unix(f.clock.Load(), 0)}
			staff, err := f.client.User.Create().SetID(original).SetPortal(string(identity.PortalAdmin)).SetRole(identity.RoleAdmin).SetEmail(provider.assertion.Email).SetEmailVerifiedAt(time.Unix(f.clock.Load(), 0)).SetMfaEnabled(true).SetMfaSecret([]byte("synthetic original MFA envelope")).Save(ctx)
			if err != nil {
				t.Fatal(err)
			}
			if _, err = f.client.AuthIdentity.Create().SetID(uuid.NewString()).SetPortal(string(identity.PortalAdmin)).SetUserID(staff.ID).SetProvider("google").SetSubject(provider.assertion.Subject).SetCreatedAt(time.Unix(f.clock.Load(), 0)).Save(ctx); err != nil {
				t.Fatal(err)
			}
			builder := f.client.User.Create().SetID(customerID).SetPortal(string(identity.PortalCustomer)).SetEmail(staff.Email)
			switch scenario {
			case "wrong realm":
				// A corrupted role/namespace combination never becomes a customer.
				builder.SetRole(identity.RoleAdmin)
			case "suspended":
				builder.SetSuspended(true)
			case "deleted":
				builder.SetDeletedAt(time.Unix(f.clock.Load(), 0))
			case "verified email":
				builder.SetEmailVerifiedAt(time.Unix(f.clock.Load(), 0))
			case "existing factor":
				builder.SetMfaEnabled(true)
			}
			customer, err := builder.Save(ctx)
			if err != nil {
				t.Fatal(err)
			}
			if scenario == "existing Google link" {
				if _, err = f.client.AuthIdentity.Create().SetID(uuid.NewString()).SetPortal(string(identity.PortalCustomer)).SetUserID(customer.ID).SetProvider("google").SetSubject("existing-" + original).SetCreatedAt(time.Unix(f.clock.Load(), 0)).Save(ctx); err != nil {
					t.Fatal(err)
				}
			}
			before := upgradeDigest(t, f.db, "SELECT id,email_verified_at,terms_version,mfa_enabled,mfa_secret FROM users ORDER BY id")
			mappedOriginal := original
			if scenario == "mapping mismatch" {
				mappedOriginal = uuid.NewString()
			}
			if scenario != "missing mapping" {
				executeSQL(t, f.db, `INSERT INTO identity_namespace_splits (original_id,customer_id,created_at) VALUES (?,?,UTC_TIMESTAMP(6))`, mappedOriginal, customer.ID)
			}
			location, err := f.service.StartGoogle(ctx, nil, f.browser, "127.0.0.1", "login", true, identity.PortalCustomer)
			if err != nil {
				t.Fatal(err)
			}
			parsed, err := url.Parse(location)
			if err != nil {
				t.Fatal(err)
			}
			token, finishErr := f.service.FinishGoogle(ctx, nil, f.browser, parsed.Query().Get("state"), "fixture-code", identity.PortalCustomer)
			if scenario == "valid" {
				if finishErr != nil {
					t.Fatal("first verified Google activation rejected migrated customer", finishErr)
				}
				principal := f.principal(t, token)
				if principal.User.ID != customer.ID || principal.User.MfaEnabled || principal.User.EmailVerifiedAt == nil || principal.User.TermsVersion != "test-v1" {
					t.Fatal("migration activation merged identities or inherited staff factors")
				}
			} else {
				if finishErr == nil || token != "" {
					t.Fatal("unsafe migration clone activated", finishErr)
				}
				if before != upgradeDigest(t, f.db, "SELECT id,email_verified_at,terms_version,mfa_enabled,mfa_secret FROM users ORDER BY id") {
					t.Fatal("rejected activation changed customer verification or factors")
				}
				links, linkErr := f.client.AuthIdentity.Query().Where(authidentity.UserIDEQ(customer.ID), authidentity.SubjectEQ(provider.assertion.Subject)).Count(ctx)
				if linkErr != nil || links != 0 {
					t.Fatal("rejected activation persisted a Google link", linkErr)
				}
				sessions, sessionErr := f.client.AuthSession.Query().Where(authsession.UserIDEQ(customer.ID)).Count(ctx)
				if sessionErr != nil || sessions != 0 {
					t.Fatal("rejected activation persisted a customer session", sessionErr)
				}
			}
			unchangedStaff, err := f.client.User.Get(ctx, staff.ID)
			if err != nil || !unchangedStaff.MfaEnabled || string(unchangedStaff.MfaSecret) != "synthetic original MFA envelope" {
				t.Fatal("customer activation changed original staff factor", err)
			}
			staffLink, err := f.client.AuthIdentity.Query().Where(authidentity.PortalEQ(string(identity.PortalAdmin)), authidentity.SubjectEQ(provider.assertion.Subject)).Only(ctx)
			if err != nil || staffLink.UserID != original {
				t.Fatal("customer activation changed staff Google identity", err)
			}
		})
	}
}
