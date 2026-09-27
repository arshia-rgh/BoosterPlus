package identity

import (
	"context"
	"crypto/hmac"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authidentity"
)

// UserView deliberately excludes every stored credential, digest and provider subject.
type UserView struct {
	EmailVerified bool   `json:"email_verified"`
	Deleted       bool   `json:"deleted"`
	ID            string `json:"id"`
	Email         string `json:"email"`
	DisplayName   string `json:"display_name"`
	Role          string `json:"role"`
	StaffAlias    string `json:"staff_alias"`
	Suspended     bool   `json:"suspended"`
	MFAEnabled    bool   `json:"mfa_enabled"`
	NotifyUpdates bool   `json:"notify_updates"`
}

func userView(account *ent.User) UserView {
	return UserView{EmailVerified: account.EmailVerifiedAt != nil, Deleted: account.DeletedAt != nil, ID: account.ID, Email: account.Email, DisplayName: account.DisplayName, Role: account.Role, StaffAlias: account.StaffAlias, Suspended: account.Suspended, MFAEnabled: account.MfaEnabled, NotifyUpdates: account.NotifyUpdates}
}

type requestState struct {
	principal          *Principal
	portal             Portal
	browser, token, ip string
}
type endpoint func(http.ResponseWriter, *http.Request, requestState) error

// Register installs identity routes under the existing API security/logging middleware.
func (s *Service) Register(mux *http.ServeMux) {
	routes := map[string]endpoint{
		"GET /api/v1/admin/users/{id}/sessions":         s.staffUserSessions,
		"POST /api/v1/admin/users/{id}/sessions/revoke": s.staffRevokeSessions,
		"GET /api/v1/auth/session":                      s.bootstrap,
		"POST /api/v1/auth/email/request":               s.requestEmail,
		"POST /api/v1/auth/email/verify":                s.verifyEmail,
		"POST /api/v1/auth/google/start":                s.startGoogle,
		"GET /api/v1/auth/google/callback":              s.finishGoogle,
		"POST /api/v1/auth/logout":                      s.logout,
		"POST /api/v1/auth/sessions/revoke":             s.revokeSessions,
		"POST /api/v1/auth/mfa/enroll":                  s.enrollMFA,
		"POST /api/v1/auth/mfa/verify":                  s.verifyMFA,
		"POST /api/v1/auth/mfa/disable":                 s.disableMFA,
		"POST /api/v1/auth/mfa/recovery-codes":          s.regenerateCodes,
		"GET /api/v1/me":                                s.me,
		"POST /api/v1/me/profile":                       s.profile,
		"GET /api/v1/me/sessions":                       s.sessions,
		"POST /api/v1/me/google/unlink":                 s.unlinkGoogle,
		"GET /api/v1/portal/booster":                    s.portal("booster"),
		"GET /api/v1/portal/admin":                      s.portal("admin"),
		"GET /api/v1/admin/users":                       s.users,
		"GET /api/v1/admin/users/{id}":                  s.getUser,
		"POST /api/v1/admin/users/{id}/role":            s.role,
		"POST /api/v1/admin/users/{id}/suspension":      s.suspension,
		"GET /api/v1/admin/audit":                       s.audits,
		"GET /api/v1/admin/recoveries":                  s.recoveries,
		"POST /api/v1/admin/recoveries/{id}/resolve":    s.resolveRecovery,
	}
	for pattern, handler := range routes {
		mux.HandleFunc(pattern, s.handle(handler))
		if strings.Contains(pattern, " /api/v1/auth/") {
			portalPattern := strings.Replace(pattern, "/api/v1/auth/", "/api/v1/auth/portals/{portal}/", 1)
			mux.HandleFunc(portalPattern, s.handle(handler))
		}
	}
}

