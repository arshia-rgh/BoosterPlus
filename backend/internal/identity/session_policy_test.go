package identity

import (
	"net/http/httptest"
	"testing"
	"time"
)

func TestPortalSessionLifetimesAndCookies(t *testing.T) {
	s := &Service{config: Config{SecureCookies: true}}
	for _, tc := range []struct {
		portal         Portal
		absolute, idle time.Duration
	}{
		{PortalCustomer, 90 * 24 * time.Hour, 30 * 24 * time.Hour},
		{PortalAdmin, 12 * time.Hour, 30 * time.Minute},
		{PortalBooster, 12 * time.Hour, 30 * time.Minute},
	} {
		if sessionLifetime(tc.portal) != tc.absolute || sessionIdleTTL(tc.portal) != tc.idle {
			t.Fatal("unexpected portal session policy", tc.portal)
		}
		w := httptest.NewRecorder()
		s.cookie(w, tc.portal, "session", "synthetic", int(sessionLifetime(tc.portal)/time.Second))
		response := w.Result()
		cookies := response.Cookies()
		if err := response.Body.Close(); err != nil {
			t.Fatal(err)
		}
		if len(cookies) != 1 || cookies[0].MaxAge != int(tc.absolute/time.Second) || !cookies[0].Secure || !cookies[0].HttpOnly || cookies[0].Domain != "" || cookies[0].Path != "/" {
			t.Fatal("session cookie lifetime/isolation", tc.portal)
		}
	}
}
