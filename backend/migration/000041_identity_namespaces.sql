-- +goose NO TRANSACTION
-- +goose Up
-- Run with API/worker writers stopped. The migration journal fails closed on
-- interruption; never replay a partial migration or merge independent accounts.
-- The existing security lock row makes each failed precondition a duplicate-key
-- error before changing user records. No procedure, key material or plaintext
-- credential access is needed for this SQL-only migration.
INSERT INTO auth_controls (id,version)
SELECT 1,0 WHERE EXISTS (
 SELECT 1 FROM users WHERE role NOT IN ('customer','booster','administrator','owner')
 OR (role<>'customer' AND id NOT REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
);
INSERT INTO auth_controls (id,version)
SELECT 1,0 WHERE EXISTS (
 SELECT 1 FROM auth_identities a LEFT JOIN users u ON u.id=a.user_id WHERE u.id IS NULL
);
-- Unbound public media in a staff member's own customer thread has no recorded
-- author portal. Require explicit investigation instead of guessing its owner.
INSERT INTO auth_controls (id,version)
SELECT 1,0 WHERE EXISTS (
 SELECT 1 FROM media_files f JOIN users u ON u.id=f.user_id
 JOIN conversations c ON c.id=f.conversation_id
 WHERE u.role<>'customer' AND f.message_id IS NULL AND f.intake_key=''
 AND f.visibility='public' AND c.user_id=f.user_id AND f.state<>'deleted'
);
-- Historical account-transfer resources must be distinguishable as a seller
-- offer or an admin-authored buyer handoff. Keep handoff owners unchanged.
INSERT INTO auth_controls (id,version)
SELECT 1,0 WHERE EXISTS (
 SELECT 1 FROM secret_bundles b JOIN users u ON u.id=b.owner_id
 WHERE u.role<>'customer' AND (
  (b.purpose='game_access' AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.id=b.resource_id AND o.user_id=b.owner_id))
  OR (b.purpose='account_transfer'
   AND NOT EXISTS (SELECT 1 FROM seller_offers s WHERE s.id=b.resource_id AND s.seller_id=b.owner_id)
   AND NOT EXISTS (SELECT 1 FROM account_deliveries d WHERE d.order_id=b.resource_id AND d.secret_owner_id=b.owner_id))
  OR (b.purpose='account_transfer'
   AND EXISTS (SELECT 1 FROM seller_offers s WHERE s.id=b.resource_id AND s.seller_id=b.owner_id)
   AND EXISTS (SELECT 1 FROM account_deliveries d WHERE d.order_id=b.resource_id AND d.secret_owner_id=b.owner_id))
 )
);

