package sitecontent

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
)

// Notifications changes reviewed plain copy, never routing, consent, authentication or resource links.
type Notifications struct {
	ActivitySubject     string `json:"activity_subject"`
	ActivityIntro       string `json:"activity_intro"`
	AvailabilitySubject string `json:"availability_subject"`
	AvailabilityIntro   string `json:"availability_intro"`
	Footer              string `json:"footer"`
}

// NotificationCopy retains required product instructions in each caller, outside editable copy.
func NotificationCopy(ctx context.Context, client *ent.Client) (Notifications, error) {
	n := Notifications{ActivitySubject: "New activity on PLAYORA", ActivityIntro: "There is an update in your PLAYORA account.", AvailabilitySubject: "An offer you follow has availability", AvailabilityIntro: "An offer matching your subscription is available."}
	v, e := Published(ctx, client, "notifications")
	if e != nil {
		return n, e
	}
	if v.ReleaseID != "" {
		e = decode(v.Data, &n)
	}
	return n, e
}
