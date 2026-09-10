//go:build integration

package integration

import (
	"testing"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/conversations"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
)

func TestSubmissionScannedEvidencePrivacy(t *testing.T) {
	f := submissionDB(t)
	ctx := t.Context()
	v := f.createSubmission(t)
	// Even fully authenticated boosting staff get no seller-evidence membership.
	_, staff := f.auth.login(t, "intakebooster@example.test")
	if _, err := f.auth.client.User.UpdateOneID(staff.User.ID).SetRole("booster").Save(ctx); err != nil {
		t.Fatal(err)
	}
	staff = f.auth.principalFromSession(t, staff)
	_, _, staff = f.auth.enroll(t, staff)
	files := media.New(f.auth.client, f.auth.service, mediaObjects(t, f.auth.client), media.Clamd{Network: "tcp", Address: "127.0.0.1:13310"})
	data := imageBytes(t)
	file, err := files.Create(ctx, f.buyer, false, mediaIntent(v.ConversationID, "public", data))
	if err != nil {
		t.Fatal(err)
	}
	if err = files.Upload(ctx, f.buyer, file.ID, false, data); err != nil {
		t.Fatal(err)
	}
	if _, err = files.Finalize(ctx, f.buyer, file.ID, false); err != nil {
		t.Fatal(err)
	}
	scanJob(t, files, file.ID)
	chat := supportStore(f.orderFixture)
	if _, err = chat.Send(ctx, f.buyer, v.ConversationID, false, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Private ownership evidence", Visibility: "public", Attachments: []string{file.ID}}); err != nil {
		t.Fatal(err)
	}
	for _, admin := range []bool{false, true} {
		p := f.buyer
		if admin {
			p = f.admin
		}
		if _, err = files.Grant(ctx, p, file.ID, admin); err != nil {
			t.Fatal("authorized ownership evidence unavailable", err)
		}
	}
	if _, err = files.Grant(ctx, f.other, file.ID, false); !ent.IsNotFound(err) {
		t.Fatal("foreign ownership evidence leaked", err)
	}
	if _, err = chat.Get(ctx, staff, v.ConversationID, false); !ent.IsNotFound(err) {
		t.Fatal("booster read intake conversation", err)
	}
	if _, err = files.Grant(ctx, staff, file.ID, false); !ent.IsNotFound(err) {
		t.Fatal("booster read ownership image", err)
	}
}
