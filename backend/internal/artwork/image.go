// Package artwork owns scanned, responsive editorial images, not private evidence.
package artwork

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"image"
	"image/draw"
	"image/jpeg"
	"image/png"
	"math"

	xdraw "golang.org/x/image/draw"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
)

// Variant describes one immutable server-generated rendition.
type Variant struct {
	Width       int    `json:"width"`
	Height      int    `json:"height"`
	Size        int    `json:"size"`
	Checksum    string `json:"checksum"`
	ContentType string `json:"content_type"`
}

type rendition struct {
	Variant
	Data []byte
}
type shape struct {
	name          string
	width, height int
	crop          bool
}

func shapes(purpose string) []shape {
	switch purpose {
	case "game":
		return []shape{{"wide", 1600, 800, true}, {"wide-small", 800, 400, true}, {"mobile", 768, 576, true}, {"mobile-small", 384, 288, true}, {"card", 640, 400, true}, {"thumb", 320, 200, true}}
	case "cover":
		return []shape{{"wide", 1600, 900, true}, {"wide-small", 800, 450, true}, {"card", 640, 400, true}, {"thumb", 320, 200, true}}
	case "product", "inline", "account":
		return []shape{{"wide", 1600, 1600, false}, {"wide-small", 800, 800, false}, {"card", 640, 640, false}, {"thumb", 320, 320, false}}
	default:
		return nil
	}
}

func cropBounds(bounds image.Rectangle, target shape, x, y int) image.Rectangle {
	if !target.crop {
		return bounds
	}
	width, height := bounds.Dx(), bounds.Dy()
	if width*target.height > height*target.width {
		width = height * target.width / target.height
	} else {
		height = width * target.height / target.width
	}
	width, height = max(width, 1), max(height, 1)
	left := bounds.Min.X + (bounds.Dx()-width)*x/100
	top := bounds.Min.Y + (bounds.Dy()-height)*y/100
	return image.Rect(left, top, left+max(width, 1), top+max(height, 1))
}

// render never enlarges pixels and uses only a finite rendition list.
func render(data []byte, kind, purpose string, x, y int) (map[string]rendition, int, int, error) {
	clean, err := media.Sanitize(data, kind)
	if err != nil {
		return nil, 0, 0, err
	}
	decoded, _, err := image.Decode(bytes.NewReader(clean))
	if err != nil {
		return nil, 0, 0, media.ErrInvalid
	}
	decoded = orient(decoded, jpegOrientation(data))
	width, height := decoded.Bounds().Dx(), decoded.Bounds().Dy()
	out := map[string]rendition{}
	for _, target := range shapes(purpose) {
		bounds := cropBounds(decoded.Bounds(), target, x, y)
		scale := math.Min(1, math.Min(float64(target.width)/float64(bounds.Dx()), float64(target.height)/float64(bounds.Dy())))
		dst := image.NewNRGBA(image.Rect(0, 0, max(1, int(math.Round(float64(bounds.Dx())*scale))), max(1, int(math.Round(float64(bounds.Dy())*scale)))))
		xdraw.CatmullRom.Scale(dst, dst.Bounds(), decoded, bounds, draw.Src, nil)
		var output bytes.Buffer
		mime := "image/jpeg"
		if dst.Opaque() {
			err = jpeg.Encode(&output, dst, &jpeg.Options{Quality: 84})
		} else {
			mime = "image/png"
			err = png.Encode(&output, dst)
		}
		if err != nil || output.Len() > media.MaxBytes {
			return nil, 0, 0, media.ErrInvalid
		}
		digest := sha256.Sum256(output.Bytes())
		out[target.name] = rendition{Variant: Variant{dst.Bounds().Dx(), dst.Bounds().Dy(), output.Len(), hex.EncodeToString(digest[:]), mime}, Data: output.Bytes()}
	}
	return out, width, height, nil
}