func (s *Service) cookieName(portal Portal, kind string) string {
	prefix := ""
	if s.config.SecureCookies {
		prefix = "__Host-"
	}
	return prefix + "bp-" + string(portal) + "-" + kind
}
func (s *Service) cookie(w http.ResponseWriter, portal Portal, kind, value string, maxAge int) {
	// #nosec G124 -- runtime config enforces Secure outside development/test; local HTTP uses unprefixed cookies.
	http.SetCookie(w, &http.Cookie{Name: s.cookieName(portal, kind), Value: value, Path: "/", MaxAge: maxAge, HttpOnly: true, Secure: s.config.SecureCookies, SameSite: http.SameSiteLaxMode})
}
func (s *Service) csrf(portal Portal, browser, token string) string {
	return s.digest("csrf.portal", string(portal), browser, token)
}

func (s *Service) handle(next endpoint) http.HandlerFunc {
	return s.handleLimit(next, 16<<10)
}

func (s *Service) handleLimit(next endpoint, bodyLimit int64) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Vary", "Cookie, Origin, X-Playora-Portal")
		portal, portalErr := requestPortal(r)
		if portalErr != nil {
			respondError(w, portalErr)
			return
		}
		state := requestState{portal: portal}
		if cookie, cookieErr := r.Cookie(s.cookieName(state.portal, "browser")); cookieErr == nil && len(cookie.Value) >= 40 && len(cookie.Value) <= 128 {
			state.browser = cookie.Value
		} else {
			state.browser = randomToken()
			s.cookie(w, state.portal, "browser", state.browser, 30*24*3600)
		}
		if cookie, cookieErr := r.Cookie(s.cookieName(state.portal, "session")); cookieErr == nil {
			principal, authErr := s.Authenticate(r.Context(), cookie.Value, state.portal)
			switch {
			case authErr == nil:
				state.principal = principal
				state.token = cookie.Value
			case errors.Is(authErr, ErrUnauthenticated):
				s.cookie(w, state.portal, "session", "", -1)
			default:
				respondError(w, authErr)
				return
			}
		}
		state.ip = clientIP(r, s.config.ProxyKey)
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			origin := r.Header.Get("Origin")
			allowed := origin == s.config.PublicOrigin
			for _, candidate := range s.config.AllowedOrigins {
				allowed = allowed || origin == candidate
			}
			if origin == "" || !allowed || !hmac.Equal([]byte(r.Header.Get("X-Csrf-Token")), []byte(s.csrf(state.portal, state.browser, state.token))) {
				respondError(w, ErrForbidden)
				return
			}
			if r.Header.Get("Sec-Fetch-Site") == "cross-site" {
				respondError(w, ErrForbidden)
				return
			}
			r.Body = http.MaxBytesReader(w, r.Body, bodyLimit)
		}
		if err := next(w, r, state); err != nil {
			respondError(w, err)
		}
	}
}

// Forwarded client addresses are accepted only from the configured authenticated proxy.
func clientIP(r *http.Request, key string) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = "unknown"
	}
	supplied := r.Header.Get("X-Booster-Proxy-Key")
	if len(key) >= 32 && hmac.Equal([]byte(supplied), []byte(key)) {
		if ip := net.ParseIP(r.Header.Get("X-Booster-Client-Ip")); ip != nil {
			return ip.String()
		}
	}
	if ip := net.ParseIP(host); ip != nil {
		return ip.String()
	}
	return "unknown"
}

