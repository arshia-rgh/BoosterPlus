package artwork

import (
	"bytes"
	"encoding/binary"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"testing"
)

func pixels(t *testing.T, w, h int, transparent bool) []byte {
	t.Helper()
	frame := image.NewNRGBA(image.Rect(0, 0, w, h))
	alpha := uint8(255)
	if transparent {
		alpha = 100
	}
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			c := color.NRGBA{R: 220, A: alpha}
			if x > w/2 {
				c = color.NRGBA{B: 220, A: alpha}
			}
			frame.SetNRGBA(x, y, c)
		}
	}
	var b bytes.Buffer
	if err := png.Encode(&b, frame); err != nil {
		t.Fatal(err)
	}
	return append(b.Bytes(), []byte("private metadata")...)
}
func TestResponsiveRenditionsAndNoUpscaling(t *testing.T) {
	for _, purpose := range []string{"game", "cover", "product", "inline"} {
		all, w, h, err := render(pixels(t, 1800, 1000, false), "image/png", purpose, 50, 50)
		if err != nil || w != 1800 || h != 1000 {
			t.Fatal(purpose, err)
		}
		for name, v := range all {
			cfg, format, e := image.DecodeConfig(bytes.NewReader(v.Data))
			if e != nil || cfg.Width != v.Width || cfg.Height != v.Height || format != "jpeg" || bytes.Contains(v.Data, []byte("private metadata")) {
				t.Fatal(name, "unsafe rendition", e)
			}
			if v.Width > 1800 || v.Height > 1000 || v.Size != len(v.Data) {
				t.Fatal("unexpected size")
			}
		}
		if purpose == "game" && (all["wide"].Width != 1600 || all["wide"].Height != 800 || all["mobile"].Width != 768 || all["mobile"].Height != 576) {
			t.Fatal("game shapes", all["wide"].Variant, all["mobile"].Variant)
		}
		if purpose == "inline" && all["wide"].Height != 889 {
			t.Fatal("inline aspect ratio changed")
		}
	}
	small, _, _, err := render(pixels(t, 40, 60, true), "image/png", "product", 50, 50)
	if err != nil {
		t.Fatal(err)
	}
	for _, v := range small {
		if v.Width != 40 || v.Height != 60 || v.ContentType != "image/png" {
			t.Fatal("upscaled or lost transparency")
		}
	}
}
func TestCropFocalEdgesAndThinImages(t *testing.T) {
	for _, bounds := range []image.Rectangle{image.Rect(0, 0, 1000, 500), image.Rect(0, 0, 1, 4096), image.Rect(7, 9, 4103, 10)} {
		for _, target := range shapes("game") {
			for _, x := range []int{0, 50, 100} {
				for _, y := range []int{0, 50, 100} {
					r := cropBounds(bounds, target, x, y)
					if !r.In(bounds) || r.Empty() {
						t.Fatal(bounds, r)
					}
				}
			}
		}
	}
	data := pixels(t, 200, 100, false)
	for _, tc := range []struct {
		x   int
		red bool
	}{{0, true}, {100, false}} {
		variants, _, _, e := render(data, "image/png", "game", tc.x, 50)
		if e != nil {
			t.Fatal(e)
		}
		img, _, e := image.Decode(bytes.NewReader(variants["mobile"].Data))
		if e != nil {
			t.Fatal(e)
		}
		r, _, b, _ := img.At(img.Bounds().Dx()/2, img.Bounds().Dy()/2).RGBA()
		if (r > b) != tc.red {
			t.Fatal("focal point ignored")
		}
	}
}
func TestRejectedImageFormatsAndPaths(t *testing.T) {
	for _, data := range [][]byte{nil, []byte("<svg onload='bad'/>")} {
		if _, _, _, e := render(data, "image/png", "game", 50, 50); e == nil {
			t.Fatal("unsafe bytes")
		}
	}
	if _, _, _, e := render(pixels(t, 20, 20, false), "image/jpeg", "game", 50, 50); e == nil {
		t.Fatal("mismatched MIME")
	}
	valid := []string{"/catalog-assets/game-mlbb-1536.jpg", "/api/v1/artwork/11111111-1111-4111-8111-111111111111/wide"}
	for _, path := range valid {
		if !ValidPath(path) {
			t.Fatal(path)
		}
	}
	for _, path := range []string{"https://evil.test/a.jpg", "//evil.test/a.jpg", "/api/v1/admin/artwork/11111111-1111-4111-8111-111111111111/wide", valid[1] + "?x=1", "/catalog-assets/../x.jpg", "/api/v1/artwork/../wide", "/api/v1/media/private"} {
		if ValidPath(path) {
			t.Fatal("unsafe path", path)
		}
	}
}
func TestJPEGOrientationAndMalformedEXIF(t *testing.T) {
	src := image.NewNRGBA(image.Rect(0, 0, 3, 2))
	src.Set(0, 0, color.White)
	for v := 1; v <= 8; v++ {
		result := orient(src, v)
		w, h := 3, 2
		if v >= 5 {
			w, h = h, w
		}
		if result.Bounds().Dx() != w || result.Bounds().Dy() != h {
			t.Fatal("orientation bounds", v)
		}
	}
	tiff := []byte{'I', 'I', 42, 0, 8, 0, 0, 0, 1, 0, 0x12, 1, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0}
	segment := append([]byte("Exif\x00\x00"), tiff...)
	header := []byte{0xff, 0xd8, 0xff, 0xe1, 0, 0}
	binary.BigEndian.PutUint16(header[4:6], 34) // Fixed 32-byte EXIF fixture plus the two-byte length.
	data := append(bytes.Clone(header), segment...)
	if jpegOrientation(data) != 6 {
		t.Fatal("EXIF orientation")
	}
	for n := 0; n < len(data); n++ {
		if v := jpegOrientation(data[:n]); v < 1 || v > 8 {
			t.Fatal("malformed EXIF")
		}
	}
	var raw bytes.Buffer
	if e := jpeg.Encode(&raw, src, nil); e != nil {
		t.Fatal(e)
	}
	encoded := append(append(data, raw.Bytes()[2:]...), []byte("private metadata")...)
	result, w, h, e := render(encoded, "image/jpeg", "inline", 50, 50)
	if e != nil || w != 2 || h != 3 || bytes.Contains(result["wide"].Data, []byte("Exif")) {
		t.Fatal("orientation or metadata", e)
	}
}
func TestAnimationDetection(t *testing.T) {
	p := make([]byte, 20)
	copy(p[12:16], "acTL")
	if !animated(p, "png") {
		t.Fatal("APNG")
	}
	w := make([]byte, 21)
	copy(w[12:16], "VP8X")
	w[20] = 2
	if !animated(w, "webp") {
		t.Fatal("animated WebP")
	}
	if animated(pixels(t, 2, 2, false), "png") || animated([]byte("truncated"), "png") {
		t.Fatal("false animation")
	}
}
