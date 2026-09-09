package migrate

import (
	"archive/zip"
	"bytes"
	"errors"
	"fmt"
	"io"
	"io/fs"
)

// snapshot prevents a directory edit after validation from changing executed SQL.
func snapshot(files []File) (fs.FS, error) {
	var buffer bytes.Buffer
	writer := zip.NewWriter(&buffer)
	for _, file := range files {
		entry, err := writer.Create(file.Name)
		if err != nil {
			return nil, errors.Join(fmt.Errorf("snapshot migration: %w", err), writer.Close())
		}
		if _, writeErr := io.WriteString(entry, file.SQL); writeErr != nil {
			return nil, errors.Join(writeErr, writer.Close())
		}
	}
	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("finish migration snapshot: %w", err)
	}
	reader, err := zip.NewReader(bytes.NewReader(buffer.Bytes()), int64(buffer.Len()))
	if err != nil {
		return nil, fmt.Errorf("open migration snapshot: %w", err)
	}
	return reader, nil
}
