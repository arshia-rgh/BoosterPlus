package vault

import (
	"bytes"
	"testing"

	"github.com/google/uuid"
)

func TestSupplierDeliveryBoundDoesNotWidenCredentialLimits(t *testing.T) {
	keys, err := NewKeyring("fixture", map[string][]byte{"fixture": bytes.Repeat([]byte{1}, 32)})
	if err != nil {
		t.Fatal(err)
	}
	id, resource, owner := uuid.NewString(), uuid.NewString(), uuid.NewString()
	value := bytes.Repeat([]byte("k"), maxSupplierDeliveryBytes)
	scope := Scope{Purpose: "supplier_delivery", ResourceID: resource, OwnerID: owner}
	envelope, err := keys.Seal(id, scope, value)
	if err != nil {
		t.Fatal(err)
	}
	opened, err := keys.Open(id, scope, envelope)
	if err != nil || !bytes.Equal(opened, value) {
		t.Fatal("bounded delivery lost", err)
	}
	if _, err = keys.Seal(id, scope, append(value, 'x')); err == nil {
		t.Fatal("unbounded delivery")
	}
	for _, purpose := range []string{"supplier_input", "game_access", "account_transfer", "chat_form"} {
		other := Scope{Purpose: purpose, ResourceID: resource, OwnerID: owner}
		if _, err = keys.Seal(id, other, value[:MaxBytes+1]); err == nil {
			t.Fatal("credential limit widened", purpose)
		}
		if _, err = keys.Open(id, other, envelope); err == nil {
			t.Fatal("delivery envelope crossed scope", purpose)
		}
	}
}
