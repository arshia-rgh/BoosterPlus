package config

import (
	"errors"
	"net"
	"net/url"
	"path/filepath"
	"regexp"
	"strings"
)

// Media contains operator-only endpoints and private storage credentials.
type Media struct{ Endpoint, Region, Bucket, Access, Secret, ScannerNetwork, ScannerAddress string }

var bucketName = regexp.MustCompile(`^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$`)

// PrivateMedia rejects plaintext remote storage and network-exposed production scanners.
func PrivateMedia(getenv func(string) string, environment string) (Media, error) {
	c := Media{Endpoint: getenv("MEDIA_S3_ENDPOINT"), Region: getenv("MEDIA_S3_REGION"), Bucket: getenv("MEDIA_S3_BUCKET"), Access: getenv("MEDIA_S3_ACCESS_KEY"), Secret: getenv("MEDIA_S3_SECRET_KEY"), ScannerNetwork: getenv("MEDIA_SCANNER_NETWORK"), ScannerAddress: getenv("MEDIA_SCANNER_ADDRESS")}
	local := environment == "development" || environment == "test"
	u, err := url.Parse(c.Endpoint)
	if err != nil || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || u.Path != "" && u.Path != "/" {
		return Media{}, errors.New("private storage endpoint invalid")
	}
	if u.Scheme != "https" {
		host := u.Hostname()
		ip := net.ParseIP(host)
		if !local || u.Scheme != "http" || (host != "storage" && host != "localhost" && (ip == nil || !ip.IsLoopback())) {
			return Media{}, errors.New("private storage requires HTTPS")
		}
	}
	if !bucketName.MatchString(c.Bucket) || strings.Contains(c.Bucket, "..") || c.Region == "" || len(c.Access) < 3 || len(c.Secret) < 20 {
		return Media{}, errors.New("private storage configuration incomplete")
	}
	switch c.ScannerNetwork {
	case "unix":
		if !filepath.IsAbs(c.ScannerAddress) || strings.ContainsAny(c.ScannerAddress, "\r\n\x00") {
			return Media{}, errors.New("scanner socket invalid")
		}
	case "tcp":
		host, port, e := net.SplitHostPort(c.ScannerAddress)
		ip := net.ParseIP(host)
		if !local || e != nil || port == "" || (host != "scanner" && host != "localhost" && (ip == nil || !ip.IsLoopback())) {
			return Media{}, errors.New("network scanners are restricted to local development")
		}
	default:
		return Media{}, errors.New("scanner transport invalid")
	}
	return c, nil
}
