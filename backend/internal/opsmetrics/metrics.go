// Package opsmetrics provides private, bounded operational aggregates without user labels.
package opsmetrics

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// Snapshot contains only numeric operational signals, never customer identifiers or payloads.
type Snapshot struct {
	ObservedAt time.Time        `json:"observed_at"`
	Values     map[string]int64 `json:"values"`
}

var queries = []struct{ name, sql string }{
	{"jobs_failed", "SELECT COUNT(*) FROM jobs WHERE state='failed'"},
	{"jobs_runnable", "SELECT COUNT(*) FROM jobs WHERE state='pending' AND available_at<=UTC_TIMESTAMP(6)"},
	{"jobs_oldest_runnable_seconds", "SELECT COALESCE(GREATEST(0,TIMESTAMPDIFF(SECOND,MIN(available_at),UTC_TIMESTAMP(6))),0) FROM jobs WHERE state='pending' AND available_at<=UTC_TIMESTAMP(6)"},
	{"jobs_expired_leases", "SELECT COUNT(*) FROM jobs WHERE state='running' AND lease_until<UTC_TIMESTAMP(6)"},
	{"auth_mail_oldest_seconds", "SELECT COALESCE(GREATEST(0,TIMESTAMPDIFF(SECOND,MIN(created_at),UTC_TIMESTAMP(6))),0) FROM auth_messages WHERE sent_at IS NULL AND expires_at>UTC_TIMESTAMP(6)"},
	{"notification_mail_oldest_seconds", "SELECT COALESCE(GREATEST(0,TIMESTAMPDIFF(SECOND,MIN(created_at),UTC_TIMESTAMP(6))),0) FROM notifications WHERE email_state='pending'"},
	{"media_scan_oldest_seconds", "SELECT COALESCE(GREATEST(0,TIMESTAMPDIFF(SECOND,MIN(created_at),UTC_TIMESTAMP(6))),0) FROM media_files WHERE state='queued'"},
	{"media_purge_oldest_seconds", "SELECT COALESCE(GREATEST(0,TIMESTAMPDIFF(SECOND,MIN(expires_at),UTC_TIMESTAMP(6))),0) FROM media_files WHERE state='deleted' AND purged_at IS NULL AND expires_at<UTC_TIMESTAMP(6)"},
	{"payment_exceptions", "SELECT COUNT(*) FROM payment_attempts WHERE state IN ('uncertain','exception')"},
	{"payment_reconciliation_oldest_seconds", "SELECT COALESCE(GREATEST(0,TIMESTAMPDIFF(SECOND,MIN(checked_at),UTC_TIMESTAMP(6))),0) FROM payment_records WHERE state IN ('unknown','detected')"},
	{"outgoing_uncertain", "SELECT COUNT(*) FROM transfer_attempts WHERE state IN ('creating','uncertain','exception')"},
	{"outgoing_reconciliation_oldest_seconds", "SELECT COALESCE(GREATEST(0,TIMESTAMPDIFF(SECOND,MIN(checked_at),UTC_TIMESTAMP(6))),0) FROM transfer_attempts WHERE state IN ('pending','creating','processing','uncertain')"},
}

// Read uses the caller's private SQL connection and returns no partial-success snapshot.
func Read(ctx context.Context, db *sql.DB) (Snapshot, error) {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	return collect(ctx, func(ctx context.Context, query string) (int64, error) {
		var value int64
		err := db.QueryRowContext(ctx, query).Scan(&value)
		return value, err
	})
}

func collect(ctx context.Context, read func(context.Context, string) (int64, error)) (Snapshot, error) {
	values := make(map[string]int64, len(queries))
	for _, query := range queries {
		if ctx.Err() != nil {
			return Snapshot{}, errors.New("operational aggregate collection interrupted")
		}
		value, err := read(ctx, query.sql)
		if err != nil || value < 0 {
			// SQL errors may contain connection details. Never forward them to metrics/alerts.
			return Snapshot{}, errors.New("operational aggregate unavailable: " + query.name)
		}
		values[query.name] = value
	}
	return Snapshot{ObservedAt: time.Now().UTC(), Values: values}, nil
}
