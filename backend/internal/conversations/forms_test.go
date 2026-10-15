package conversations

import (
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

func validForm() FormCreate {
	return FormCreate{RequestKey: uuid.NewString(), Mode: "request", Purpose: "information", Recipient: "customer", Title: "Details requested", Fields: []FormField{{Key: "notes", Label: "Notes", Kind: "multiline", Required: true, Secure: true}}, ExpiresAt: time.Now().Add(time.Hour)}
}
func TestFormValidationBoundsAndAnswerIsolation(t *testing.T) {
	in := validForm()
	if secure, err := validateForm(in, time.Now()); err != nil || !secure {
		t.Fatal(err)
	}
	ordinary, secrets, err := splitAnswers(append(in.Fields, FormField{Key: "region", Label: "Region", Kind: "select", Options: []string{"A", "B"}}), map[string]string{"notes": "line one\nline two", "region": "A"})
	if err != nil || ordinary["notes"] != "" || secrets["notes"] != "line one\nline two" || ordinary["region"] != "A" {
		t.Fatal("answer partition or multiline changed", err)
	}
	cases := []map[string]string{{}, {"notes": ""}, {"notes": "x", "unknown": "private"}, {"notes": strings.Repeat("x", 2001)}}
	for _, answers := range cases {
		if _, _, err = splitAnswers(in.Fields, answers); err == nil {
			t.Fatal("invalid response accepted")
		}
	}
	for _, change := range []func(*FormCreate){func(v *FormCreate) { v.Fields = append(v.Fields, v.Fields[0]) }, func(v *FormCreate) { v.Fields[0].Key = "invalid.key" }, func(v *FormCreate) { v.Fields[0].Kind = "html" }, func(v *FormCreate) { v.ExpiresAt = time.Now().Add(31 * 24 * time.Hour) }, func(v *FormCreate) { v.Answers = map[string]string{"notes": "unexpected"} }, func(v *FormCreate) { v.Purpose = "buyer_access"; v.Fields[0].Secure = false }} {
		v := validForm()
		change(&v)
		if _, err = validateForm(v, time.Now()); err == nil {
			t.Fatal("invalid definition accepted")
		}
	}
}
