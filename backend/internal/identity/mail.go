package identity

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	mail "github.com/wneessen/go-mail"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authmessage"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/user"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
)

// Message exists in plaintext only in process memory and inside the delivery adapter.
type Message struct {
	To      string
	Subject string
	Body    string
}

// Sender is the email delivery boundary; tests inject a recorder instead of public SMTP.
type Sender interface {
	Send(context.Context, Message) error
}

// SMTP sends through an explicitly configured TLS-capable transactional SMTP server.
type SMTP struct {
	client *mail.Client
	from   string
}

// NewSMTP refuses anonymous/plaintext credentials outside explicitly configured local mode.
func NewSMTP(cfg Config) (*SMTP, error) {
	policy := mail.TLSMandatory
	if cfg.SMTPPlaintext {
		policy = mail.NoTLS
	}
	options := []mail.Option{mail.WithPort(cfg.SMTPPort), mail.WithTLSPolicy(policy), mail.WithTimeout(10 * time.Second)}
	if cfg.SMTPUsername != "" {
		options = append(options, mail.WithSMTPAuth(mail.SMTPAuthPlain), mail.WithUsername(cfg.SMTPUsername), mail.WithPassword(cfg.SMTPPassword))
	}
	client, err := mail.NewClient(cfg.SMTPHost, options...)
	if err != nil {
		return nil, errors.New("SMTP configuration invalid")
	}
	return &SMTP{client: client, from: cfg.SMTPFrom}, nil
}

// Send never exposes recipient addresses or codes in returned errors.
func (s *SMTP) Send(ctx context.Context, value Message) error {
	message := mail.NewMsg()
	if err := message.From(s.from); err != nil {
		return errors.New("mail sender invalid")
	}
	if err := message.To(value.To); err != nil {
		return errors.New("mail recipient invalid")
	}
	message.Subject(value.Subject)
	message.SetBodyString(mail.TypeTextPlain, value.Body)
	if err := s.client.DialAndSendWithContext(ctx, message); err != nil {
		return errors.New("mail delivery unavailable")
	}
	return nil
}

// EmailHandler decrypts only an active message, redacts its stored payload after delivery, and tolerates retries.
func (s *Service) EmailHandler(sender Sender) jobs.Handler {
	return func(ctx context.Context, job jobs.Job) error {
		var reference struct {
			MessageID string `json:"message_id"`
		}
		if err := json.Unmarshal(job.Payload, &reference); err != nil || reference.MessageID == "" {
			return ErrInvalid
		}
		message, readErr := s.client.AuthMessage.Get(ctx, reference.MessageID)
		if ent.IsNotFound(readErr) {
			return nil
		}
		if readErr != nil {
			return readErr
		}
		if message.SentAt != nil || len(message.EncryptedPayload) == 0 {
			return nil
		}
		active := message.ExpiresAt.After(s.now())
		if active && message.ChallengeID != "" {
			challenge, challengeErr := s.client.AuthChallenge.Get(ctx, message.ChallengeID)
			if challengeErr != nil && !ent.IsNotFound(challengeErr) {
				return challengeErr
			}
			active = challenge != nil && !challenge.Consumed && challenge.ExpiresAt.After(s.now())
		}
		if active {
			plaintext, decryptErr := s.open("message:"+message.ID, message.EncryptedPayload)
			if decryptErr != nil {
				return decryptErr
			}
			var content Message
			if err := json.Unmarshal(plaintext, &content); err != nil {
				return ErrInvalid
			}
			if sendErr := sender.Send(ctx, content); sendErr != nil {
				return errors.New("identity email delivery failed")
			}
		}
		_, updateErr := s.client.AuthMessage.Update().Where(authmessage.IDEQ(message.ID), authmessage.SentAtIsNil()).SetSentAt(s.now()).ClearEncryptedPayload().Save(ctx)
		return updateErr
	}
}

// Cleanup bounds sensitive material retention; audit records are retained separately.
func (s *Service) Cleanup(ctx context.Context) error {
	now := s.now()
	if _, err := s.client.User.Update().Where(user.MfaPendingExpiresLT(now)).ClearMfaPending().ClearMfaPendingExpires().Save(ctx); err != nil {
		return err
	}
	// Statements are static and bounded. Retried cleanup is idempotent.
	for _, statement := range []string{
		"DELETE FROM auth_challenges WHERE expires_at < ? LIMIT 1000",
		"DELETE FROM auth_messages WHERE expires_at < ? LIMIT 1000",
		"DELETE FROM auth_rates WHERE expires_at < ? LIMIT 1000",
		"DELETE FROM auth_flows WHERE expires_at < ? LIMIT 1000",
		"DELETE FROM auth_sessions WHERE expires_at < ? LIMIT 1000",
	} {
		if _, err := s.client.ExecContext(ctx, statement, now); err != nil {
			return err
		}
	}
	return nil
}