CREATE TABLE identity_namespace_splits (
 original_id VARCHAR(36) NOT NULL PRIMARY KEY,
 customer_id VARCHAR(36) NOT NULL,
 booster_id VARCHAR(36) NULL,
 created_at DATETIME(6) NOT NULL,
 UNIQUE KEY identity_split_customer (customer_id),
 UNIQUE KEY identity_split_booster (booster_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- Match identity.LegacyCustomerID exactly: first 128 SHA-256 bits, with version
-- nibble 5 and variant nibble a. These identifiers confer no login authority.
INSERT INTO identity_namespace_splits (original_id,customer_id,booster_id,created_at)
SELECT id,
 CONCAT(SUBSTRING(customer_hash,1,8),'-',SUBSTRING(customer_hash,9,4),'-5',SUBSTRING(customer_hash,14,3),'-a',SUBSTRING(customer_hash,18,3),'-',SUBSTRING(customer_hash,21,12)),
 CASE WHEN needs_booster THEN CONCAT(SUBSTRING(booster_hash,1,8),'-',SUBSTRING(booster_hash,9,4),'-5',SUBSTRING(booster_hash,14,3),'-a',SUBSTRING(booster_hash,18,3),'-',SUBSTRING(booster_hash,21,12)) ELSE NULL END,
 UTC_TIMESTAMP(6)
FROM (
 SELECT u.id,LOWER(SHA2(CONCAT('playora:identity:customer:',u.id),256)) AS customer_hash,
 LOWER(SHA2(CONCAT('playora:identity:booster:',u.id),256)) AS booster_hash,
 (u.role IN ('administrator','owner') AND (
  EXISTS (SELECT 1 FROM staff_profiles p WHERE p.id=u.id)
  OR EXISTS (SELECT 1 FROM availability_windows w WHERE w.user_id=u.id)
  OR EXISTS (SELECT 1 FROM fulfillments f WHERE f.assigned_id=u.id)
  OR EXISTS (SELECT 1 FROM bookings b WHERE b.assigned_id=u.id)
 )) AS needs_booster
 FROM users u WHERE u.role<>'customer'
) AS candidates;

INSERT INTO auth_controls (id,version)
SELECT 1,0 WHERE EXISTS (
 SELECT 1 FROM identity_namespace_splits m JOIN users u ON u.id=m.customer_id OR u.id=m.booster_id
) OR EXISTS (
 SELECT 1 FROM identity_namespace_splits a JOIN identity_namespace_splits b ON a.customer_id=b.booster_id
);

ALTER TABLE users ADD COLUMN portal VARCHAR(16) NOT NULL DEFAULT 'customer';
UPDATE users SET portal=CASE WHEN role IN ('administrator','owner') THEN 'admin' WHEN role='booster' THEN 'booster' ELSE 'customer' END;
CREATE UNIQUE INDEX users_portal_email ON users (portal,email);
DROP INDEX users_email_key ON users;
ALTER TABLE auth_identities ADD COLUMN portal VARCHAR(16) NOT NULL DEFAULT 'customer';
UPDATE auth_identities a JOIN users u ON u.id=a.user_id SET a.portal=u.portal;
CREATE UNIQUE INDEX auth_identity_portal_subject ON auth_identities (portal,provider,subject);
DROP INDEX auth_identity_subject ON auth_identities;
ALTER TABLE secret_bundles ADD COLUMN cipher_owner_id VARCHAR(36) NOT NULL DEFAULT '';

-- New accounts have no copied Google mapping, verified email, terms acceptance,
-- MFA secret/recovery codes or sessions. Original staff identity bytes stay put.
INSERT INTO users (id,portal,email,display_name,role,suspended,notify_updates,created_at,deleted_at)
SELECT m.customer_id,'customer',u.email,u.display_name,'customer',u.suspended,u.notify_updates,m.created_at,u.deleted_at
FROM identity_namespace_splits m JOIN users u ON u.id=m.original_id;
INSERT INTO users (id,portal,email,display_name,role,staff_alias,suspended,notify_updates,created_at,deleted_at)
SELECT m.booster_id,'booster',u.email,u.display_name,'booster',u.staff_alias,u.suspended,u.notify_updates,m.created_at,u.deleted_at
FROM identity_namespace_splits m JOIN users u ON u.id=m.original_id WHERE m.booster_id IS NOT NULL;
-- Old binaries must not silently create a global identity after this boundary.
ALTER TABLE users ALTER COLUMN portal DROP DEFAULT;
ALTER TABLE auth_identities ALTER COLUMN portal DROP DEFAULT;

-- Classify communication/media while their original owners still exist.
UPDATE media_files f JOIN identity_namespace_splits m ON m.original_id=f.user_id
SET f.user_id=m.customer_id WHERE f.intake_key<>'';
UPDATE media_files f JOIN identity_namespace_splits m ON m.original_id=f.user_id
JOIN conversation_messages c ON c.id=f.message_id AND c.sender_id=f.user_id
SET f.user_id=m.customer_id WHERE c.sender_role='customer';
UPDATE conversation_reads r JOIN conversations c ON c.id=r.conversation_id
JOIN identity_namespace_splits m ON m.original_id=r.user_id AND m.original_id=c.user_id
SET r.user_id=m.customer_id WHERE r.audience='public';
UPDATE conversation_reads r JOIN conversations c ON c.id=r.conversation_id
JOIN fulfillments f ON f.order_id=c.fulfillment_order_id AND f.assigned_id=r.user_id
JOIN identity_namespace_splits m ON m.original_id=r.user_id
SET r.user_id=m.booster_id WHERE r.audience='public' AND c.kind='fulfillment' AND m.booster_id IS NOT NULL;
UPDATE conversation_messages c JOIN identity_namespace_splits m ON m.original_id=c.sender_id
SET c.sender_id=m.customer_id WHERE c.sender_role='customer';
UPDATE conversations c JOIN identity_namespace_splits m ON m.original_id=c.created_by AND m.original_id=c.user_id
SET c.created_by=m.customer_id WHERE c.kind<>'fulfillment';
UPDATE notifications n JOIN identity_namespace_splits m ON m.original_id=n.user_id
SET n.user_id=m.customer_id WHERE n.kind IN ('review_customer','submission_seller','conversation_customer','order_customer','booking_customer');
UPDATE notifications n JOIN identity_namespace_splits m ON m.original_id=n.user_id
SET n.user_id=m.booster_id WHERE m.booster_id IS NOT NULL AND n.kind IN ('coordination_booster','booking_staff','order_staff');

-- Preserve ciphertext verbatim. Runtime accepts the old cryptographic owner only
-- when logical owner equals its deterministic customer ID and the exact current
-- purpose/resource scope matches. Normal replacement binds fresh ciphertext to
-- the current logical owner and clears cipher_owner_id.
UPDATE secret_bundles b JOIN identity_namespace_splits m ON m.original_id=b.owner_id
JOIN orders o ON o.id=b.resource_id AND o.user_id=b.owner_id
SET b.cipher_owner_id=m.original_id,b.owner_id=m.customer_id WHERE b.purpose='game_access';
UPDATE secret_bundles b JOIN identity_namespace_splits m ON m.original_id=b.owner_id
JOIN seller_offers s ON s.id=b.resource_id AND s.seller_id=b.owner_id
SET b.cipher_owner_id=m.original_id,b.owner_id=m.customer_id WHERE b.purpose='account_transfer';

UPDATE orders r JOIN identity_namespace_splits m ON m.original_id=r.user_id SET r.user_id=m.customer_id;
UPDATE order_contracts r JOIN identity_namespace_splits m ON m.original_id=r.user_id SET r.user_id=m.customer_id;
UPDATE coupon_claims r JOIN identity_namespace_splits m ON m.original_id=r.user_id SET r.user_id=m.customer_id;
UPDATE favorites r JOIN identity_namespace_splits m ON m.original_id=r.user_id SET r.user_id=m.customer_id;
UPDATE account_submissions r JOIN identity_namespace_splits m ON m.original_id=r.user_id SET r.user_id=m.customer_id;
UPDATE reviews r JOIN identity_namespace_splits m ON m.original_id=r.user_id SET r.user_id=m.customer_id;
UPDATE availability_subscriptions r JOIN identity_namespace_splits m ON m.original_id=r.user_id SET r.user_id=m.customer_id;
UPDATE payment_attempts r JOIN identity_namespace_splits m ON m.original_id=r.user_id SET r.user_id=m.customer_id;
UPDATE payment_receipts r JOIN identity_namespace_splits m ON m.original_id=r.user_id SET r.user_id=m.customer_id;
UPDATE service_cases r JOIN identity_namespace_splits m ON m.original_id=r.user_id SET r.user_id=m.customer_id;
UPDATE money_transfers r JOIN identity_namespace_splits m ON m.original_id=r.user_id SET r.user_id=m.customer_id;
UPDATE seller_offers r JOIN identity_namespace_splits m ON m.original_id=r.seller_id SET r.seller_id=m.customer_id;
UPDATE account_listings r JOIN identity_namespace_splits m ON m.original_id=r.seller_id SET r.seller_id=m.customer_id;
UPDATE account_reservations r JOIN identity_namespace_splits m ON m.original_id=r.user_id SET r.user_id=m.customer_id;
UPDATE account_deliveries r JOIN identity_namespace_splits m ON m.original_id=r.buyer_id SET r.buyer_id=m.customer_id;
UPDATE shop_reservations r JOIN identity_namespace_splits m ON m.original_id=r.user_id SET r.user_id=m.customer_id;
UPDATE shop_recipients r JOIN identity_namespace_splits m ON m.original_id=r.user_id SET r.user_id=m.customer_id;
UPDATE bookings r JOIN identity_namespace_splits m ON m.original_id=r.user_id SET r.user_id=m.customer_id;
UPDATE conversations r JOIN identity_namespace_splits m ON m.original_id=r.user_id SET r.user_id=m.customer_id;
UPDATE privacy_requests r JOIN identity_namespace_splits m ON m.original_id=r.active_user_id SET r.active_user_id=m.customer_id;
UPDATE privacy_requests r JOIN identity_namespace_splits m ON m.original_id=r.user_id SET r.user_id=m.customer_id;

-- Booster operations move separately; administrative authors, shop assignees,
-- release creators, approval actors and buyer-handoff secret owners remain intact.
UPDATE staff_profiles r JOIN identity_namespace_splits m ON m.original_id=r.id SET r.id=m.booster_id WHERE m.booster_id IS NOT NULL;
UPDATE availability_windows r JOIN identity_namespace_splits m ON m.original_id=r.user_id SET r.user_id=m.booster_id WHERE m.booster_id IS NOT NULL;
UPDATE fulfillments r JOIN identity_namespace_splits m ON m.original_id=r.assigned_id SET r.assigned_id=m.booster_id WHERE m.booster_id IS NOT NULL;
UPDATE bookings r JOIN identity_namespace_splits m ON m.original_id=r.assigned_id SET r.assigned_id=m.booster_id WHERE m.booster_id IS NOT NULL;

-- No old bearer/challenge is silently transferred to a newly created account.
-- Do not bump auth_version: original staff approval/scheduled-job bindings remain.
UPDATE auth_sessions SET revoked_at=UTC_TIMESTAMP(6) WHERE revoked_at IS NULL;
UPDATE auth_challenges SET consumed=TRUE WHERE consumed=FALSE;
UPDATE auth_flows SET consumed=TRUE WHERE consumed=FALSE;
UPDATE auth_messages SET encrypted_payload=NULL,expires_at=LEAST(expires_at,UTC_TIMESTAMP(6)) WHERE sent_at IS NULL;
-- Historical recovery cases did not record their portal. Preserve their evidence
-- but require a newly verified request in the intended namespace before approval.
INSERT INTO auth_audits (id,actor_id,actor_reference,action,target_id,metadata,created_at)
SELECT UUID(),'','migration:41','recovery.namespace_expired',user_id,
 JSON_OBJECT('recovery_id',id),UTC_TIMESTAMP(6) FROM auth_recoveries WHERE state='pending';
UPDATE auth_recoveries SET state='expired',expires_at=LEAST(expires_at,UTC_TIMESTAMP(6)) WHERE state='pending';
INSERT INTO auth_audits (id,actor_id,actor_reference,action,target_id,metadata,created_at)
SELECT UUID(),'','migration:41','identity.namespace_split',original_id,
 JSON_OBJECT('customer_id',customer_id,'booster_id',COALESCE(booster_id,'')),created_at
FROM identity_namespace_splits;

-- +goose Down
-- Independent same-email accounts cannot safely be merged. The runner rejects
-- crossing this boundary before journal mutation; this is a defensive SQL guard.
INSERT INTO auth_controls (id,version) VALUES (1,0);
