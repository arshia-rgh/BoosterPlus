package media

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"
	"net/http"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// Objects exposes only bounded private object operations, never customer keys.
type Objects interface {
	Put(context.Context, string, []byte, string) error
	Get(context.Context, string) ([]byte, error)
	Delete(context.Context, string) error
}

// S3 isolates the namespace; qualification tests use a unique test prefix.
type S3 struct {
	client         *s3.Client
	bucket, prefix string
}

// NewS3 receives validated, operator-owned configuration.
func NewS3(endpoint, region, bucket, access, secret, prefix string) *S3 {
	client := s3.NewFromConfig(aws.Config{Region: region, Credentials: credentials.NewStaticCredentialsProvider(access, secret, ""), HTTPClient: &http.Client{Timeout: 10 * time.Second, CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }}}, func(o *s3.Options) { o.BaseEndpoint = aws.String(endpoint); o.UsePathStyle = true })
	return &S3{client: client, bucket: bucket, prefix: prefix}
}

// Put binds the stored bytes to their SHA-256 checksum.
func (s *S3) Put(ctx context.Context, key string, data []byte, kind string) error {
	hash := sha256.Sum256(data)
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(s.prefix + key), Body: bytes.NewReader(data), ContentLength: aws.Int64(int64(len(data))), ContentType: aws.String(kind), ChecksumSHA256: aws.String(base64.StdEncoding.EncodeToString(hash[:]))})
	if err != nil {
		return errors.New("private storage write unavailable")
	}
	return nil
}

// Get cannot allocate beyond the per-file limit even for a compromised object.
func (s *S3) Get(ctx context.Context, key string) (data []byte, result error) {
	out, err := s.client.GetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(s.prefix + key)})
	if err != nil {
		return nil, errors.New("private storage read unavailable")
	}
	defer func() { result = errors.Join(result, out.Body.Close()) }()
	data, err = io.ReadAll(io.LimitReader(out.Body, MaxBytes+1))
	if err != nil || len(data) > MaxBytes {
		return nil, errors.New("private object invalid")
	}
	return data, nil
}

// Delete is idempotent and does not enumerate the bucket.
func (s *S3) Delete(ctx context.Context, key string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(s.prefix + key)})
	if err != nil {
		return errors.New("private storage cleanup unavailable")
	}
	return nil
}
