package sitecontent

import "testing"

func TestRetentionRequiresEveryExplicitPeriod(t *testing.T) {
	data := map[string]any{"enabled": true, "financial_days": 0, "dispute_days": 1, "audit_days": 2, "support_days": 3, "grace_days": 4, "policy_text": "Owner-reviewed synthetic retention policy with preserved financial evidence.", "backup_policy": "Owner-defined backup retention, restore and erasure policy.", "preserve_evidence": true}
	if e := validate("retention", data); e != nil {
		t.Fatal(e)
	}
	for _, key := range []string{"financial_days", "dispute_days", "audit_days", "support_days", "grace_days"} {
		old := data[key]
		delete(data, key)
		if e := validate("retention", data); e == nil {
			t.Fatal("missing explicit period", key)
		}
		data[key] = old
	}
	data["financial_days"] = -1
	if e := validate("retention", data); e == nil {
		t.Fatal("negative retention")
	}
	data["financial_days"] = 0
	data["preserve_evidence"] = false
	if e := validate("retention", data); e == nil {
		t.Fatal("destructive evidence policy")
	}
}
func TestPublicDestinationsExcludeExecutableAndRemotePaths(t *testing.T) {
	for _, v := range []string{"javascript:alert(1)", "//external.test", "/games/../../admin", "/api/v1/private", "https://example.test", "/accounts?email=private"} {
		if destinationPattern.MatchString(v) {
			t.Fatal("unsafe destination", v)
		}
	}
	for _, v := range []string{"/games", "/accounts", "/games/mobile-legends/packages/rank"} {
		if !destinationPattern.MatchString(v) {
			t.Fatal("public route rejected", v)
		}
	}
	if e := validate("legal", map[string]any{"text": "Operator legal text with enough detail to review.", "script": "bad"}); e == nil {
		t.Fatal("unknown publication field")
	}
}

func TestNotificationCopyRejectsHeaderInjectionAndUnknownFields(t *testing.T) {
	data := map[string]any{"activity_subject": "Activity", "activity_intro": "Read your update", "availability_subject": "Available offer", "availability_intro": "Review the current offer", "footer": "Approved contact hours"}
	if e := validate("notifications", data); e != nil {
		t.Fatal(e)
	}
	data["activity_subject"] = "Activity\r\nBcc: other@example.test"
	if e := validate("notifications", data); e == nil {
		t.Fatal("header injection accepted")
	}
	data["activity_subject"] = "Activity"
	data["recipient"] = "other@example.test"
	if e := validate("notifications", data); e == nil {
		t.Fatal("copy changed routing")
	}
}
