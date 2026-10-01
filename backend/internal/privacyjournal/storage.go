package privacyjournal

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

const prefix = "privacy/v1/"

// S3 uses a dedicated off-host bucket/identity, separate from recoverable media.
type S3 struct {
	client *s3.Client
	bucket string
}

// NewS3 takes validated operator configuration. Redirects never carry credentials.
func NewS3(endpoint, region, bucket, access, secret string) *S3 {
	client := s3.NewFromConfig(aws.Config{Region: region, Credentials: credentials.NewStaticCredentialsProvider(access, secret, ""), HTTPClient: &http.Client{Timeout: 5 * time.Second, CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }}}, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
		o.UsePathStyle = true
		o.RetryMaxAttempts = 1
	})
	return &S3{client: client, bucket: bucket}
}

// Create cannot overwrite an existing evidence object.
func (s *S3) Create(ctx context.Context, key string, data []byte) error {
	if !validID(key) || len(data) > 4096 {
		return errors.New("invalid privacy recovery write")
	}
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(prefix + key), Body: bytes.NewReader(data), IfNoneMatch: aws.String("*"), ContentType: aws.String("application/octet-stream")})
	if err != nil {
		return errors.New("privacy recovery storage unavailable")
	}
	return nil
}

// Read returns only bounded encrypted evidence.
func (s *S3) Read(ctx context.Context, key string) (data []byte, result error) {
	if !validID(key) {
		return nil, errors.New("invalid privacy recovery key")
	}
	out, err := s.client.GetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(prefix + key)})
	if err != nil {
		return nil, errors.New("privacy recovery storage unavailable")
	}
	defer func() { result = errors.Join(result, out.Body.Close()) }()
	data, err = io.ReadAll(io.LimitReader(out.Body, 4097))
	if err != nil || len(data) > 4096 {
		return nil, errors.New("invalid privacy recovery object")
	}
	return data, nil
}

// Keys is for the separate recovery operator, not the application identity.
func (s *S3) Keys(ctx context.Context) ([]string, error) {
	var keys []string
	var token *string
	for pageNumber := 0; pageNumber < 1001; pageNumber++ {
		page, err := s.client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{Bucket: aws.String(s.bucket), Prefix: aws.String(prefix), ContinuationToken: token, MaxKeys: aws.Int32(100)})
		if err != nil {
			return nil, errors.New("privacy recovery listing unavailable")
		}
		for _, object := range page.Contents {
			key := strings.TrimPrefix(aws.ToString(object.Key), prefix)
			if !validID(key) || aws.ToInt64(object.Size) > 4096 {
				return nil, errors.New("invalid privacy recovery listing")
			}
			keys = append(keys, key)
		}
		if len(keys) > 100000 {
			return nil, errors.New("privacy recovery listing limit exceeded")
		}
		if !aws.ToBool(page.IsTruncated) {
			return keys, nil
		}
		next := aws.ToString(page.NextContinuationToken)
		if next == "" || next == aws.ToString(token) {
			return nil, errors.New("invalid privacy recovery pagination")
		}
		token = aws.String(next)
	}
	return nil, errors.New("privacy recovery pagination limit exceeded")
}
