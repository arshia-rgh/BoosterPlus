package privacy

import "context"

// RecoveryJournal keeps independently durable, encrypted erasure/hold evidence.
// Record must acknowledge a verified off-host write, not a local queue.
type RecoveryJournal interface {
	Record(context.Context, string, string, string) error
}

// WithRecoveryJournal is required by the application composition root. A nil
// journal leaves irreversible deletion disabled even if a policy is published.
func (s *Store) WithRecoveryJournal(journal RecoveryJournal) *Store {
	s.journalRequired = true
	s.journal = journal
	return s
}

func (s *Store) journalRecord(ctx context.Context, request, user, action string) error {
	if !s.journalRequired {
		return nil
	} // Direct domain fixtures; runtime always requires a journal.
	if s.journal == nil {
		return ErrConflict
	}
	return s.journal.Record(ctx, request, user, action)
}
