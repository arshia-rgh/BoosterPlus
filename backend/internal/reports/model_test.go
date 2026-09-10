package reports

import (
	"testing"
)

func TestReportBounds(t *testing.T) {
	base := Query{Kind: "orders", From: "2026-01-01T00:00:00Z", To: "2026-02-01T00:00:00Z"}
	if _, e := validate(base); e != nil {
		t.Fatal(e)
	}
	for _, change := range []func(*Query){func(q *Query) { q.From = q.To }, func(q *Query) { q.From = "bad" }, func(q *Query) { q.From = "0000-01-01T00:00:00Z" }, func(q *Query) { q.To = "0999-01-01T00:00:00Z" }, func(q *Query) { q.From = "2026-01-01T00:00:00+03:30" }, func(q *Query) { q.Kind = "payments" }, func(q *Query) { q.Search = "text\x00injected" }, func(q *Query) { q.State = "x\x00y" }} {
		q := base
		change(&q)
		if _, e := validate(q); e == nil {
			t.Fatal("invalid query accepted")
		}
	}
}
