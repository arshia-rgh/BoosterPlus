package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

// SchemaVersion is the runtime's expected forward-compatible schema version.
const SchemaVersion = 40

// Ready validates version state and critical schema shape without DDL or repair.
func Ready(ctx context.Context, db *sql.DB) error {
	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("database readiness: %w", err)
	}
	var count, version int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*), COALESCE(MAX(version),0) FROM schema_migration_journal WHERE state='applied'").Scan(&count, &version); err != nil {
		return errors.New("database schema is not installed")
	}
	if count != SchemaVersion || version != SchemaVersion {
		return errors.New("database schema version is incompatible")
	}
	var incomplete int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM schema_migration_journal WHERE state NOT IN ('applied','rolled_back')").Scan(&incomplete); err != nil {
		return fmt.Errorf("schema journal unavailable: %w", err)
	}
	if incomplete != 0 {
		return errors.New("database schema migration is interrupted")
	}
	if err := checkColumns(ctx, db); err != nil {
		return err
	}
	if err := checkIndexes(ctx, db); err != nil {
		return err
	}
	if err := checkReportIndexes(ctx, db); err != nil {
		return err
	}
	var controls int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM auth_controls WHERE id=1").Scan(&controls); err != nil || controls != 1 {
		return errors.New("identity security control row is missing")
	}
	return nil
}

