package submissions

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
)

func TestEditIssuesIdentifyEditableFields(t *testing.T) {
	issues := editIssues(Edit{Title: "", OwnershipNotes: strings.Repeat("a", 2001)})
	if len(issues) != 2 || issues[0].Path != "title" || issues[1].Path != "ownership_notes" {
		t.Fatal(issues)
	}
	if issues = editIssues(Edit{Title: "Private account", OwnershipNotes: "Optional notes"}); len(issues) != 0 {
		t.Fatal(issues)
	}
}

func TestFieldRejectionIsAvailableToTheSellerUI(t *testing.T) {
	issues := editIssues(Edit{Title: "", OwnershipNotes: strings.Repeat("a", 2001)})
	response := httptest.NewRecorder()
	if err := failure(response, &catalog.Invalid{Issues: issues}); err != nil {
		t.Fatal(err)
	}
	if response.Code != http.StatusUnprocessableEntity {
		t.Fatal(response.Code)
	}
	var payload struct {
		Code   string          `json:"code"`
		Issues []catalog.Issue `json:"issues"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if payload.Code != "submission_invalid" || len(payload.Issues) != 2 || payload.Issues[0].Path != "title" || payload.Issues[1].Path != "ownership_notes" {
		t.Fatal(payload)
	}
}
