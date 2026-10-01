package privacyjournal

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
)

func TestStorageConditionalWritesBoundedReadsAndPagination(t *testing.T) {
	t.Parallel()
	key := uuid.NewString()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut {
			if r.Header.Get("If-None-Match") != "*" {
				t.Error("evidence can be overwritten")
			}
			w.WriteHeader(http.StatusPreconditionFailed)
			return
		}
		if r.URL.Query().Get("list-type") == "2" {
			w.Header().Set("Content-Type", "application/xml")
			_, err := fmt.Fprint(w, `<ListBucketResult><IsTruncated>true</IsTruncated><NextContinuationToken>repeated</NextContinuationToken></ListBucketResult>`)
			if err != nil {
				t.Error(err)
			}
			return
		}
		_, err := fmt.Fprint(w, strings.Repeat("x", 4097))
		if err != nil {
			t.Error(err)
		}
	}))
	defer server.Close()
	storage := NewS3(server.URL, "us-east-1", "journal", "fixture", "fixture-private-key")
	if err := storage.Create(t.Context(), key, []byte("encrypted")); err == nil {
		t.Fatal("overwrite accepted")
	}
	if _, err := storage.Read(t.Context(), key); err == nil {
		t.Fatal("oversized evidence accepted")
	}
	if _, err := storage.Keys(t.Context()); err == nil {
		t.Fatal("nonprogressing listing accepted")
	}
	if _, err := storage.Read(t.Context(), "../other"); err == nil {
		t.Fatal("foreign namespace accepted")
	}
}
