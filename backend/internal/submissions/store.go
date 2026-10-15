package submissions

import (
	"context"
	"encoding/json"
	"slices"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountsubmission"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversation"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
)

func validVersion(version int) bool { return version >= 1 && version < 2147483646 }

// Create atomically creates a deduplicated private draft and separate seller review thread.
func (s *Store) Create(ctx context.Context, p *identity.Principal, input CreateInput) (View, error) {
	key, err := uuid.Parse(input.RequestKey)
	if err != nil || key.String() != input.RequestKey || !text(input.Title, 1, 120) || len(input.Slug) > 80 || len(input.ReleaseID) > 36 {
		return View{}, ErrInvalid
	}
	raw, err := json.Marshal(input)
	if err != nil {
		return View{}, err
	}
	digest := s.auth.RequestDigest("submission-create", raw)
	var result View
	err = s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		existing, e := tx.AccountSubmission.Query().Where(accountsubmission.UserIDEQ(current.User.ID), accountsubmission.RequestKeyEQ(input.RequestKey)).Only(ctx)
		if e == nil {
			if existing.RequestHash != digest {
				return ErrConflict
			}
			result, e = view(ctx, tx.Client(), existing)
			return e
		}
		if !ent.IsNotFound(e) {
			return e
		}
		count, e := tx.AccountSubmission.Query().Where(accountsubmission.UserIDEQ(current.User.ID), accountsubmission.StateNotIn(accountsubmission.StateRejected, accountsubmission.StateWithdrawn)).Count(ctx)
		if e != nil {
			return e
		}
		if count >= 20 {
			return ErrConflict
		}
		release, e := catalog.New(tx.Client(), s.auth).Published(ctx, input.Slug)
		if e != nil {
			return e
		}
		if release.ID != input.ReleaseID || !catalog.Available(release.Configuration, release.Paused, "accounts") || release.Configuration.Intake == nil {
			return ErrConflict
		}
		snapshot, e := document(release)
		if e != nil {
			return e
		}
		now := s.now().UTC()
		row, e := tx.AccountSubmission.Create().SetUserID(current.User.ID).SetGameID(release.GameID).SetGameName(release.Configuration.Name).SetSlug(release.Slug).SetTitle(input.Title).SetSnapshot(snapshot).SetAnswers(map[string]any{}).SetOwnershipNotes("").SetCurrentNote("Private draft; no commercial agreement has been offered.").SetRequestKey(input.RequestKey).SetRequestHash(digest).SetCreatedAt(now).SetUpdatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		threadID, e := uuid.NewV7()
		if e != nil {
			return e
		}
		_, e = tx.Conversation.Create().SetID(threadID.String()).SetUserID(row.UserID).SetSubmissionID(row.ID).SetKind(conversation.KindSubmission).SetSubject("Account submission review").SetSlug(row.Slug).SetRequestKey(uuid.NewString()).SetRequestHash(s.auth.RequestDigest("submission-thread", []byte(row.ID))).SetCreatedBy(current.User.ID).SetCreatedAt(now).SetUpdatedAt(now).SetPublicUpdatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		if e = s.event(ctx, tx, current, row, "created", row.CurrentNote, now); e != nil {
			return e
		}
		result, e = view(ctx, tx.Client(), row)
		return e
	})
	return result, err
}

// Edit saves only a draft or explicitly requested clarification, never a reviewed submission.
func (s *Store) Edit(ctx context.Context, p *identity.Principal, id string, input Edit) (View, error) {
	if !validVersion(input.Version) || len(input.Answers) > 40 {
		return View{}, ErrInvalid
	}
	if issues := editIssues(input); len(issues) > 0 {
		return View{}, &catalog.Invalid{Issues: issues}
	}
	var result View
	err := s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := owned(ctx, tx.Client(), current, id, false)
		if e != nil {
			return e
		}
		if row.Version != input.Version || !slices.Contains([]accountsubmission.State{accountsubmission.StateDraft, accountsubmission.StateNeedsInformation}, row.State) {
			return ErrConflict
		}
		release, e := decode[catalog.Release](row.Snapshot)
		if e != nil {
			return e
		}
		validated := catalog.ValidateIntake(release.Configuration, input.Answers, false)
		if len(validated.Issues) > 0 {
			return &catalog.Invalid{Issues: validated.Issues}
		}
		data, e := document(validated.Answers)
		if e != nil {
			return e
		}
		now := s.now().UTC()
		row, e = tx.AccountSubmission.UpdateOneID(id).AddVersion(1).SetTitle(input.Title).SetAnswers(data).SetOwnershipNotes(input.OwnershipNotes).SetOwnershipDeclared(input.OwnershipDeclared).SetUpdatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		if e = s.event(ctx, tx, current, row, "edited", "Private draft information updated; submit it when ready for review.", now); e != nil {
			return e
		}
		result, e = view(ctx, tx.Client(), row)
		return e
	})
	return result, err
}