func checkColumns(ctx context.Context, db *sql.DB) (result error) {
	expected := map[string]string{
		"artworks.variants": "json", "artworks.state": "varchar", "artworks.request_hash": "varchar",
		"job_attempts.retry_generation": "bigint", "job_attempts.finished_at": "datetime", "job_attempts.outcome": "varchar", "job_attempts.attempt": "int", "job_attempts.started_at": "datetime",
		"articles.current_revision": "varchar", "article_revisions.data": "json",
		"shop_deliveries.proof_message_id": "varchar",
		"shop_recipients.recipient_values": "json", "shop_reservations.quantity": "bigint", "orders.shop_snapshot": "json", "shop_stocks.enabled": "tinyint",
		"shop_products.draft": "json", "shop_product_releases.data": "json", "shop_stocks.reserved": "bigint", "shop_stocks.committed": "bigint", "shop_product_events.note": "varchar",
		"payment_attempts.native_checkout": "tinyint", "payment_attempts.deposit_claimed": "tinyint", "payment_attempts.deposit_payment_id": "varchar", "payment_attempts.deposit_data": "json",
		"site_settings.draft": "json", "site_releases.data": "json", "privacy_requests.manual_hold": "tinyint", "privacy_requests.active_user_id": "varchar", "users.deleted_at": "datetime",
		"availability_targets.criteria": "json", "availability_targets.stock_marker": "varchar", "payment_attempts.post_claimed": "tinyint", "seller_offers.data": "json", "seller_offers.active_submission_id": "varchar", "seller_offer_events.version": "bigint", "account_listings.draft": "json", "account_listing_releases.data": "json", "account_reservations.active_listing_id": "varchar", "account_deliveries.dispute_until": "datetime", "money_transfers.seller_offer_id": "varchar", "orders.listing_id": "varchar", "orders.account_snapshot": "json",
		"service_cases.request_hash": "varchar", "service_cases.active_order_id": "varchar", "service_cases.policy": "json", "service_cases.version": "bigint", "case_events.version": "bigint", "case_events.actor_role": "varchar", "money_transfers.recipient": "json", "money_transfers.amount": "varchar", "transfer_attempts.active_transfer_id": "varchar", "transfer_observations.data": "json", "transfer_records.lease_until": "datetime", "transfer_events.version": "bigint", "payment_settings.outgoing_page": "bigint",
		"payment_settings.version": "bigint", "payment_policies.data": "json", "payment_attempts.active_contract_id": "varchar", "payment_attempts.policy": "json", "payment_signals.digest": "varchar", "payment_records.lease_until": "datetime", "payment_observations.data": "json", "payment_receipts.amount": "varchar", "payment_allocations.amount_minor": "varchar",
		"availability_targets.cycle": "bigint", "availability_subscriptions.email_fingerprint": "varchar", "availability_deliveries.state": "varchar", "jobs.retry_generation": "bigint", "reviews.body": "text", "reviews.rating": "tinyint", "reviews.policy": "json", "review_revisions.internal_reason": "text",
		"account_submissions.answers": "json", "account_submissions.snapshot": "json", "account_submissions.ownership_declared": "tinyint", "account_submissions.version": "bigint", "submission_events.message": "text", "conversations.submission_id": "varchar",
		"fulfillments.forecast":              "json",
		"conversations.fulfillment_order_id": "varchar", "conversations.booster_shared": "tinyint", "conversation_messages.purpose": "varchar",
		"staff_profiles.timezone": "varchar", "availability_windows.starts_at": "datetime", "bookings.starts_at": "datetime", "bookings.state": "varchar", "booking_events.note": "text",
		"fulfillments.order_id": "varchar", "fulfillments.assigned_id": "varchar", "fulfillments.answers": "json", "fulfillments.version": "bigint", "fulfillments.access_version": "bigint",
		"secret_bundles.encrypted_payload": "blob", "secret_bundles.wrapped_key": "blob", "secret_bundles.key_version": "varchar", "secret_bundles.expires_at": "datetime",
		"media_files.intake_key": "varchar", "media_files.intake_order_id": "varchar", "media_files.id": "varchar", "media_files.checksum": "char", "media_files.clean_checksum": "char", "media_files.clean_content_type": "varchar", "media_files.state": "varchar", "media_files.message_id": "varchar", "conversation_messages.attachments": "json",
		"conversations.id": "varchar", "conversations.user_id": "varchar", "conversations.public_sequence": "bigint", "conversation_messages.visibility": "varchar", "conversation_messages.body": "text", "conversation_reads.sequence": "bigint", "notifications.email_state": "varchar",
		"orders.id": "varchar", "orders.user_id": "varchar", "orders.version": "bigint", "orders.request_hash": "char", "orders.answers": "json", "orders.snapshot": "json", "orders.state": "varchar", "order_quotes.data": "json", "order_contracts.data": "json", "order_contracts.payment_state": "varchar", "order_contracts.active_order_id": "varchar", "order_contracts.capacity_held": "tinyint", "order_events.version": "bigint", "favorites.user_id": "varchar", "favorites.target": "varchar",
		"coupons.id": "varchar", "coupons.code": "varchar", "coupons.version": "bigint", "coupons.definition": "json", "coupon_revisions.definition": "json", "coupon_revisions.version": "bigint", "coupon_claims.coupon_id": "varchar", "coupon_claims.contract_id": "varchar", "coupon_claims.user_id": "varchar", "coupon_claims.state": "varchar",
		"users.email_verified_at": "datetime", "users.role": "varchar", "users.suspended": "tinyint", "users.auth_version": "bigint", "users.mfa_secret": "blob", "users.mfa_enabled": "tinyint",
		"auth_sessions.token_hash": "char", "auth_sessions.auth_version": "bigint", "auth_sessions.mfa_verified_at": "datetime", "auth_challenges.code_digest": "char", "auth_challenges.browser_hash": "char", "auth_challenges.attempts": "int", "auth_challenges.consumed": "tinyint", "auth_messages.encrypted_payload": "blob", "auth_identities.subject": "varchar", "auth_flows.verifier": "blob", "auth_rates.count": "int", "auth_audits.metadata": "json", "auth_recoveries.new_email": "varchar", "auth_controls.version": "bigint",
		"users.id": "varchar", "users.email": "varchar", "users.display_name": "varchar", "users.created_at": "datetime",
		"catalog_releases.id": "varchar", "catalog_releases.game_id": "varchar", "catalog_releases.configuration": "json", "catalog_releases.version": "bigint", "catalog_releases.created_by": "varchar", "catalog_releases.created_at": "datetime", "games.current_release": "varchar", "games.paused": "tinyint", "games.archived": "tinyint",
		"games.id": "varchar", "games.slug": "varchar", "games.name": "varchar", "games.configuration": "json", "games.version": "bigint", "games.published": "tinyint", "games.created_at": "datetime",
		"jobs.id": "varchar", "jobs.kind": "varchar", "jobs.idempotency_key": "varchar", "jobs.payload": "json", "jobs.request_hash": "char", "jobs.state": "varchar", "jobs.attempts": "int", "jobs.max_attempts": "int", "jobs.available_at": "datetime", "jobs.lease_until": "datetime", "jobs.owner": "varchar", "jobs.last_error": "varchar", "jobs.created_at": "datetime",
	}
	rows, err := db.QueryContext(ctx, "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema=DATABASE()")
	if err != nil {
		return err
	}
	defer func() { result = errors.Join(result, rows.Close()) }()
	for rows.Next() {
		var table, column, kind string
		if scanErr := rows.Scan(&table, &column, &kind); scanErr != nil {
			return scanErr
		}
		key := table + "." + column
		if wanted, ok := expected[key]; ok {
			if kind != wanted {
				return fmt.Errorf("incompatible column type: %s", key)
			}
			delete(expected, key)
		}
	}
	if rowErr := rows.Err(); rowErr != nil {
		return rowErr
	}
	if len(expected) != 0 {
		return errors.New("required schema columns are missing")
	}
	return nil
}

