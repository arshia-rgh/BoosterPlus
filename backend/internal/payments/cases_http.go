package payments

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/servicecase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func actionJSON[T, R any](execute func(context.Context, *identity.Principal, string, T) (R, error)) func(http.ResponseWriter, *http.Request, *identity.Principal) error {
	return func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		var input T
		if err := read(r, &input); err != nil {
			return err
		}
		result, err := execute(r.Context(), p, r.PathValue("id"), input)
		if err != nil {
			return err
		}
		return write(w, result)
	}
}
func (s *Store) registerCases(mux *http.ServeMux) {
	register := func(pattern, capability string, mutation bool, fn func(http.ResponseWriter, *http.Request, *identity.Principal) error) {
		bucket, limit := "payments.read", 1800
		if mutation {
			bucket, limit = "payments.write", 60
		}
		mux.HandleFunc(pattern, s.auth.ProtectRate(capability, bucket, limit, time.Hour, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			return problem(w, fn(w, r, p))
		}))
	}
	for _, staff := range []bool{false, true} {
		prefix, capability := "/api/v1", "account"
		if staff {
			prefix, capability = prefix+"/admin", "admin"
		}
		register("GET "+prefix+"/refunds/{id}/history", capability, false, s.transferHistoryHandler("refund", staff))
		register("GET "+prefix+"/orders/{id}/cases", capability, false, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			value, err := s.Cases(r.Context(), p, r.PathValue("id"), staff)
			if err != nil {
				return err
			}
			return write(w, value)
		})
		register("POST "+prefix+"/orders/{id}/cases", capability, true, actionJSON(func(ctx context.Context, p *identity.Principal, id string, input CaseInput) (CaseView, error) {
			return s.OpenCase(ctx, p, id, staff, input)
		}))
		register("GET "+prefix+"/cases/{id}", capability, false, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			after := 0
			if raw := r.URL.Query().Get("after"); raw != "" {
				var err error
				after, err = strconv.Atoi(raw)
				if err != nil {
					return ErrInvalid
				}
			}
			value, err := s.Case(r.Context(), p, r.PathValue("id"), staff, after)
			if err != nil {
				return err
			}
			return write(w, value)
		})
		register("POST "+prefix+"/cases/{id}/{action}", capability, true, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			var input CaseChange
			if err := read(r, &input); err != nil {
				return err
			}
			value, err := s.ChangeCase(r.Context(), p, r.PathValue("id"), r.PathValue("action"), staff, input)
			if err != nil {
				return err
			}
			return write(w, value)
		})
		register("GET "+prefix+"/orders/{id}/refunds", capability, false, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			value, err := s.Transfers(r.Context(), p, r.PathValue("id"), staff)
			if err != nil {
				return err
			}
			return write(w, map[string]any{"transfers": value})
		})
	}
	s.registerSellerPayouts(register)
	register("GET /api/v1/admin/cases", "admin", false, s.caseQueue)
	register("GET /api/v1/admin/finance/outgoing", "admin", false, s.outgoingQueue)
	register("POST /api/v1/admin/cases/{id}/refunds", "admin", true, actionJSON(s.ProposeRefund))
	register("POST /api/v1/refunds/{id}/recipient", "account", true, actionJSON(s.ConfirmRecipient))
	register("POST /api/v1/admin/refunds/{id}/approve", "owner", true, actionJSON(s.ApproveRefund))
	register("POST /api/v1/admin/refunds/{id}/cancel", "owner", true, actionJSON(s.CancelRefund))
	register("POST /api/v1/admin/refunds/{id}/verify", "owner", true, actionJSON(func(ctx context.Context, p *identity.Principal, id string, input TransferChange) (map[string]bool, error) {
		err := s.VerifyRefund(ctx, p, id, input)
		return map[string]bool{"queued": err == nil}, err
	}))
	register("POST /api/v1/admin/finance/outgoing/reconcile", "admin", true, actionJSON(func(ctx context.Context, p *identity.Principal, _ string, input ReconcileInput) (map[string]bool, error) {
		err := s.RequestOutgoingRead(ctx, p, input)
		return map[string]bool{"queued": err == nil}, err
	}))
}
func (s *Store) caseQueue(w http.ResponseWriter, r *http.Request, _ *identity.Principal) error {
	after := r.URL.Query().Get("after")
	if after != "" && !validID(after) {
		return ErrInvalid
	}
	query := s.client.ServiceCase.Query().Where(servicecase.ActiveOrderIDNotNil()).Order(ent.Asc(servicecase.FieldID)).Limit(51)
	if after != "" {
		query.Where(servicecase.IDGT(after))
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
	result := []CaseView{}
	for _, row := range rows {
		value, e := caseView(row)
		if e != nil {
			return e
		}
		result = append(result, value)
	}
	return write(w, map[string]any{"cases": result, "next": next})
}
