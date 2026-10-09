//go:build integration

package integration

import (
	"bytes"
	"database/sql"
	"errors"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/migrate"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
)

const (
	namespaceOwner   = "00000000-0000-4000-8000-000000000101"
	namespaceStaff   = "00000000-0000-4000-8000-000000000102"
	namespaceBooster = "00000000-0000-4000-8000-000000000103"
	namespaceBuyer   = "00000000-0000-4000-8000-000000000104"
	namespaceOrder   = "00000000-0000-4000-8000-000000000110"
	namespaceOffer   = "00000000-0000-4000-8000-000000000111"
	namespaceHandoff = "00000000-0000-4000-8000-000000000112"
)

func seedNamespaceUser(t *testing.T, db *sql.DB, id, role string) {
	t.Helper()
	executeSQL(t, db, `INSERT INTO users(id,email,display_name,role,email_verified_at,mfa_enabled,mfa_secret,mfa_pending,mfa_counter,mfa_recovery_hashes,terms_version,terms_accepted_at,auth_version,created_at)
 VALUES (?,CONCAT(?,'@example.test'),'Fixture identity',?,UTC_TIMESTAMP(6),TRUE,X'01020304',X'05060708',123,'["synthetic-recovery-hash"]','accepted-fixture',UTC_TIMESTAMP(6),7,UTC_TIMESTAMP(6))`, id, id, role)
}

