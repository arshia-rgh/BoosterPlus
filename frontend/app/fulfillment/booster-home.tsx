import { Link } from "../portal-router";
import { Action, ErrorNotice } from "../catalog/controls";
import { useResource } from "../orders/resource";
import { calendarSchema } from "./calendar-model";
import { listingSchema } from "./model";
import { workNextStep } from "./work-presentation";
import Agenda, { sessionTime } from "./agenda";
export default function BoosterHome() {
  const work = useResource("/booster/fulfillment?state=active", listingSchema);
  const calendar = useResource("/booster/calendar", calendarSchema);
  return (
    <div className="account-overview">
      <Agenda compact />
      <section className="account-panel">
        <h2>Assigned work</h2>
        <ErrorNotice error={work.error} />
        {!work.data && (
          <p role="status">
            {work.loading
              ? "Loading your assigned work…"
              : "Your assignments are unavailable. Refresh to retry."}
          </p>
        )}
        {work.data && !work.data.items.length && (
          <p>No active assignments. Keep your availability up to date.</p>
        )}
        <ul className="account-work-list">
          {work.data?.items.slice(0, 5).map((item) => (
            <li key={item.order_id}>
              <Link
                to={`/booster/orders/${item.order_id}`}
                state={{ assignmentOrigin: "overview" }}
              >
                <strong>{item.game}</strong>
                <span>{workNextStep(item)}</span>
                <small>Assignment {item.order_id.slice(0, 8)}</small>
              </Link>
            </li>
          ))}
        </ul>
        <div className="catalog-actions">
          <Link className="button" to="/booster/orders">
            View assigned work
          </Link>
          <Action disabled={work.loading} onClick={work.reload}>
            Refresh assignments
          </Action>
        </div>
      </section>
      <section className="account-panel">
        <h2>Your availability</h2>
        <ErrorNotice error={calendar.error} />
        {!calendar.data ? (
          <p role="status">
            {calendar.loading
              ? "Loading availability…"
              : "Availability could not be loaded."}
          </p>
        ) : (
          <>
            <p>
              {calendar.data.profile.enabled
                ? "Accepting new session proposals"
                : "New session proposals are paused"}{" "}
              · {calendar.data.profile.timezone}
            </p>
            <ul>
              {calendar.data.windows
                .filter((item) => item.active)
                .slice(0, 3)
                .map((item) => (
                  <li key={item.id}>
                    {sessionTime(item.starts_at, item.timezone)} –{" "}
                    {sessionTime(item.ends_at, item.timezone)}
                  </li>
                ))}
            </ul>
            <p>Published windows are availability, not confirmed bookings.</p>
          </>
        )}
        <div className="catalog-actions">
          <Link to="/booster/calendar">Edit availability</Link>
          <Action disabled={calendar.loading} onClick={calendar.reload}>
            Refresh availability
          </Action>
        </div>
      </section>
    </div>
  );
}
