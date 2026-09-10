package media

import (
	"bufio"
	"context"
	"encoding/binary"
	"errors"
	"io"
	"net"
	"strings"
	"time"
)

// Scanner is fail-closed: nil means the complete bytes were scanned and clean.
type Scanner interface {
	Scan(context.Context, []byte) error
}

// ErrInfected identifies a positive malware finding without exposing engine output.
var ErrInfected = errors.New("media rejected by scanner")

// Clamd uses a private operator-selected socket. Never expose clamd to customers.
type Clamd struct{ Network, Address string }

func (c Clamd) connect(ctx context.Context) (net.Conn, error) {
	conn, err := (&net.Dialer{Timeout: 3 * time.Second}).DialContext(ctx, c.Network, c.Address)
	if err != nil {
		return nil, errors.New("scanner unavailable")
	}
	deadline := time.Now().Add(15 * time.Second)
	if end, ok := ctx.Deadline(); ok && end.Before(deadline) {
		deadline = end
	}
	if err = conn.SetDeadline(deadline); err != nil {
		return nil, errors.Join(err, conn.Close())
	}
	return conn, nil
}
func response(conn net.Conn) (string, error) {
	raw, err := bufio.NewReader(io.LimitReader(conn, 512)).ReadString(0)
	if err != nil {
		return "", errors.New("scanner response unavailable")
	}
	return strings.TrimSuffix(raw, "\x00"), nil
}

// Scan validates signature freshness before streaming bounded bytes. The clamd
// daemon runs in UTC; definitions older than 72 hours require operator attention.
func (c Clamd) Scan(ctx context.Context, data []byte) (result error) {
	if len(data) == 0 || len(data) > MaxBytes {
		return ErrInvalid
	}
	version, err := c.version(ctx)
	if err != nil {
		return err
	}
	parts := strings.Split(version, "/")
	if len(parts) != 3 || !strings.HasPrefix(parts[0], "ClamAV ") {
		return errors.New("scanner version unavailable")
	}
	updated, err := time.Parse("Mon Jan _2 15:04:05 2006", parts[2])
	age := time.Since(updated)
	if err != nil || age < -time.Hour || age > 72*time.Hour {
		return errors.New("scanner definitions stale")
	}
	conn, err := c.connect(ctx)
	if err != nil {
		return err
	}
	defer func() { result = errors.Join(result, conn.Close()) }()
	if _, err = io.WriteString(conn, "zINSTREAM\x00"); err != nil {
		return errors.New("scanner stream unavailable")
	}
	for len(data) > 0 {
		size := min(len(data), 32<<10)
		var header [4]byte
		binary.BigEndian.PutUint32(header[:], uint32(size))
		if _, err = conn.Write(header[:]); err != nil {
			return errors.New("scanner stream unavailable")
		}
		if _, err = conn.Write(data[:size]); err != nil {
			return errors.New("scanner stream unavailable")
		}
		data = data[size:]
	}
	if _, err = conn.Write([]byte{0, 0, 0, 0}); err != nil {
		return errors.New("scanner stream unavailable")
	}
	value, err := response(conn)
	if err != nil {
		return err
	}
	if value == "stream: OK" {
		return nil
	}
	if strings.HasPrefix(value, "stream: ") && strings.HasSuffix(value, " FOUND") {
		return ErrInfected
	}
	return errors.New("scanner did not confirm clean content")
}
func (c Clamd) version(ctx context.Context) (value string, result error) {
	conn, err := c.connect(ctx)
	if err != nil {
		return "", err
	}
	defer func() { result = errors.Join(result, conn.Close()) }()
	if _, err = io.WriteString(conn, "zVERSION\x00"); err != nil {
		return "", errors.New("scanner unavailable")
	}
	return response(conn)
}
