package artwork

import (
	"bytes"
	"encoding/binary"
	"image"
)

// Read only the bounded JPEG EXIF orientation field; never retain EXIF metadata.
func jpegOrientation(data []byte) int {
	if len(data) < 4 || data[0] != 0xff || data[1] != 0xd8 {
		return 1
	}
	for i := 2; i+4 <= len(data); {
		if data[i] != 0xff {
			return 1
		}
		marker := data[i+1]
		if marker == 0xda || marker == 0xd9 {
			return 1
		}
		length := int(binary.BigEndian.Uint16(data[i+2 : i+4]))
		if length < 2 || i+2+length > len(data) {
			return 1
		}
		segment := data[i+4 : i+2+length]
		if marker == 0xe1 && bytes.HasPrefix(segment, []byte("Exif\x00\x00")) {
			return tiffOrientation(segment[6:])
		}
		i += 2 + length
	}
	return 1
}
func tiffOrientation(data []byte) int {
	if len(data) < 8 {
		return 1
	}
	var order binary.ByteOrder
	switch string(data[:2]) {
	case "II":
		order = binary.LittleEndian
	case "MM":
		order = binary.BigEndian
	default:
		return 1
	}
	if order.Uint16(data[2:4]) != 42 {
		return 1
	}
	offset := uint64(order.Uint32(data[4:8]))
	if offset+2 > uint64(len(data)) {
		return 1
	}
	count := uint64(order.Uint16(data[offset : offset+2]))
	if count > 256 || offset+2+count*12 > uint64(len(data)) {
		return 1
	}
	for i := uint64(0); i < count; i++ {
		p := offset + 2 + i*12
		entry := data[p : p+12]
		if order.Uint16(entry[:2]) == 0x112 && order.Uint16(entry[2:4]) == 3 && order.Uint32(entry[4:8]) == 1 {
			v := int(order.Uint16(entry[8:10]))
			if v >= 1 && v <= 8 {
				return v
			}
		}
	}
	return 1
}
func orient(src image.Image, value int) image.Image {
	if value <= 1 || value > 8 {
		return src
	}
	w, h := src.Bounds().Dx(), src.Bounds().Dy()
	dw, dh := w, h
	if value >= 5 {
		dw, dh = h, w
	}
	dst := image.NewNRGBA(image.Rect(0, 0, dw, dh))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			dx, dy := x, y
			switch value {
			case 2:
				dx = w - 1 - x
			case 3:
				dx, dy = w-1-x, h-1-y
			case 4:
				dy = h - 1 - y
			case 5:
				dx, dy = y, x
			case 6:
				dx, dy = h-1-y, x
			case 7:
				dx, dy = h-1-y, w-1-x
			case 8:
				dx, dy = y, w-1-x
			}
			dst.Set(dx, dy, src.At(src.Bounds().Min.X+x, src.Bounds().Min.Y+y))
		}
	}
	return dst
}

// Only still images are accepted; do not silently flatten animated uploads.
func animated(data []byte, format string) bool {
	if format == "webp" {
		return len(data) > 20 && string(data[12:16]) == "VP8X" && data[20]&2 != 0
	}
	if format != "png" {
		return false
	}
	for pos := uint64(8); pos+12 <= uint64(len(data)); {
		size := uint64(binary.BigEndian.Uint32(data[pos : pos+4]))
		if pos+12+size > uint64(len(data)) {
			return false
		}
		if string(data[pos+4:pos+8]) == "acTL" {
			return true
		}
		pos += 12 + size
	}
	return false
}
