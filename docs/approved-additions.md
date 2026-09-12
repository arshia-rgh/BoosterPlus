# Approved additions: R08 operations

R08 extends existing booster, promotion, review, favorite, availability, scheduling and support modules. It does not activate payments or publish commercial terms.

## Accounts and customer preferences

Account detail pages let a signed-in customer save the public listing. Favorites keep the previously published label when an account is reserved, sold, withdrawn or its game is paused; saving never reserves stock or freezes a price. Unique account inventory cannot be reordered. Boosting reorder remains a fresh draft: only compatible ordinary structured choices survive, removed/changed fields need correction, and current configuration and prices require fresh acceptance.

Account availability subscriptions can follow one listing or a game's region, rank and optional currency/maximum-price criteria. Consent is separate from order-update email preferences. The subscription begins at current inventory, without immediately emailing existing stock. New matching public releases or a closed-to-open transition can produce a deduplicated alert. Reconciliation repairs missed events, and delivery rechecks current inventory, consent revision, verified email, suspension and age. Emails never reserve stock or reveal seller data. An already in-flight SMTP send cannot be recalled; ambiguous SMTP acceptance can duplicate an email.

Customers manage subscriptions at `/availability`, including versioned unsubscribe/reactivation. Scoped email unsubscribe links require a confirmation POST; a GET never changes consent. Profile settings control ordinary activity emails; security/sign-in messages remain essential. In-app notices stay available when activity email is disabled.

## Verified feedback and financial history

Boosting and account reviews require a completed purchase with a settled active agreement and confirmed receipt allocation. Account reviews additionally require buyer acknowledgement; a seller cannot review their own inventory or moderate feedback about their own listing. Staff still cannot create customer reviews. Publication requires an explicit policy review, and low scores are not a rejection reason.

Published feedback remains visible after financial or fulfillment changes. Public status labels identify an active dispute, a confirmed refund or changed purchase/fulfillment status without exposing private cases, identities or receipt details. Edits retain immutable review history and return to moderation.

Coupon claims move from held to redeemed only with verified allocation. Expiry/cancellation releases unused claims; replays cannot redeem twice, and reversal/refund does not silently restore a spent coupon. Existing quote revisions and fresh price acceptance still apply; R08 does not add coupon discounts to unique account inventory.

## Scheduling and exceptions

The existing customer, booster and administrator calendars retain timezone/DST validation, capacity checks, versioned rescheduling, reminders, assignment boundaries and forecasts. No-shows may be recorded only after the session ends, with a note and the proper staff authority. Recording attendance or a no-show never creates a fee or refund automatically. Cancellation, delays and disputed work follow the accepted service-case policy. Active cases hold work, credential access and bookings; an accepted outcome explicitly resumes or cancels the work.

Pre-sales conversations remain private, support reconnection and unread tracking, and can link to orders without sharing internal notes. R09 completes the remaining staff administration, content, reporting and privacy workflows.

## Qualification

Automated tests use disposable SQL schemas and provider fixtures. Funded live merchant checkout/refund/payout, real mail delivery, production domains, clustered TiDB/load, and launch operations remain later qualification gates. Passing these tests is not public-launch approval.