func decode(r *http.Request, value any) error {
	if contentType := r.Header.Get("Content-Type"); contentType != "application/json" && !strings.HasPrefix(contentType, "application/json;") {
		return ErrInvalid
	}
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(value); err != nil {
		return ErrInvalid
	}
	var trailing any
	if err := decoder.Decode(&trailing); !errors.Is(err, io.EOF) {
		return ErrInvalid
	}
	return nil
}
func respond(w http.ResponseWriter, status int, value any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(value)
}
func respondError(w http.ResponseWriter, err error) {
	status, code := http.StatusInternalServerError, "unavailable"
	switch {
	case errors.Is(err, ErrInvalid):
		status, code = http.StatusBadRequest, "invalid_verification"
	case errors.Is(err, ErrUnauthenticated):
		status, code = http.StatusUnauthorized, "sign_in_required"
	case errors.Is(err, ErrForbidden):
		status, code = http.StatusForbidden, "permission_denied"
	case errors.Is(err, ErrMFA):
		status, code = http.StatusForbidden, "mfa_required"
	case errors.Is(err, ErrRecent):
		status, code = http.StatusForbidden, "recent_auth_required"
	case errors.Is(err, ErrTerms):
		status, code = http.StatusBadRequest, "terms_required"
	case errors.Is(err, ErrConflict):
		status, code = http.StatusConflict, "identity_conflict"
	case errors.Is(err, ErrLimited):
		status, code = http.StatusTooManyRequests, "rate_limited"
		w.Header().Set("Retry-After", "60")
	case errors.Is(err, ErrUnavailable):
		status, code = http.StatusServiceUnavailable, "unavailable"
	case ent.IsNotFound(err):
		status, code = http.StatusNotFound, "not_found"
	}
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	// Encoding to a disconnected client cannot change the already-written status.
	if encodeErr := json.NewEncoder(w).Encode(map[string]any{"type": "about:blank", "title": http.StatusText(status), "status": status, "code": code}); encodeErr != nil {
		return
	}
}

