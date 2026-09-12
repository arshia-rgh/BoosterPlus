package cli

import (
	"context"
	"errors"
	"strings"
	"testing"
)

type probeObjects struct {
	value                                    []byte
	failWrite, corrupt, failCleanup, deleted bool
}

func (p *probeObjects) Put(_ context.Context, key string, data []byte, _ string) error {
	if !strings.HasPrefix(key, "checks/") {
		return errors.New("unexpected namespace")
	}
	p.value = append([]byte(nil), data...)
	if p.failWrite {
		return errors.New("ambiguous write")
	}
	return nil
}
func (p *probeObjects) Get(context.Context, string) ([]byte, error) {
	if p.corrupt {
		return []byte("altered"), nil
	}
	return p.value, nil
}
func (p *probeObjects) Delete(ctx context.Context, _ string) error {
	p.deleted = ctx.Err() == nil
	if p.failCleanup {
		return errors.New("cleanup failed")
	}
	return nil
}

type probeScanner struct{ fail bool }

func (s probeScanner) Scan(context.Context, []byte) error {
	if s.fail {
		return errors.New("scanner unavailable")
	}
	return nil
}
func TestDependencyProbe(t *testing.T) {
	for _, scenario := range []struct {
		name                            string
		objects                         probeObjects
		scanFail, wantError, wantDelete bool
	}{
		{"clean", probeObjects{}, false, false, true},
		{"write uncertainty", probeObjects{failWrite: true}, false, true, true},
		{"integrity", probeObjects{corrupt: true}, false, true, true},
		{"cleanup", probeObjects{failCleanup: true}, false, true, true},
		{"scanner outage", probeObjects{}, true, true, false},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			err := dependencyProbe(t.Context(), &scenario.objects, probeScanner{scenario.scanFail})
			if (err != nil) != scenario.wantError || scenario.objects.deleted != scenario.wantDelete {
				t.Fatal("dependency probe did not fail/clean up as required", err)
			}
		})
	}
}
