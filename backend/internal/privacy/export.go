package privacy

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// ExportInput selects one bounded category of the caller's own personal records.
type ExportInput struct {
	Section string `json:"section"`
	After   string `json:"after"`
}

// ExportPage is plain JSON with an audit reference, never an executable spreadsheet.
type ExportPage struct {
	Section    string           `json:"section"`
	Records    []map[string]any `json:"records"`
	Next       string           `json:"next"`
	AuditID    string           `json:"audit_id"`
	ObservedAt time.Time        `json:"observed_at"`
}

// Export requires recent self verification and commits an audit before disclosing bytes.
func (s *Store) Export(ctx context.Context, p *identity.Principal, input ExportInput) (out ExportPage, err error) {
	if len(input.Section) > 32 || input.After != "" && !validID(input.After) {
		return out, ErrInvalid
	}
	err = s.auth.RecentAccountTransaction(ctx, p, func(tx *ent.Tx, current *identity.Principal) error {
		rows, e := exportRows(ctx, tx, current.User.ID, input.Section, input.After)
		if e != nil {
			return e
		}
		out = ExportPage{Section: input.Section, Records: rows, ObservedAt: s.now(), AuditID: uuid.NewString()}
		if len(rows) > 100 {
			id, ok := rows[99]["id"].(string)
			if !ok {
				return ErrInvalid
			}
			out.Next = id
			out.Records = rows[:100]
		}
		_, e = tx.AuthAudit.Create().SetID(out.AuditID).SetActorID(current.User.ID).SetAction("privacy_export").SetTargetID(current.User.ID).SetCreatedAt(s.now()).SetMetadata(map[string]string{"section": input.Section, "filter_digest": s.auth.RequestDigest("privacy-export", []byte(strings.Join([]string{current.User.ID, input.Section, input.After}, "|")))}).Save(ctx)
		return e
	})
	return out, err
}
