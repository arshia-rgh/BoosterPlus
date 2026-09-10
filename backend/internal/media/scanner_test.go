package media_test

import (
	"bufio"
	"encoding/binary"
	"errors"
	"io"
	"net"
	"strings"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
)

func TestScannerFailsClosed(t *testing.T) {
	for _, scenario := range []struct {
		name, reply     string
		age             time.Duration
		infected, clean bool
	}{
		{name: "clean", reply: "stream: OK\x00", clean: true},
		{name: "infected", reply: "stream: Test-Signature FOUND\x00", infected: true},
		{name: "limits", reply: "INSTREAM size limit exceeded. ERROR\x00"},
		{name: "truncated", reply: "stream: OK"},
		{name: "false positive substring", reply: "error: stream: OK\x00"},
		{name: "stale", age: 96 * time.Hour, reply: "stream: OK\x00"},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			listener, err := (&net.ListenConfig{}).Listen(t.Context(), "tcp", "127.0.0.1:0")
			if err != nil {
				t.Fatal(err)
			}
			defer func() {
				if e := listener.Close(); e != nil {
					t.Error(e)
				}
			}()
			done := make(chan struct{})
			go func() {
				defer close(done)
				rounds := 2
				if scenario.age > 72*time.Hour {
					rounds = 1
				}
				for round := range rounds {
					conn, e := listener.Accept()
					if e != nil {
						return
					}
					if e = conn.SetDeadline(time.Now().Add(3 * time.Second)); e != nil {
						t.Error(e)
					}
					reader := bufio.NewReader(conn)
					command, e := reader.ReadString(0)
					if e != nil {
						t.Error(e)
					}
					if round == 0 {
						if command != "zVERSION\x00" {
							t.Error("incorrect version command")
						}
						_, e = io.WriteString(conn, "ClamAV 1.5.3/28118/"+time.Now().UTC().Add(-scenario.age).Format("Mon Jan _2 15:04:05 2006")+"\x00")
					} else {
						if command != "zINSTREAM\x00" {
							t.Error("incorrect stream command")
						}
						var received strings.Builder
						for {
							var length uint32
							if e = binary.Read(reader, binary.BigEndian, &length); e != nil {
								break
							}
							if length == 0 {
								break
							}
							if length > media.MaxBytes {
								t.Error("unbounded chunk")
								break
							}
							if _, e = io.CopyN(&received, reader, int64(length)); e != nil {
								break
							}
						}
						if received.String() != "synthetic bytes" {
							t.Error("scanner did not receive complete bytes")
						}
						if e == nil {
							_, e = io.WriteString(conn, scenario.reply)
						}
					}
					if e != nil {
						t.Error(e)
					}
					if e = conn.Close(); e != nil {
						t.Error(e)
					}
				}
			}()
			scanner := media.Clamd{Network: "tcp", Address: listener.Addr().String()}
			err = scanner.Scan(t.Context(), []byte("synthetic bytes"))
			if (err == nil) != scenario.clean || errors.Is(err, media.ErrInfected) != scenario.infected {
				t.Fatal("unexpected scan classification", err)
			}
			<-done
		})
	}
}
