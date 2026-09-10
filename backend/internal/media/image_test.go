package media_test

import (
	"bytes"
	"encoding/binary"
	"hash/crc32"
	"image"
	"image/jpeg"
	"image/png"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
)

func TestImageSanitizationAndBounds(t *testing.T) {
	for _, kind := range []string{"png", "jpeg"} {
		var original bytes.Buffer
		frame := image.NewRGBA(image.Rect(0, 0, 8, 8))
		var err error
		if kind == "png" {
			err = png.Encode(&original, frame)
		} else {
			err = jpeg.Encode(&original, frame, nil)
		}
		if err != nil {
			t.Fatal(err)
		}
		original.WriteString("private trailing metadata")
		clean, err := media.Sanitize(original.Bytes(), "image/"+kind)
		if err != nil || bytes.Contains(clean, []byte("private trailing")) {
			t.Fatal("metadata was retained", err)
		}
		cfg, _, err := image.DecodeConfig(bytes.NewReader(clean))
		if err != nil || cfg.Width != 8 || cfg.Height != 8 {
			t.Fatal("pixel dimensions changed", err)
		}
		if _, err = media.Sanitize(original.Bytes(), "image/gif"); err == nil {
			t.Fatal("wrong MIME accepted")
		}
	}
	for _, data := range [][]byte{nil, []byte(`<svg onload="alert(1)"></svg>`), bytes.Repeat([]byte{1}, media.MaxBytes+1)} {
		if _, err := media.Sanitize(data, "image/png"); err == nil {
			t.Fatal("invalid image accepted")
		}
	}
	var encoded bytes.Buffer
	if err := png.Encode(&encoded, image.NewRGBA(image.Rect(0, 0, 1, 1))); err != nil {
		t.Fatal(err)
	}
	bomb := encoded.Bytes()
	binary.BigEndian.PutUint32(bomb[16:20], 4096)
	binary.BigEndian.PutUint32(bomb[20:24], 4096)
	binary.BigEndian.PutUint32(bomb[29:33], crc32.ChecksumIEEE(bomb[12:29]))
	if _, err := media.Sanitize(bomb, "image/png"); err == nil {
		t.Fatal("oversized pixel allocation accepted")
	}
}
