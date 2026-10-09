import { useState } from "react";
import "./booster.css";
import { Link } from "../portal-router";
import { z } from "../validation";
import { Action, ErrorNotice } from "../catalog/controls";
import { useResource } from "../orders/resource";
const agendaSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      order_id: z.string(),
      game: z.string(),
      starts_at: z.string(),
      ends_at: z.string(),
      timezone: z.string(),
      state: z.enum(["confirmed", "proposed"]),
    }),
  ),
  next: z.string(),
});
export function sessionTime(instant: string, zone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: zone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "shortOffset",
  }).format(new Date(instant));
}
export default function Agenda({ compact = false }: { compact?: boolean }) {
  const [after, setAfter] = useState("");
  const resource = useResource(
    `/booster/calendar/sessions?${new URLSearchParams({ after, state: compact ? "confirmed" : "" }).toString()}`,
    agendaSchema,
  );
  const rows = compact
    ? resource.data?.items.slice(0, 1)
    : resource.data?.items;
  return (
    <section
      className="account-panel booster-agenda"
      aria-label={compact ? "Next confirmed session" : "Session agenda"}
    >
      <h2>{compact ? "Your next session" : "Upcoming sessions"}</h2>
      <p>
        {compact
          ? "Your nearest confirmed session for a current assignment."
          : "Proposals need your response. A proposed time is not a confirmed booking."}
      </p>
      <ErrorNotice error={resource.error} />
      {!resource.data && (
        <p role="status">
          {resource.loading
            ? "Loading sessions…"
            : "Sessions could not be loaded. Refresh to check your schedule."}
        </p>
      )}
      {rows && !rows.length && (
        <p>
          {compact
            ? "No upcoming confirmed session."
            : "No upcoming sessions on this page."}
        </p>
      )}
      <ul className="availability-windows">
        {rows?.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{item.game}</strong>
              <span className="status">
                {item.state === "confirmed" ? "Confirmed" : "Response needed"}
              </span>
              <p>
                <time dateTime={item.starts_at}>
                  {sessionTime(item.starts_at, item.timezone)}
                </time>{" "}
                –{" "}
                <time dateTime={item.ends_at}>
                  {sessionTime(item.ends_at, item.timezone)}
                </time>
              </p>
              <small>{item.timezone} · Play together</small>
              <Link
                to={`/booster/orders/${item.order_id}?section=sessions`}
                state={{ assignmentOrigin: compact ? "overview" : "calendar" }}
              >
                View assignment {item.order_id.slice(0, 8)}
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <div className="catalog-actions">
        <Action disabled={resource.loading} onClick={resource.reload}>
          Refresh sessions
        </Action>
        {compact ? (
          <Link to="/booster/calendar">Calendar & availability</Link>
        ) : (
          <>
            {after && (
              <Action
                onClick={() => {
                  setAfter("");
                }}
              >
                Earliest sessions
              </Action>
            )}
            {resource.data?.next && (
              <Action
                onClick={() => {
                  setAfter(resource.data?.next ?? "");
                }}
              >
                More sessions
              </Action>
            )}
          </>
        )}
      </div>
    </section>
  );
}
