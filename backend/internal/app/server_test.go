package app_test

import (
	"context"
	"io"
	"net"
	"net/http"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/app"
)

func TestServerServesAndShutsDown(t *testing.T) {
	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	listener, err := (&net.ListenConfig{}).Listen(ctx, "tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	done := make(chan error, 1)
	go func() {
		done <- app.Serve(ctx, listener, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) }))
	}()
	request, requestErr := http.NewRequestWithContext(ctx, http.MethodGet, "http://"+listener.Addr().String(), nil)
	if requestErr != nil {
		t.Fatal(requestErr)
	}
	response, responseErr := (&http.Client{Timeout: time.Second}).Do(request)
	if responseErr != nil {
		t.Fatal(responseErr)
	}
	if _, copyErr := io.Copy(io.Discard, response.Body); copyErr != nil {
		t.Error(copyErr)
	}
	if closeErr := response.Body.Close(); closeErr != nil {
		t.Error(closeErr)
	}
	if response.StatusCode != http.StatusNoContent {
		t.Error(response.StatusCode)
	}
	cancel()
	select {
	case serveErr := <-done:
		if serveErr != nil {
			t.Fatal(serveErr)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("shutdown blocked")
	}
}
