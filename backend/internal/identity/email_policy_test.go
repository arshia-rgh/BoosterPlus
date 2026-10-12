package identity

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestEmailRequestFeedback(t *testing.T) {
	if emailRequestCooldown != 2*time.Minute || emailChallengeTTL <= emailRequestCooldown {
		t.Fatal("resend must wait two minutes while the original code remains usable")
	}
	for _, test := range []struct {
		err    error
		status int
		code   string
		retry  string
	}{
		{ErrStaffAccess, http.StatusForbidden, "staff_access_required", ""},
		{ErrLimited, http.StatusTooManyRequests, "rate_limited", "120"},
	} {
		w := httptest.NewRecorder()
		respondError(w, test.err)
		var body struct {
			Code string `json:"code"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
			t.Fatal(err)
		}
		if w.Code != test.status || body.Code != test.code || w.Header().Get("Retry-After") != test.retry {
			t.Fatal("sign-in feedback must not pretend an ineligible or throttled request sent a code")
		}
	}
}