func checkIndexes(ctx context.Context, db *sql.DB) (result error) {
	expected := map[string]string{
		"job_attempts.PRIMARY":                     "job_id,retry_generation,attempt",
		"shop_deliveries.shop_order_delivery":      "order_id",
		"shop_reservations.shop_order_reservation": "order_id", "shop_recipients.shop_order_recipient": "order_id",
		"shop_products.shop_product_slug": "game_id,slug", "shop_product_releases.shop_product_release_version": "product_id,version", "shop_stocks.shop_variant_stock": "product_id,variant_key", "shop_product_events.shop_product_event_version": "product_id,version",
		"site_releases.site_release_version": "kind,version", "site_releases.site_release_label": "kind,label", "privacy_requests.privacy_active_user": "active_user_id",
		"seller_offers.seller_active_offer": "active_submission_id", "seller_offer_events.seller_offer_event_version": "offer_id,version", "account_listings.account_single_inventory": "submission_id", "account_listings.account_offer_inventory": "offer_id", "account_listing_releases.account_listing_release_version": "listing_id,version", "account_reservations.account_unique_reservation": "active_listing_id", "account_reservations.account_order_reservation": "order_id", "account_deliveries.account_order_delivery": "order_id", "money_transfers.seller_offer_payout": "seller_offer_id",
		"service_cases.case_active_order": "active_order_id", "case_events.case_event_version": "case_id,version", "transfer_attempts.transfer_active_attempt": "active_transfer_id", "transfer_attempts.transfer_provider_reference": "account,provider_id", "transfer_observations.transfer_observation_version": "record_id,version", "transfer_records.transfer_record_reference": "account,provider_id", "transfer_events.transfer_event_version": "transfer_id,version",
		"payment_attempts.payment_active_attempt": "active_contract_id", "payment_attempts.payment_invoice": "account,invoice_id", "payment_signals.payment_signal_dedup": "account,digest", "payment_records.payment_provider_reference": "account,payment_id", "payment_observations.payment_observation_revision": "record_id,version", "payment_receipts.payment_receipt_reference": "record_id", "payment_allocations.payment_contract_allocation": "contract_id", "payment_allocations.payment_receipt_allocation": "receipt_id", "reviews.review_order": "order_id", "reviews.review_request": "user_id,request_key", "review_revisions.review_revision": "review_id,version", "account_submissions.submission_request": "user_id,request_key", "submission_events.submission_event_version": "submission_id,version", "conversations.conversation_submission": "submission_id", "conversations.conversation_fulfillment": "fulfillment_order_id", "availability_windows.availability_request": "user_id,request_key", "bookings.booking_request": "user_id,request_key", "booking_events.booking_event_version": "booking_id,version", "fulfillments.fulfillment_order": "order_id", "secret_bundles.secret_scope": "purpose,resource_id,owner_id", "media_files.media_request": "user_id,request_key", "conversations.conversation_order": "order_id", "conversations.conversation_request": "created_by,request_key", "conversation_messages.conversation_message_request": "conversation_id,sender_id,request_key", "conversation_messages.conversation_message_sequence": "conversation_id,sequence", "conversation_messages.conversation_message_public": "conversation_id,public_sequence", "conversation_reads.conversation_reader": "conversation_id,user_id,audience", "notifications.notification_message": "user_id,message_id", "orders.PRIMARY": "id", "orders.order_request": "user_id,request_key", "order_quotes.order_quote_revision": "order_id,revision", "order_contracts.order_active_contract": "active_order_id", "order_events.order_event_revision": "order_id,version", "favorites.favorite_target": "user_id,target", "coupons.PRIMARY": "id", "coupons.coupon_code": "code", "coupon_revisions.coupon_revision": "coupon_id,version", "coupon_claims.coupon_contract": "contract_id", "catalog_releases.PRIMARY": "id", "catalog_releases.catalog_release_revision": "game_id,version", "auth_identities.auth_identity_subject": "provider,subject", "auth_sessions.auth_session_token": "token_hash", "auth_rates.PRIMARY": "id", "auth_controls.PRIMARY": "id",
		"users.PRIMARY": "id", "users.users_email_key": "email", "games.PRIMARY": "id", "games.games_slug_key": "slug", "jobs.PRIMARY": "id", "jobs.jobs_idempotency_key": "idempotency_key"}
	rows, err := db.QueryContext(ctx, "SELECT table_name,index_name,GROUP_CONCAT(column_name ORDER BY seq_in_index) FROM information_schema.statistics WHERE table_schema=DATABASE() AND non_unique=0 GROUP BY table_name,index_name")
	if err != nil {
		return err
	}
	defer func() { result = errors.Join(result, rows.Close()) }()
	for rows.Next() {
		var table, name, columns string
		if scanErr := rows.Scan(&table, &name, &columns); scanErr != nil {
			return scanErr
		}
		key := table + "." + name
		if wanted, ok := expected[key]; ok {
			if columns != wanted {
				return fmt.Errorf("incompatible unique index: %s", key)
			}
			delete(expected, key)
		}
	}
	if rowErr := rows.Err(); rowErr != nil {
		return rowErr
	}
	if len(expected) != 0 {
		return errors.New("required unique indexes are missing")
	}
	return nil
}

