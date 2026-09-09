package identity

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"net/mail"
	"strings"
	"unicode"
)

func randomToken() string { return rand.Text() + rand.Text() }

func (s *Service) digest(purpose string, parts ...string) string {
	hash := hmac.New(sha256.New, s.config.Key)
	_, _ = hash.Write([]byte(purpose + "\x00" + strings.Join(parts, "\x00")))
	return hex.EncodeToString(hash.Sum(nil))
}

func (s *Service) seal(purpose string, plaintext []byte) ([]byte, error) {
	block, err := aes.NewCipher(s.config.Key)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCMWithRandomNonce(block)
	if err != nil {
		return nil, err
	}
	// #nosec G407 -- NewGCMWithRandomNonce generates and prepends a random nonce; its Seal API requires nil.
	return aead.Seal(nil, nil, plaintext, []byte(purpose)), nil
}
func (s *Service) open(purpose string, ciphertext []byte) ([]byte, error) {
	block, err := aes.NewCipher(s.config.Key)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCMWithRandomNonce(block)
	if err != nil {
		return nil, err
	}
	plaintext, openErr := aead.Open(nil, nil, ciphertext, []byte(purpose))
	if openErr != nil {
		return nil, errors.New("identity ciphertext unavailable")
	}
	return plaintext, nil
}
func newCode() (string, error) {
	value, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", value.Int64()), nil
}

// NormalizeEmail deliberately accepts plain ASCII mailbox addresses, without display names or provider-specific rewriting.
func NormalizeEmail(value string) (string, error) {
	value = strings.TrimSpace(value)
	if len(value) > 254 || strings.IndexFunc(value, func(r rune) bool { return r > unicode.MaxASCII || unicode.IsControl(r) }) >= 0 {
		return "", ErrInvalid
	}
	parsed, err := mail.ParseAddress(value)
	if err != nil || parsed.Name != "" || parsed.Address != value || strings.Count(value, "@") != 1 {
		return "", ErrInvalid
	}
	parts := strings.SplitN(value, "@", 2)
	if len(parts[0]) > 64 || len(parts[0]) == 0 || !strings.Contains(parts[1], ".") {
		return "", ErrInvalid
	}
	return strings.ToLower(value), nil
}