// Transition records intake decisions only. Commercial acceptance and payout are separate gates.
func (s *Store) Transition(ctx context.Context, p *identity.Principal, id string, admin bool, action string, input Action) (View, error) {
	if !validVersion(input.Version) {
		return View{}, ErrInvalid
	}
	if !text(input.Note, 0, 2000) {
		return View{}, &catalog.Invalid{Issues: []catalog.Issue{{Path: "note", Message: "Use no more than 2,000 characters, without control characters."}}}
	}
	var result View
	err := s.auth.AuthorizedTransaction(ctx, p, capability(admin), admin, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := owned(ctx, tx.Client(), current, id, admin)
		if e != nil {
			return e
		}
		if row.Version != input.Version {
			return ErrConflict
		}
		var next accountsubmission.State
		note := input.Note
		if admin {
			if !text(note, 1, 2000) {
				return &catalog.Invalid{Issues: []catalog.Issue{{Path: "note", Message: "Explain this review decision in 1–2,000 characters."}}}
			}
			if !slices.Contains([]accountsubmission.State{accountsubmission.StateSubmitted, accountsubmission.StateNeedsInformation, accountsubmission.StateApprovedPendingTerms}, row.State) {
				return ErrConflict
			}
			switch action {
			case "clarify":
				next = accountsubmission.StateNeedsInformation
			case "reject":
				next = accountsubmission.StateRejected
			case "approve_review":
				if row.State != accountsubmission.StateSubmitted {
					return ErrConflict
				}
				next = accountsubmission.StateApprovedPendingTerms
			default:
				return ErrInvalid
			}
		} else {
			switch action {
			case "submit":
				if row.State != accountsubmission.StateDraft && row.State != accountsubmission.StateNeedsInformation {
					return ErrConflict
				}
				release, decodeErr := decode[catalog.Release](row.Snapshot)
				if decodeErr != nil {
					return decodeErr
				}
				answers, decodeErr := decode[catalog.Answers](row.Answers)
				if decodeErr != nil {
					return decodeErr
				}
				validated := catalog.ValidateIntake(release.Configuration, answers, true)
				if len(validated.Issues) > 0 {
					return &catalog.Invalid{Issues: validated.Issues}
				}
				if !row.OwnershipDeclared {
					return &catalog.Invalid{Issues: []catalog.Issue{{Path: "ownership_declared", Message: "Confirm your authority to submit this account for sale."}}}
				}
				next, note = accountsubmission.StateSubmitted, "Account submitted for private review. No purchase or payout agreement exists yet."
			case "withdraw":
				if row.State == accountsubmission.StateRejected || row.State == accountsubmission.StateWithdrawn || row.State == accountsubmission.StateAccepted {
					return ErrConflict
				}
				next, note = accountsubmission.StateWithdrawn, "Submission withdrawn before any commercial acceptance."
			default:
				return ErrInvalid
			}
		}
		if next == row.State {
			return ErrConflict
		}
		now := s.now().UTC()
		row, e = tx.AccountSubmission.UpdateOneID(id).AddVersion(1).SetState(next).SetCurrentNote(note).SetUpdatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		if e = s.event(ctx, tx, current, row, action, note, now); e != nil {
			return e
		}
		result, e = view(ctx, tx.Client(), row)
		return e
	})
	return result, err
}

func (s *Store) event(ctx context.Context, tx *ent.Tx, p *identity.Principal, row *ent.AccountSubmission, action, note string, now time.Time) error {
	_, err := tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(p.User.ID).SetTargetID(row.ID).SetAction("submission_" + action).SetMetadata(map[string]string{}).SetCreatedAt(now).Save(ctx)
	if err != nil {
		return err
	}
	role := "staff"
	if p.User.ID == row.UserID {
		role = "seller"
	}
	event, err := tx.SubmissionEvent.Create().SetSubmissionID(row.ID).SetVersion(row.Version).SetState(string(row.State)).SetAction(action).SetMessage(note).SetActorRole(role).SetCreatedAt(now).Save(ctx)
	if err != nil {
		return err
	}
	if p.User.ID != row.UserID {
		return notifications.Enqueue(ctx, tx, row.UserID, row.ID, event.ID, "submission_seller", now)
	}
	if action != "submit" && action != "withdraw" {
		return nil
	}
	thread, err := tx.Conversation.Query().Where(conversation.SubmissionIDEQ(row.ID)).Only(ctx)
	if err != nil {
		return err
	}
	if thread.AssignedTo != "" && thread.AssignedTo != p.User.ID {
		return notifications.Enqueue(ctx, tx, thread.AssignedTo, thread.ID, event.ID, "conversation_staff", now)
	}
	return nil
}