func checkReportIndexes(ctx context.Context, db *sql.DB) (result error) {
	expected := map[string]string{
		"reviews.review_showcase":                 "state,published_at,id",
		"payment_receipts.receipt_report_created": "created_at,id", "money_transfers.transfer_report_created": "kind,created_at,id",
		"orders.orders_discovery_game_state": "game_id,state,id", "order_events.order_events_completion_period": "order_id,action,created_at",
		"orders.orders_report_created": "created_at,id", "games.games_report_created": "created_at,id", "users.users_report_created": "created_at,id"}
	rows, err := db.QueryContext(ctx, "SELECT table_name,index_name,GROUP_CONCAT(column_name ORDER BY seq_in_index) FROM information_schema.statistics WHERE table_schema=DATABASE() AND non_unique=1 GROUP BY table_name,index_name")
	if err != nil {
		return err
	}
	defer func() { result = errors.Join(result, rows.Close()) }()
	for rows.Next() {
		var table, name, columns string
		if scanErr := rows.Scan(&table, &name, &columns); scanErr != nil {
			return scanErr
		}
		key := table + "." + name
		if wanted, ok := expected[key]; ok {
			if columns != wanted {
				return fmt.Errorf("incompatible report index: %s", key)
			}
			delete(expected, key)
		}
	}
	if rowErr := rows.Err(); rowErr != nil {
		return rowErr
	}
	if len(expected) != 0 {
		return errors.New("required report indexes are missing")
	}
	return nil
}
