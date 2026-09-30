//go:build integration

package integration

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
)

// This rehearsal starts at the released pre-redesign schema. Fixtures are
// structural commercial evidence, never prices/terms to publish or live money.
func TestDesignUpgradePreservesHistoricalCommercialEvidence(t *testing.T) {
	db := testDB(t)
	ctx := t.Context()
	r := runner(t, db)
	if err := r.Apply(ctx, 25); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(ctx, db); err == nil {
		t.Fatal("old schema passed readiness")
	}
	statements := []string{
		`INSERT INTO users(id,email,display_name,created_at) VALUES ('old-customer','old@example.test','Historical customer',UTC_TIMESTAMP(6))`,
		`INSERT INTO games(id,slug,name,configuration,version,published,current_release,created_at) VALUES ('old-game','historic-game','Historical game','{"fixture":"catalog"}',4,TRUE,'old-release',UTC_TIMESTAMP(6))`,
		`INSERT INTO catalog_releases(id,game_id,version,configuration,created_by,created_at) VALUES ('old-release','old-game',4,'{"fixture":"released-catalog"}','staff',UTC_TIMESTAMP(6))`,
		`INSERT INTO seller_offers(id,submission_id,seller_id,request_hash,data,state,expires_at,created_at,updated_at) VALUES ('old-offer','old-submission','old-customer',REPEAT('a',64),'{"arrangement":"consignment","terms":"accepted fixture terms"}','accepted',UTC_TIMESTAMP(6)+INTERVAL 1 DAY,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,
		`INSERT INTO conversations(id,user_id,kind,order_id,subject,request_key,request_hash,created_by,created_at,updated_at,public_updated_at) VALUES ('old-thread','old-customer','order','old-custom','Historical support','old-key',REPEAT('b',64),'old-customer',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,
		`INSERT INTO conversation_messages(id,conversation_id,sender_id,sender_role,sender_label,visibility,sequence,public_sequence,request_key,request_hash,body,attachments,created_at) VALUES ('old-message','old-thread','old-customer','customer','Historical customer','public',1,1,'old-message-key',REPEAT('c',64),'Historical support evidence','["old-media"]',UTC_TIMESTAMP(6))`,
		`INSERT INTO media_files(id,user_id,conversation_id,visibility,request_key,request_hash,checksum,size,content_type,state,message_id,expires_at,created_at,updated_at) VALUES ('old-media','old-customer','old-thread','public','old-media-key',REPEAT('d',64),REPEAT('e',64),10,'image/png','ready','old-message',UTC_TIMESTAMP(6)+INTERVAL 1 DAY,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,
		`INSERT INTO site_settings(id,version,current_release,draft,updated_at) VALUES ('legal',3,'old-policy','{"text":"Current approved fixture policy"}',UTC_TIMESTAMP(6))`,
		`INSERT INTO site_releases(id,kind,version,label,data,created_by,created_at) VALUES ('old-policy','legal',3,'historic-v3','{"text":"Historical accepted fixture policy"}','staff',UTC_TIMESTAMP(6))`,
		`INSERT INTO payment_attempts(id,order_id,contract_id,user_id,account,policy_id,policy,route,currency,amount_minor,state,invoice_id,checkout_url,created_at,expires_at,updated_at) VALUES ('old-invoice','old-package','contract-package','old-customer','fixture','policy','{"fixture":"policy"}','{"fixture":"route"}','USD','1234','waiting','90001','https://example.test/old-invoice',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)+INTERVAL 1 DAY,UTC_TIMESTAMP(6))`,
	}
	for _, statement := range statements {
		executeSQL(t, db, statement)
	}
	for _, kind := range []string{"custom", "package", "account"} {
		executeSQL(t, db, `INSERT INTO orders(id,user_id,game_id,game_name,slug,service,kind,request_key,request_hash,state,answers,snapshot,estimate,terms_version,created_at,updated_at) VALUES (?,'old-customer','old-game','Historical game','historic-game','boost',?,?,REPEAT('f',64),'awaiting_payment','{"fixture":"answers"}','{"fixture":"immutable snapshot"}','{"fixture":"estimate"}','historic-v3',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`, "old-"+kind, kind, "request-"+kind)
		executeSQL(t, db, `INSERT INTO order_contracts(id,order_id,user_id,game_id,payment_state,data,created_at) VALUES (?,?,'old-customer','old-game','unpaid','{"amount_minor":"1234","terms":"accepted fixture agreement"}',UTC_TIMESTAMP(6))`, "contract-"+kind, "old-"+kind)
	}
	// Compare the existing commercial game; migration 39 adds private starter rows
	// and refreshes only pristine MLBB artwork, covered separately in seed tests.
	queries := []string{
		"SELECT id,email,display_name,auth_version FROM users ORDER BY id",
		"SELECT id,slug,configuration,version,published,current_release FROM games WHERE id='old-game' ORDER BY id",
		"SELECT id,game_id,version,configuration FROM catalog_releases ORDER BY id",
		"SELECT id,user_id,kind,state,answers,snapshot,estimate,terms_version,version FROM orders ORDER BY id",
		"SELECT id,order_id,payment_state,data FROM order_contracts ORDER BY id",
		"SELECT id,invoice_id,checkout_url,currency,amount_minor,policy,route,state FROM payment_attempts ORDER BY id",
		"SELECT id,data,state,seller_id,version FROM seller_offers ORDER BY id",
		"SELECT id,user_id,order_id,subject,state FROM conversations ORDER BY id",
		"SELECT id,conversation_id,body,attachments,visibility FROM conversation_messages ORDER BY id",
		"SELECT id,user_id,conversation_id,message_id,checksum,state FROM media_files ORDER BY id",
		"SELECT id,version,current_release,draft FROM site_settings ORDER BY id",
		"SELECT id,kind,version,label,data FROM site_releases ORDER BY id",
	}
	before := make([]string, len(queries))
	for i, q := range queries {
		before[i] = upgradeDigest(t, db, q)
	}
	started := time.Now()
	if err := r.Apply(ctx, 0); err != nil {
		t.Fatal(err)
	}
	t.Logf("SQL 25 to %d completed in %s", database.SchemaVersion, time.Since(started))
	if err := r.Apply(ctx, 0); err != nil {
		t.Fatal("repeat upgrade", err)
	}
	if err := database.Ready(ctx, db); err != nil {
		t.Fatal(err)
	}
	for i, q := range queries {
		if after := upgradeDigest(t, db, q); after != before[i] {
			t.Fatalf("historical projection %d changed", i)
		}
	}
	var native, claimed bool
	if err := db.QueryRowContext(ctx, "SELECT native_checkout,deposit_claimed FROM payment_attempts WHERE id='old-invoice'").Scan(&native, &claimed); err != nil || native || !claimed {
		t.Fatal("hosted invoice compatibility", err)
	}
	var scope string
	if err := db.QueryRowContext(ctx, "SELECT intake_key FROM media_files WHERE id='old-media'").Scan(&scope); err != nil || scope != "" {
		t.Fatal("old media became intake", err)
	}
	var attempts int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM job_attempts").Scan(&attempts); err != nil || attempts != 0 {
		t.Fatal("invented queue history", err)
	}
}
func upgradeDigest(t *testing.T, db *sql.DB, query string) string {
	t.Helper()
	rows, err := db.QueryContext(t.Context(), query)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if e := rows.Close(); e != nil {
			t.Error(e)
		}
	}()
	columns, err := rows.Columns()
	if err != nil {
		t.Fatal(err)
	}
	digest := sha256.New()
	encoder := json.NewEncoder(digest)
	for rows.Next() {
		values := make([]sql.RawBytes, len(columns))
		dest := make([]any, len(columns))
		for i := range dest {
			dest[i] = &values[i]
		}
		if e := rows.Scan(dest...); e != nil {
			t.Fatal(e)
		}
		if e := encoder.Encode(values); e != nil {
			t.Fatal(e)
		}
	}
	if e := rows.Err(); e != nil {
		t.Fatal(e)
	}
	return hex.EncodeToString(digest.Sum(nil))
}