func seedNamespaceConversation(t *testing.T, db *sql.DB) {
	t.Helper()
	executeSQL(t, db, `INSERT INTO conversations(id,user_id,kind,subject,request_key,request_hash,created_by,created_at,updated_at,public_updated_at)
 VALUES ('customer-thread',?,'presales','Existing conversation','thread-request',REPEAT('a',64),?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, namespaceOwner, namespaceOwner)
}

func namespaceScalar(t *testing.T, db *sql.DB, query, want string, args ...any) {
	t.Helper()
	var got string
	if err := db.QueryRowContext(t.Context(), query, args...).Scan(&got); err != nil {
		t.Fatal(err)
	}
	if got != want {
		t.Fatalf("namespace projection mismatch: got %q, want %q", got, want)
	}
}

func seedNamespaceCommerce(t *testing.T, db *sql.DB) {
	t.Helper()
	for _, id := range []string{namespaceOrder, namespaceHandoff} {
		executeSQL(t, db, `INSERT INTO orders(id,user_id,game_id,game_name,slug,service,kind,request_key,request_hash,state,answers,snapshot,estimate,terms_version,created_at,updated_at)
 VALUES (?,?,'fixture-game','Fixture game','fixture-game','boost','custom',?,REPEAT('b',64),'awaiting_payment','{}','{"immutable":"agreement"}','{}','accepted-fixture',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, id, namespaceOwner, id)
	}
	executeSQL(t, db, `INSERT INTO order_contracts(id,order_id,user_id,game_id,payment_state,data,created_at) VALUES ('contract',?,?,'fixture-game','unpaid','{"immutable":"contract"}',UTC_TIMESTAMP(6))`, namespaceOrder, namespaceOwner)
	executeSQL(t, db, `INSERT INTO payment_attempts(id,order_id,contract_id,user_id,account,policy_id,policy,route,currency,amount_minor,state,invoice_id,created_at,expires_at,updated_at)
 VALUES ('attempt',?,'contract',?,'fixture','policy','{"immutable":"policy"}','{}','USD','1234','waiting','9001',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)+INTERVAL 1 DAY,UTC_TIMESTAMP(6))`, namespaceOrder, namespaceOwner)
	executeSQL(t, db, `INSERT INTO payment_receipts(id,record_id,attempt_id,order_id,user_id,currency,network,amount,state,observation_id,created_at,updated_at)
 VALUES ('receipt','record','attempt',?,?,'usdtbsc','bsc','12.34','confirmed','observation',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, namespaceOrder, namespaceOwner)
	executeSQL(t, db, `INSERT INTO service_cases(id,request_hash,order_id,user_id,kind,policy,previous_state,created_at,updated_at)
 VALUES ('case',REPEAT('c',64),?,?,'refund','{}','queued',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, namespaceOrder, namespaceOwner)
	executeSQL(t, db, `INSERT INTO money_transfers(id,request_hash,kind,case_id,receipt_id,order_id,user_id,account,currency,network,amount,terms,recipient,approved_by,created_at,updated_at)
 VALUES ('transfer',REPEAT('d',64),'refund','case','receipt',?,?,'fixture','usdtbsc','bsc','12.34','Immutable terms','{}',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, namespaceOrder, namespaceOwner, namespaceOwner)
	executeSQL(t, db, `INSERT INTO seller_offers(id,submission_id,seller_id,request_hash,data,state,control_verified_by,expires_at,created_at,updated_at)
 VALUES (?,'submission',?,REPEAT('e',64),'{"immutable":"seller agreement"}','accepted',?,UTC_TIMESTAMP(6)+INTERVAL 1 DAY,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, namespaceOffer, namespaceOwner, namespaceOwner)
	executeSQL(t, db, `INSERT INTO account_deliveries(id,order_id,listing_id,buyer_id,secret_owner_id,created_at,updated_at)
 VALUES ('delivery',?,'listing',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, namespaceHandoff, namespaceOwner, namespaceOwner)
	executeSQL(t, db, `INSERT INTO shop_recipients(id,order_id,user_id,recipient_values,created_at) VALUES ('shop-recipient','shop-order',?,'{"fixture":"recipient"}',UTC_TIMESTAMP(6))`, namespaceOwner)
	executeSQL(t, db, `INSERT INTO privacy_requests(id,user_id,active_user_id,policy_id,created_at,updated_at) VALUES ('privacy-request',?,?,'privacy-policy',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, namespaceOwner, namespaceOwner)
	seedNamespaceConversation(t, db)
	for _, message := range []struct{ id, role, visibility string }{{"customer-message", "customer", "public"}, {"staff-message", "owner", "internal"}} {
		sequence := 1
		if message.role != "customer" {
			sequence = 2
		}
		executeSQL(t, db, `INSERT INTO conversation_messages(id,conversation_id,sender_id,sender_role,sender_label,visibility,sequence,request_key,request_hash,body,attachments,created_at)
 VALUES (?,'customer-thread',?,?,'Fixture label',?,?,?,REPEAT('f',64),'Preserved message','[]',UTC_TIMESTAMP(6))`, message.id, namespaceOwner, message.role, message.visibility, sequence, message.id)
		executeSQL(t, db, `INSERT INTO media_files(id,user_id,conversation_id,visibility,request_key,request_hash,checksum,size,content_type,state,message_id,expires_at,created_at,updated_at)
 VALUES (?,?,'customer-thread',?,?,REPEAT('a',64),REPEAT('b',64),10,'image/png','ready',?,UTC_TIMESTAMP(6)+INTERVAL 1 DAY,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, message.id, namespaceOwner, message.visibility, message.id, message.id)
	}
	executeSQL(t, db, `INSERT INTO media_files(id,user_id,conversation_id,intake_key,visibility,request_key,request_hash,checksum,size,content_type,state,expires_at,created_at,updated_at)
 VALUES ('intake',?,'','intake-key','public','intake-key',REPEAT('a',64),REPEAT('b',64),10,'image/png','ready',UTC_TIMESTAMP(6)+INTERVAL 1 DAY,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, namespaceOwner)
	for _, audience := range []string{"public", "staff"} {
		executeSQL(t, db, `INSERT INTO conversation_reads(id,conversation_id,user_id,audience,sequence) VALUES (?,'customer-thread',?,?,1)`, audience, namespaceOwner, audience)
	}
	for _, kind := range []string{"conversation_customer", "conversation_staff", "order_staff"} {
		executeSQL(t, db, `INSERT INTO notifications(id,user_id,resource_id,message_id,kind,created_at) VALUES (?,?,'customer-thread',?,?,UTC_TIMESTAMP(6))`, kind, namespaceOwner, kind, kind)
	}
}

func seedNamespaceBoosterWork(t *testing.T, db *sql.DB) {
	t.Helper()
	executeSQL(t, db, `INSERT INTO staff_profiles(id,timezone,enabled,game_tags,region_tags,updated_at) VALUES (?,'UTC',TRUE,'["fixture"]','[]',UTC_TIMESTAMP(6))`, namespaceOwner)
	executeSQL(t, db, `INSERT INTO availability_windows(id,user_id,request_key,request_hash,starts_at,ends_at,timezone,created_at,updated_at)
 VALUES ('window',?,'window-key',REPEAT('a',64),UTC_TIMESTAMP(6)+INTERVAL 1 DAY,UTC_TIMESTAMP(6)+INTERVAL 2 DAY,'UTC',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, namespaceOwner)
	executeSQL(t, db, `INSERT INTO fulfillments(id,order_id,assigned_id,mode,current_note,answers,created_at,updated_at)
 VALUES ('fulfillment',?,?,'together','Preserved progress','{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, namespaceOrder, namespaceOwner)
	executeSQL(t, db, `INSERT INTO bookings(id,order_id,user_id,assigned_id,availability_id,request_key,request_hash,starts_at,ends_at,timezone,created_at,updated_at)
 VALUES ('booking',?,?,?,'window','booking-key',REPEAT('b',64),UTC_TIMESTAMP(6)+INTERVAL 1 DAY,UTC_TIMESTAMP(6)+INTERVAL 2 DAY,'UTC',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, namespaceOrder, namespaceOwner, namespaceOwner)
}

func seedNamespaceEnvelopes(t *testing.T, db *sql.DB) *vault.Keyring {
	t.Helper()
	keys, err := vault.NewKeyring("fixture", map[string][]byte{"fixture": bytes.Repeat([]byte{7}, 32)})
	if err != nil {
		t.Fatal(err)
	}
	for _, scope := range []vault.Scope{{Purpose: "game_access", ResourceID: namespaceOrder, OwnerID: namespaceOwner}, {Purpose: "account_transfer", ResourceID: namespaceOffer, OwnerID: namespaceOwner}, {Purpose: "account_transfer", ResourceID: namespaceHandoff, OwnerID: namespaceOwner}} {
		// Resource IDs are distinct and can also identify these isolated bundles.
		encrypted, sealErr := keys.Seal(scope.ResourceID, scope, []byte("synthetic namespace fixture"))
		if sealErr != nil {
			t.Fatal(sealErr)
		}
		executeSQL(t, db, `INSERT INTO secret_bundles(id,purpose,resource_id,owner_id,key_version,wrapped_key,encrypted_payload,request_key,request_hash,expires_at,created_at,updated_at)
 VALUES (?,?,?,?,?,?,?,?,REPEAT('c',64),UTC_TIMESTAMP(6)+INTERVAL 1 DAY,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, scope.ResourceID, scope.Purpose, scope.ResourceID, scope.OwnerID, encrypted.KeyID, encrypted.WrappedKey, encrypted.Payload, scope.ResourceID)
	}
	return keys
}

func TestIdentityNamespaceMigrationPreservesStaffAndCommerce(t *testing.T) {
	db := testDB(t)
	r := runner(t, db)
	if err := r.Apply(t.Context(), 40); err != nil {
		t.Fatal(err)
	}
	for id, role := range map[string]string{namespaceOwner: identity.RoleOwner, namespaceStaff: identity.RoleAdmin, namespaceBooster: identity.RoleBooster, namespaceBuyer: identity.RoleCustomer} {
		seedNamespaceUser(t, db, id, role)
		executeSQL(t, db, `INSERT INTO auth_identities(id,user_id,provider,subject,created_at) VALUES (?,?,'google',?,UTC_TIMESTAMP(6))`, id, id, id)
	}
	seedNamespaceCommerce(t, db)
	seedNamespaceBoosterWork(t, db)
	keys := seedNamespaceEnvelopes(t, db)
	executeSQL(t, db, `INSERT INTO payment_policies(id,data,created_by,created_at) VALUES ('policy','{"approved":"unchanged"}',?,UTC_TIMESTAMP(6))`, namespaceOwner)
	executeSQL(t, db, `UPDATE payment_settings SET published_id='policy',version=3 WHERE id=1`)
	executeSQL(t, db, `INSERT INTO auth_audits(id,actor_id,action,target_id,metadata,created_at) VALUES ('historic-audit',?,'fixture',?,'{}',UTC_TIMESTAMP(6))`, namespaceOwner, namespaceOrder)
	executeSQL(t, db, `INSERT INTO auth_sessions(id,user_id,portal,token_hash,auth_version,authenticated_at,created_at,last_seen_at,expires_at)
 VALUES ('old-session',?,'admin',REPEAT('d',64),7,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)+INTERVAL 1 DAY)`, namespaceOwner)
	for _, state := range []string{"pending", "approved"} {
		executeSQL(t, db, `INSERT INTO auth_recoveries(id,user_id,new_email,state,case_reference,created_at,expires_at)
 VALUES (?,?,'recovery@example.test',?,'preserved-case',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)+INTERVAL 1 DAY)`, "recovery-"+state, namespaceOwner, state)
	}
	unchanged := []string{
		`SELECT id,email,role,display_name,mfa_secret,mfa_pending,mfa_counter,mfa_recovery_hashes,mfa_enabled,auth_version,terms_version,terms_accepted_at,email_verified_at,created_at FROM users WHERE id IN ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000104') ORDER BY id`,
		`SELECT id,user_id,provider,subject,created_at FROM auth_identities ORDER BY id`,
		`SELECT id,key_version,wrapped_key,encrypted_payload,version,request_hash,request_key,expires_at FROM secret_bundles ORDER BY id`,
		`SELECT id,kind,snapshot,answers,estimate,terms_version,state,version FROM orders ORDER BY id`,
		`SELECT id,data,payment_state,created_at FROM order_contracts ORDER BY id`,
		`SELECT id,amount_minor,currency,invoice_id,policy,route,state FROM payment_attempts ORDER BY id`,
		`SELECT id,amount,currency,network,state FROM payment_receipts ORDER BY id`,
		`SELECT id,data,state,control_verified_by FROM seller_offers ORDER BY id`,
		`SELECT id,amount,recipient,approved_by,state FROM money_transfers ORDER BY id`,
		`SELECT id,data,created_by FROM payment_policies ORDER BY id`,
		`SELECT id,published_id,version,draft FROM payment_settings ORDER BY id`,
		`SELECT id,actor_id,action,target_id,metadata FROM auth_audits WHERE id='historic-audit'`,
		`SELECT id,user_id,new_email,state,case_reference,created_at,expires_at FROM auth_recoveries WHERE id='recovery-approved'`,
		`SELECT id,user_id,new_email,case_reference,created_at FROM auth_recoveries WHERE id='recovery-pending'`,
	}
	before := make([]string, len(unchanged))
	for i, query := range unchanged {
		before[i] = upgradeDigest(t, db, query)
	}
	if err := r.Apply(t.Context(), 41); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(t.Context(), db); err != nil {
		t.Fatal(err)
	}
	for i, query := range unchanged {
		if upgradeDigest(t, db, query) != before[i] {
			t.Fatalf("staff credentials, commercial terms or evidence changed: projection %d", i)
		}
	}
	assertNamespaceOwners(t, db)
	assertNamespaceVaults(t, db, keys)
	namespaceScalar(t, db, `SELECT state FROM auth_recoveries WHERE id='recovery-pending'`, "expired")
	namespaceScalar(t, db, `SELECT COUNT(*) FROM auth_recoveries WHERE state='pending'`, "0")
	namespaceScalar(t, db, `SELECT COUNT(*) FROM auth_recoveries WHERE id='recovery-pending' AND expires_at<=UTC_TIMESTAMP(6)`, "1")
	namespaceScalar(t, db, `SELECT COUNT(*) FROM auth_audits WHERE action='recovery.namespace_expired' AND target_id=? AND JSON_UNQUOTE(JSON_EXTRACT(metadata,'$.recovery_id'))='recovery-pending'`, "1", namespaceOwner)
	state := upgradeDigest(t, db, `SELECT id,portal,email,role,auth_version,mfa_secret,terms_version FROM users ORDER BY id`)
	if err := r.Apply(t.Context(), 41); err != nil {
		t.Fatal("idempotent namespace migration", err)
	}
	if state != upgradeDigest(t, db, `SELECT id,portal,email,role,auth_version,mfa_secret,terms_version FROM users ORDER BY id`) {
		t.Fatal("repeat migration created or changed accounts")
	}
	if err := r.Down(t.Context(), 1); err == nil {
		t.Fatal("independent identities were merged by rollback")
	}
	if err := r.Verify(t.Context()); err != nil {
		t.Fatal("rejected namespace rollback dirtied the migration journal", err)
	}
	assertNamespaceConstraints(t, db)
}

func assertNamespaceConstraints(t *testing.T, db *sql.DB) {
	t.Helper()
	for _, query := range []string{
		`INSERT INTO users(id,email,created_at) VALUES ('legacy-writer','legacy-writer@example.test',UTC_TIMESTAMP(6))`,
		`INSERT INTO auth_identities(id,user_id,provider,subject,created_at) VALUES ('legacy-link','legacy-writer','google','legacy-subject',UTC_TIMESTAMP(6))`,
		`INSERT INTO users(id,portal,email,created_at) SELECT 'duplicate','customer',email,UTC_TIMESTAMP(6) FROM users WHERE id='00000000-0000-4000-8000-000000000101'`,
		`INSERT INTO auth_identities(id,portal,user_id,provider,subject,created_at) SELECT 'duplicate-link',portal,user_id,provider,subject,UTC_TIMESTAMP(6) FROM auth_identities WHERE id='00000000-0000-4000-8000-000000000101'`,
	} {
		if _, err := db.ExecContext(t.Context(), query); err == nil {
			t.Fatal("namespace uniqueness or old-writer rejection missing")
		}
	}
	// An explicit new link may use the same Google subject in a different portal.
	// This is test data, not a migration copy or a runtime auto-link shortcut.
	customer, err := identity.LegacyCustomerID(namespaceOwner)
	if err != nil {
		t.Fatal(err)
	}
	executeSQL(t, db, `INSERT INTO auth_identities(id,portal,user_id,provider,subject,created_at) VALUES ('explicit-customer-link','customer',?,'google',?,UTC_TIMESTAMP(6))`, customer, namespaceOwner)
}

func assertNamespaceOwners(t *testing.T, db *sql.DB) {
	t.Helper()
	customer, err := identity.LegacyCustomerID(namespaceOwner)
	if err != nil {
		t.Fatal(err)
	}
	var booster string
	if err := db.QueryRowContext(t.Context(), `SELECT booster_id FROM identity_namespace_splits WHERE original_id=?`, namespaceOwner).Scan(&booster); err != nil || booster == "" {
		t.Fatal("separate booster identity missing", err)
	}
	for _, query := range []string{
		`SELECT user_id FROM orders WHERE id='00000000-0000-4000-8000-000000000110'`,
		`SELECT user_id FROM order_contracts WHERE id='contract'`, `SELECT user_id FROM payment_attempts WHERE id='attempt'`,
		`SELECT user_id FROM payment_receipts WHERE id='receipt'`, `SELECT user_id FROM money_transfers WHERE id='transfer'`,
		`SELECT user_id FROM service_cases WHERE id='case'`, `SELECT seller_id FROM seller_offers WHERE id='00000000-0000-4000-8000-000000000111'`,
		`SELECT buyer_id FROM account_deliveries WHERE id='delivery'`, `SELECT user_id FROM shop_recipients WHERE id='shop-recipient'`,
		`SELECT user_id FROM privacy_requests WHERE id='privacy-request'`, `SELECT active_user_id FROM privacy_requests WHERE id='privacy-request'`,
		`SELECT user_id FROM conversations WHERE id='customer-thread'`, `SELECT created_by FROM conversations WHERE id='customer-thread'`,
		`SELECT sender_id FROM conversation_messages WHERE id='customer-message'`, `SELECT user_id FROM media_files WHERE id='customer-message'`,
		`SELECT user_id FROM media_files WHERE id='intake'`, `SELECT user_id FROM conversation_reads WHERE id='public'`,
		`SELECT user_id FROM notifications WHERE id='conversation_customer'`, `SELECT user_id FROM bookings WHERE id='booking'`,
	} {
		namespaceScalar(t, db, query, customer)
	}
	for _, query := range []string{
		`SELECT secret_owner_id FROM account_deliveries WHERE id='delivery'`, `SELECT sender_id FROM conversation_messages WHERE id='staff-message'`,
		`SELECT user_id FROM media_files WHERE id='staff-message'`, `SELECT user_id FROM conversation_reads WHERE id='staff'`,
		`SELECT user_id FROM notifications WHERE id='conversation_staff'`,
	} {
		namespaceScalar(t, db, query, namespaceOwner)
	}
	for _, query := range []string{
		`SELECT id FROM staff_profiles`, `SELECT user_id FROM availability_windows WHERE id='window'`,
		`SELECT assigned_id FROM fulfillments WHERE id='fulfillment'`, `SELECT assigned_id FROM bookings WHERE id='booking'`,
		`SELECT user_id FROM notifications WHERE id='order_staff'`,
	} {
		namespaceScalar(t, db, query, booster)
	}
	namespaceScalar(t, db, `SELECT COUNT(*) FROM users`, "8")
	namespaceScalar(t, db, `SELECT COUNT(*) FROM users u JOIN identity_namespace_splits m ON u.id=m.customer_id OR u.id=m.booster_id WHERE u.mfa_enabled OR u.mfa_secret IS NOT NULL OR u.mfa_pending IS NOT NULL OR u.mfa_recovery_hashes IS NOT NULL OR u.email_verified_at IS NOT NULL OR u.terms_version<>''`, "0")
	namespaceScalar(t, db, `SELECT COUNT(*) FROM auth_identities a JOIN identity_namespace_splits m ON a.user_id=m.customer_id OR a.user_id=m.booster_id`, "0")
	namespaceScalar(t, db, `SELECT COUNT(*) FROM auth_identities a JOIN users u ON u.id=a.user_id WHERE a.portal<>u.portal`, "0")
	namespaceScalar(t, db, `SELECT COUNT(*) FROM auth_sessions WHERE revoked_at IS NULL`, "0")
	namespaceScalar(t, db, `SELECT COUNT(*) FROM identity_namespace_splits WHERE original_id=? AND booster_id IS NULL`, "1", namespaceStaff)
	namespaceScalar(t, db, `SELECT portal FROM users WHERE id=?`, "admin", namespaceOwner)
	namespaceScalar(t, db, `SELECT portal FROM users WHERE id=?`, "booster", namespaceBooster)
	namespaceScalar(t, db, `SELECT portal FROM users WHERE id=?`, "customer", namespaceBuyer)
}

func assertNamespaceVaults(t *testing.T, db *sql.DB, keys *vault.Keyring) {
	t.Helper()
	customer, err := identity.LegacyCustomerID(namespaceOwner)
	if err != nil {
		t.Fatal(err)
	}
	for _, resource := range []string{namespaceOrder, namespaceOffer, namespaceHandoff} {
		var scope vault.Scope
		var encrypted vault.Envelope
		var marker string
		if err := db.QueryRowContext(t.Context(), `SELECT purpose,resource_id,owner_id,cipher_owner_id,key_version,wrapped_key,encrypted_payload FROM secret_bundles WHERE id=?`, resource).Scan(&scope.Purpose, &scope.ResourceID, &scope.OwnerID, &marker, &encrypted.KeyID, &encrypted.WrappedKey, &encrypted.Payload); err != nil {
			t.Fatal(err)
		}
		if resource == namespaceHandoff {
			if scope.OwnerID != namespaceOwner || marker != "" {
				t.Fatal("admin handoff incorrectly moved to customer")
			}
		} else {
			if scope.OwnerID != customer || marker != namespaceOwner {
				t.Fatal("customer envelope migration binding missing")
			}
			if _, err := keys.Open(resource, scope, encrypted); !errors.Is(err, vault.ErrUnavailable) {
				t.Fatal("historical envelope accepted the new owner without compatibility binding", err)
			}
			scope.OwnerID = marker
		}
		plain, err := keys.Open(resource, scope, encrypted)
		if err != nil || string(plain) != "synthetic namespace fixture" {
			t.Fatal("migration lost protected access", err)
		}
		clear(plain)
	}
}

func TestIdentityNamespaceMigrationRefusesUnsafeHistory(t *testing.T) {
	for _, scenario := range []string{"malformed staff id", "orphan Google link", "ambiguous upload", "unknown vault resource", "derived ID collision"} {
		t.Run(scenario, func(t *testing.T) {
			db := testDB(t)
			r := runner(t, db)
			if err := r.Apply(t.Context(), 40); err != nil {
				t.Fatal(err)
			}
			seedNamespaceUser(t, db, namespaceOwner, "owner")
			switch scenario {
			case "malformed staff id":
				seedNamespaceUser(t, db, "invalid", identity.RoleAdmin)
			case "orphan Google link":
				executeSQL(t, db, `INSERT INTO auth_identities(id,user_id,provider,subject,created_at) VALUES ('orphan','missing','google','subject',UTC_TIMESTAMP(6))`)
			case "ambiguous upload":
				seedNamespaceConversation(t, db)
				executeSQL(t, db, `INSERT INTO media_files(id,user_id,conversation_id,visibility,request_key,request_hash,checksum,size,content_type,expires_at,created_at,updated_at)
 VALUES ('ambiguous',?,'customer-thread','public','ambiguous',REPEAT('a',64),REPEAT('b',64),10,'image/png',UTC_TIMESTAMP(6)+INTERVAL 1 DAY,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, namespaceOwner)
			case "unknown vault resource":
				executeSQL(t, db, `INSERT INTO secret_bundles(id,purpose,resource_id,owner_id,key_version,request_key,request_hash,expires_at,created_at,updated_at)
 VALUES ('orphan-secret','game_access','unknown',?,'fixture','orphan',REPEAT('c',64),UTC_TIMESTAMP(6)+INTERVAL 1 DAY,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, namespaceOwner)
			case "derived ID collision":
				id, err := identity.LegacyCustomerID(namespaceOwner)
				if err != nil {
					t.Fatal(err)
				}
				seedNamespaceUser(t, db, id, "customer")
			}
			before := upgradeDigest(t, db, `SELECT * FROM users ORDER BY id`)
			if err := r.Apply(t.Context(), 41); err == nil {
				t.Fatal("unsafe namespace history migrated")
			}
			if before != upgradeDigest(t, db, `SELECT * FROM users ORDER BY id`) {
				t.Fatal("failed preflight changed user data")
			}
			if err := r.Apply(t.Context(), 41); !errors.Is(err, migrate.ErrDrift) {
				t.Fatal("failed namespace migration retried without investigation", err)
			}
		})
	}
}
