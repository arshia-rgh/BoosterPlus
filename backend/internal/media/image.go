package media

import (
	"bytes"
	"image"
	"image/jpeg"
	"image/png"

	_ "golang.org/x/image/webp" // Register the WebP decoder for bounded image decoding.
)

// MaxBytes bounds both the quarantined file and the sanitized output.
const MaxBytes = 4 << 20

// Sanitize decodes and re-encodes only JPEG/PNG/WebP pixels, removing metadata and
// trailing content. Dimension checks run before pixel allocation.
func Sanitize(data []byte, contentType string) ([]byte, error) {
	if len(data) == 0 || len(data) > MaxBytes {
		return nil, ErrInvalid
	}
	cfg, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil || cfg.Width < 1 || cfg.Height < 1 || cfg.Width > 4096 || cfg.Height > 4096 || int64(cfg.Width)*int64(cfg.Height) > 4_000_000 {
		return nil, ErrInvalid
	}
	if format != "jpeg" && format != "png" && format != "webp" || contentType != "image/"+format {
		return nil, ErrInvalid
	}
	decoded, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, ErrInvalid
	}
	var output bytes.Buffer
	if format == "jpeg" {
		err = jpeg.Encode(&output, decoded, &jpeg.Options{Quality: 90})
	} else {
		err = png.Encode(&output, decoded)
	}
	if err != nil || output.Len() > MaxBytes {
		return nil, ErrInvalid
	}
	return output.Bytes(), nil
}

// CleanType gives WebP a supported deterministic PNG output encoding.
func CleanType(kind string) string {
	if kind == "image/webp" {
		return "image/png"
	}
	return kind
}
