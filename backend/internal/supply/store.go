// Package supply owns private supplier imports and authored commercial settings.
// Catalog reads never publish products or authorize a supplier purchase.
package supply

import (
	"context"
	"errors"
	"strconv"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// Errors contain no supplier payload, credentials or customer data.
var (
	ErrInvalid     = errors.New("supplier configuration invalid")
	ErrConflict    = errors.New("supplier catalog or configuration changed")
	ErrUnavailable = errors.New("supplier connection unavailable")
)

// CatalogReader is read-only. Purchasing is deliberately outside the import path.
type CatalogReader interface {
	Connection() suppliers.Connection
	Catalog(context.Context) (suppliers.Catalog, error)
}

// Store coordinates explicit SQL persistence with current staff authority.
type Store struct {
	client  *ent.Client
	auth    *identity.Service
	readers map[suppliers.Connection]CatalogReader
	now     func() time.Time
}

// FromConfig constructs fixed-host readers; credentials stay inside the adapter.
func FromConfig(client *ent.Client, auth *identity.Service, configs []suppliers.Config) (*Store, error) {
	readers := make([]CatalogReader, 0, len(configs))
	for _, config := range configs {
		reader, err := suppliers.New(config)
		if err != nil {
			return nil, err
		}
		readers = append(readers, reader)
	}
	return New(client, auth, readers, nil)
}

// New installs configured connections without reading credentials or seeding data.
func New(client *ent.Client, auth *identity.Service, readers []CatalogReader, now func() time.Time) (*Store, error) {
	if client == nil || auth == nil {
		return nil, ErrInvalid
	}
	if now == nil {
		now = time.Now
	}
	s := &Store{client: client, auth: auth, readers: map[suppliers.Connection]CatalogReader{}, now: now}
	for _, reader := range readers {
		if reader == nil || !validConnection(reader.Connection()) || s.readers[reader.Connection()] != nil {
			return nil, ErrInvalid
		}
		s.readers[reader.Connection()] = reader
	}
	return s, nil
}

func validConnection(value suppliers.Connection) bool {
	switch value {
	case suppliers.NexusSandbox, suppliers.NexusProduction, suppliers.VendoriaTest, suppliers.VendoriaProduction:
		return true
	default:
		return false
	}
}

func validID(value string) bool {
	id, err := uuid.Parse(value)
	return err == nil && id.String() == value && id != uuid.Nil
}

func validVersion(value int) bool { return value >= 1 && value < 2147483645 }
func validMarkup(value int) bool  { return value >= 0 && value <= 100000 }

func audit(ctx context.Context, tx *ent.Tx, actor, target, action string, version int, now time.Time) error {
	_, err := tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(actor).SetActorReference(actor).
		SetTargetID(target).SetAction("supplier_" + action).SetMetadata(map[string]string{"version": strconv.Itoa(version)}).SetCreatedAt(now).Save(ctx)
	return err
}

func connection(ctx context.Context, tx *ent.Tx, id suppliers.Connection, now time.Time) (*ent.SupplierConnection, error) {
	row, err := tx.SupplierConnection.Get(ctx, string(id))
	if ent.IsNotFound(err) {
		return tx.SupplierConnection.Create().SetID(string(id)).SetMarkupBps(suppliers.DefaultMarkupBPS).SetUpdatedAt(now).Save(ctx)
	}
	return row, err
}

// ConnectionView never includes a token, balance, dashboard login or endpoint.
type ConnectionView struct {
	ID               suppliers.Connection `json:"id"`
	Testing          bool                 `json:"testing"`
	Configured       bool                 `json:"configured"`
	Version          int                  `json:"version"`
	MarkupBPS        int                  `json:"markup_bps"`
	CurrentImport    string               `json:"current_import"`
	ActiveImport     string               `json:"active_import"`
	PurchasesEnabled bool                 `json:"purchases_enabled"`
}

func connectionView(row *ent.SupplierConnection, configured bool) ConnectionView {
	id := suppliers.Connection(row.ID)
	return ConnectionView{id, id.Testing(), configured, row.Version, row.MarkupBps, row.CurrentImport, row.ActiveImport, row.PurchasesEnabled}
}

// Connections includes unconfigured platforms without inventing an imported catalog.
func (s *Store) Connections(ctx context.Context, p *identity.Principal) (out []ConnectionView, err error) {
	out = []ConnectionView{}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, _ *identity.Principal) error {
		for _, id := range []suppliers.Connection{suppliers.NexusSandbox, suppliers.VendoriaTest, suppliers.NexusProduction, suppliers.VendoriaProduction} {
			row, e := tx.SupplierConnection.Get(ctx, string(id))
			if ent.IsNotFound(e) {
				row = &ent.SupplierConnection{ID: string(id), Version: 1, MarkupBps: suppliers.DefaultMarkupBPS}
			} else if e != nil {
				return e
			}
			out = append(out, connectionView(row, s.readers[id] != nil))
		}
		return nil
	})
	return out, err
}

// SetMarkup changes the private default, never an existing order or publication.
func (s *Store) SetMarkup(ctx context.Context, p *identity.Principal, id suppliers.Connection, version, bps int) (out ConnectionView, err error) {
	if !validConnection(id) || !validVersion(version) || !validMarkup(bps) {
		return out, ErrInvalid
	}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := connection(ctx, tx, id, s.now())
		if e != nil {
			return e
		}
		if row.Version != version {
			return ErrConflict
		}
		row, e = tx.SupplierConnection.UpdateOne(row).SetMarkupBps(bps).AddVersion(1).SetUpdatedAt(s.now()).Save(ctx)
		if e != nil {
			return e
		}
		if e = audit(ctx, tx, current.User.ID, row.ID, "markup_changed", row.Version, s.now()); e != nil {
			return e
		}
		out = connectionView(row, s.readers[id] != nil)
		return nil
	})
	return out, err
}
