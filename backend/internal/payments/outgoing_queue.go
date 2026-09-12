package payments

import (
	"net/http"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/transferrecord"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func (s *Store) outgoingQueue(w http.ResponseWriter, r *http.Request, _ *identity.Principal) error {
	after := r.URL.Query().Get("after")
	if after != "" && !validID(after) {
		return ErrInvalid
	}
	query := s.client.TransferRecord.Query().Where(transferrecord.AccountEQ(s.account), transferrecord.IssueNEQ("")).Order(ent.Asc(transferrecord.FieldID)).Limit(51)
	if after != "" {
		query.Where(transferrecord.IDGT(after))
	}
	rows, err := query.All(r.Context())
	if err != nil {
		return err
	}
	next := ""
	if len(rows) > 50 {
		next = rows[49].ID
		rows = rows[:50]
	}
	records := []Record{}
	for _, row := range rows {
		records = append(records, Record{row.ID, row.ProviderID, row.AttemptID, row.State, row.Issue, row.CheckedAt})
	}
	return write(w, map[string]any{"records": records, "next": next, "enabled": s.outgoing != nil && s.outgoingEnabled})
}