func (s *Service) bootstrap(w http.ResponseWriter, r *http.Request, state requestState) error {
	var account *UserView
	linked, needsMFA := false, false
	capabilities := []string{}
	if state.principal != nil {
		value := userView(state.principal.User)
		account = &value
		needsMFA = state.principal.NeedsMFA()
		var findErr error
		linked, findErr = s.client.AuthIdentity.Query().Where(authidentity.UserIDEQ(value.ID), authidentity.ProviderEQ("google")).Exist(r.Context())
		if findErr != nil {
			return findErr
		}
		for _, capability := range []string{"self", "account", "booster", "admin", "owner"} {
			if Require(state.principal, capability) == nil {
				capabilities = append(capabilities, capability)
			}
		}
	}
	termsVersion, termsErr := s.TermsVersion(r.Context(), s.client)
	if termsErr != nil {
		return termsErr
	}
	return respond(w, http.StatusOK, map[string]any{"portal": state.portal, "user": account, "csrf_token": s.csrf(state.portal, state.browser, state.token), "google_enabled": s.google != nil, "google_linked": linked, "mfa_required": needsMFA, "capabilities": capabilities, "terms_version": termsVersion, "terms_url": s.config.TermsURL})
}
func (s *Service) requestEmail(w http.ResponseWriter, r *http.Request, state requestState) error {
	var input struct {
		Email        string `json:"email"`
		AccountEmail string `json:"account_email"`
		TermsVersion string `json:"terms_version"`
		Purpose      string `json:"purpose"`
		AcceptTerms  bool   `json:"accept_terms"`
	}
	if err := decode(r, &input); err != nil {
		return err
	}
	if input.Purpose == "reauth" && state.principal != nil {
		input.Email = state.principal.User.Email
	}
	id, err := s.RequestEmail(r.Context(), EmailRequest{Portal: state.portal, Email: input.Email, AccountEmail: input.AccountEmail, Purpose: input.Purpose, Browser: state.browser, IP: state.ip, AcceptTerms: input.AcceptTerms, TermsVersion: input.TermsVersion, Principal: state.principal})
	if err != nil {
		return err
	}
	return respond(w, http.StatusAccepted, map[string]string{"challenge_id": id, "message": "If this request is eligible, a verification code will arrive shortly."})
}
func (s *Service) verifyEmail(w http.ResponseWriter, r *http.Request, state requestState) error {
	var input struct {
		ChallengeID string `json:"challenge_id"`
		Code        string `json:"code"`
	}
	if err := decode(r, &input); err != nil {
		return err
	}
	result, err := s.VerifyEmail(r.Context(), input.ChallengeID, input.Code, state.browser, state.ip, state.principal, state.portal)
	if err != nil {
		return err
	}
	if result.Token != "" {
		s.cookie(w, state.portal, "session", result.Token, 7*24*3600)
	} else if result.Purpose == "email_change" {
		s.cookie(w, state.portal, "session", "", -1)
	}
	return respond(w, http.StatusOK, map[string]string{"purpose": result.Purpose})
}
func (s *Service) startGoogle(w http.ResponseWriter, r *http.Request, state requestState) error {
	var input struct {
		Purpose      string `json:"purpose"`
		TermsVersion string `json:"terms_version"`
		AcceptTerms  bool   `json:"accept_terms"`
	}
	if err := decode(r, &input); err != nil {
		return err
	}
	url, err := s.StartGoogle(r.Context(), state.principal, state.browser, state.ip, input.Purpose, input.AcceptTerms, state.portal, input.TermsVersion)
	if err != nil {
		return err
	}
	return respond(w, http.StatusOK, map[string]string{"url": url})
}
func (s *Service) finishGoogle(w http.ResponseWriter, r *http.Request, state requestState) error {
	token, err := s.FinishGoogle(r.Context(), state.principal, state.browser, r.URL.Query().Get("state"), r.URL.Query().Get("code"), state.portal)
	if err != nil {
		reason := "verification"
		if errors.Is(err, ErrConflict) {
			reason = "link_conflict"
		}
		if errors.Is(err, ErrTerms) {
			reason = "terms"
		}
		http.Redirect(w, r, s.config.PublicOrigin+state.portal.login()+"?error="+reason, http.StatusSeeOther)
		return nil
	}
	s.cookie(w, state.portal, "session", token, 7*24*3600)
	http.Redirect(w, r, s.config.PublicOrigin+state.portal.home(), http.StatusSeeOther)
	return nil
}
func (s *Service) logout(w http.ResponseWriter, r *http.Request, state requestState) error {
	if state.principal != nil {
		if err := s.Revoke(r.Context(), state.principal, state.principal.Session.ID, false); err != nil {
			return err
		}
	}
	s.cookie(w, state.portal, "session", "", -1)
	w.WriteHeader(http.StatusNoContent)
	return nil
}
func (s *Service) revokeSessions(w http.ResponseWriter, r *http.Request, state requestState) error {
	var input struct {
		ID  string `json:"id"`
		All bool   `json:"all"`
	}
	if err := decode(r, &input); err != nil {
		return err
	}
	if !input.All && (input.ID == "" || len(input.ID) > 64) {
		return ErrInvalid
	}
	if err := s.Revoke(r.Context(), state.principal, input.ID, input.All); err != nil {
		return err
	}
	if input.All || state.principal.Session.ID == input.ID {
		s.cookie(w, state.portal, "session", "", -1)
	}
	w.WriteHeader(http.StatusNoContent)
	return nil
}
func (s *Service) me(w http.ResponseWriter, _ *http.Request, state requestState) error {
	if err := Require(state.principal, "self"); err != nil {
		return err
	}
	return respond(w, http.StatusOK, userView(state.principal.User))
}
func (s *Service) profile(w http.ResponseWriter, r *http.Request, state requestState) error {
	var input struct {
		DisplayName   string `json:"display_name"`
		StaffAlias    string `json:"staff_alias"`
		NotifyUpdates *bool  `json:"notify_updates"`
	}
	if err := decode(r, &input); err != nil {
		return err
	}
	if input.NotifyUpdates == nil {
		return ErrInvalid
	}
	if err := s.UpdateProfile(r.Context(), state.principal, input.DisplayName, input.StaffAlias, *input.NotifyUpdates); err != nil {
		return err
	}
	w.WriteHeader(http.StatusNoContent)
	return nil
}
func (s *Service) sessions(w http.ResponseWriter, r *http.Request, state requestState) error {
	entries, err := s.Sessions(r.Context(), state.principal)
	if err != nil {
		return err
	}
	output := make([]map[string]any, 0, len(entries))
	for _, entry := range entries {
		output = append(output, map[string]any{"id": entry.ID, "portal": entry.Portal, "created_at": entry.CreatedAt, "last_seen_at": entry.LastSeenAt, "expires_at": entry.ExpiresAt, "current": entry.ID == state.principal.Session.ID})
	}
	return respond(w, http.StatusOK, map[string]any{"sessions": output})
}
func (s *Service) portal(capability string) endpoint {
	return func(w http.ResponseWriter, _ *http.Request, state requestState) error {
		if err := Require(state.principal, capability); err != nil {
			return err
		}
		return respond(w, http.StatusOK, map[string]string{"status": "ready"})
	}
}
func (s *Service) enrollMFA(w http.ResponseWriter, r *http.Request, state requestState) error {
	enrollment, err := s.EnrollMFA(r.Context(), state.principal)
	if err != nil {
		return err
	}
	return respond(w, http.StatusOK, enrollment)
}
func (s *Service) verifyMFA(w http.ResponseWriter, r *http.Request, state requestState) error {
	var input struct {
		Code string `json:"code"`
	}
	if err := decode(r, &input); err != nil {
		return err
	}
	result, err := s.VerifyMFA(r.Context(), state.principal, input.Code, state.ip)
	if err != nil {
		return err
	}
	s.cookie(w, state.portal, "session", result.Token, 7*24*3600)
	codes := result.RecoveryCodes
	if codes == nil {
		codes = []string{}
	}
	return respond(w, http.StatusOK, map[string]any{"recovery_codes": codes})
}
func (s *Service) disableMFA(w http.ResponseWriter, r *http.Request, state requestState) error {
	if err := s.DisableMFA(r.Context(), state.principal); err != nil {
		return err
	}
	s.cookie(w, state.portal, "session", "", -1)
	w.WriteHeader(http.StatusNoContent)
	return nil
}
func (s *Service) regenerateCodes(w http.ResponseWriter, r *http.Request, state requestState) error {
	result, err := s.RegenerateRecoveryCodes(r.Context(), state.principal)
	if err != nil {
		return err
	}
	s.cookie(w, state.portal, "session", result.Token, 7*24*3600)
	return respond(w, http.StatusOK, map[string]any{"recovery_codes": result.RecoveryCodes})
}
func (s *Service) unlinkGoogle(w http.ResponseWriter, r *http.Request, state requestState) error {
	if err := s.UnlinkGoogle(r.Context(), state.principal); err != nil {
		return err
	}
	s.cookie(w, state.portal, "session", "", -1)
	w.WriteHeader(http.StatusNoContent)
	return nil
}
func (s *Service) users(w http.ResponseWriter, r *http.Request, state requestState) error {
	page, err := s.Directory(r.Context(), state.principal, UserQuery{Role: r.URL.Query().Get("role"), Search: r.URL.Query().Get("search"), State: r.URL.Query().Get("state"), After: r.URL.Query().Get("after")})
	if err != nil {
		return err
	}
	return respond(w, http.StatusOK, page)
}
func (s *Service) getUser(w http.ResponseWriter, r *http.Request, state requestState) error {
	account, err := s.User(r.Context(), state.principal, r.PathValue("id"))
	if err != nil {
		return err
	}
	return respond(w, http.StatusOK, userView(account))
}
func (s *Service) role(w http.ResponseWriter, r *http.Request, state requestState) error {
	var input struct {
		Role string `json:"role"`
	}
	if err := decode(r, &input); err != nil {
		return err
	}
	if err := s.GrantRole(r.Context(), state.principal, r.PathValue("id"), input.Role); err != nil {
		return err
	}
	w.WriteHeader(http.StatusNoContent)
	return nil
}
func (s *Service) suspension(w http.ResponseWriter, r *http.Request, state requestState) error {
	var input struct {
		Suspended *bool `json:"suspended"`
	}
	if err := decode(r, &input); err != nil {
		return err
	}
	if input.Suspended == nil {
		return ErrInvalid
	}
	if err := s.Suspend(r.Context(), state.principal, r.PathValue("id"), *input.Suspended); err != nil {
		return err
	}
	w.WriteHeader(http.StatusNoContent)
	return nil
}
func (s *Service) audits(w http.ResponseWriter, r *http.Request, state requestState) error {
	page, err := s.ListAudits(r.Context(), state.principal, AuditQuery{Actor: r.URL.Query().Get("actor"), Action: r.URL.Query().Get("action"), Target: r.URL.Query().Get("target"), From: r.URL.Query().Get("from"), To: r.URL.Query().Get("to"), After: r.URL.Query().Get("after")})
	if err != nil {
		return err
	}
	type auditView struct {
		ID             string            `json:"id"`
		ActorID        string            `json:"actor_id"`
		ActorReference string            `json:"actor_reference"`
		Action         string            `json:"action"`
		TargetID       string            `json:"target_id"`
		Metadata       map[string]string `json:"metadata"`
		CreatedAt      time.Time         `json:"created_at"`
	}
	output := make([]auditView, 0, len(page.Entries))
	for _, entry := range page.Entries {
		output = append(output, auditView{ID: entry.ID, ActorID: entry.ActorID, ActorReference: entry.ActorReference, Action: entry.Action, TargetID: entry.TargetID, Metadata: entry.Metadata, CreatedAt: entry.CreatedAt})
	}
	return respond(w, http.StatusOK, map[string]any{"audits": output, "next": page.Next})
}
func (s *Service) recoveries(w http.ResponseWriter, r *http.Request, state requestState) error {
	entries, err := s.Recoveries(r.Context(), state.principal)
	if err != nil {
		return err
	}
	type recoveryView struct {
		ID            string    `json:"id"`
		UserID        string    `json:"user_id"`
		NewEmail      string    `json:"new_email"`
		State         string    `json:"state"`
		CaseReference string    `json:"case_reference"`
		CreatedAt     time.Time `json:"created_at"`
		ExpiresAt     time.Time `json:"expires_at"`
	}
	output := make([]recoveryView, 0, len(entries))
	for _, entry := range entries {
		output = append(output, recoveryView{ID: entry.ID, UserID: entry.UserID, NewEmail: entry.NewEmail, State: entry.State, CaseReference: entry.CaseReference, CreatedAt: entry.CreatedAt, ExpiresAt: entry.ExpiresAt})
	}
	return respond(w, http.StatusOK, map[string]any{"recoveries": output})
}
func (s *Service) resolveRecovery(w http.ResponseWriter, r *http.Request, state requestState) error {
	var input struct {
		Approve       *bool  `json:"approve"`
		CaseReference string `json:"case_reference"`
	}
	if err := decode(r, &input); err != nil {
		return err
	}
	if input.Approve == nil {
		return ErrInvalid
	}
	if err := s.ResolveRecovery(r.Context(), state.principal, r.PathValue("id"), input.CaseReference, *input.Approve); err != nil {
		return err
	}
	w.WriteHeader(http.StatusNoContent)
	return nil
}

// RunCleanup executes bounded cleanup periodically while the worker process is alive.
func (s *Service) RunCleanup(ctx context.Context, logger *slog.Logger) {
	ticker := time.NewTicker(30 * time.Minute)
	defer ticker.Stop()
	for {
		check, cancel := context.WithTimeout(ctx, 30*time.Second)
		if err := s.Cleanup(check); err != nil {
			logger.ErrorContext(ctx, "identity retention cleanup failed")
		}
		cancel()
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (s *Service) staffRevokeSessions(w http.ResponseWriter, r *http.Request, state requestState) error {
	if e := s.RevokeUserSessions(r.Context(), state.principal, r.PathValue("id")); e != nil {
		return e
	}
	w.WriteHeader(http.StatusNoContent)
	return nil
}

func (s *Service) staffUserSessions(w http.ResponseWriter, r *http.Request, state requestState) error {
	entries, e := s.UserSessions(r.Context(), state.principal, r.PathValue("id"))
	if e != nil {
		return e
	}
	return respond(w, http.StatusOK, map[string]any{"sessions": entries})
}
