import "../ui/secondary.css";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Action, ErrorNotice } from "../catalog/controls";
import { command } from "../identity/api";
import { useResource } from "../orders/resource";
import { notificationsSchema } from "./model";
export default function Notifications() {
  const [params] = useSearchParams(),
    resource = useResource(
      "/me/notifications?after=" +
        encodeURIComponent(params.get("after") ?? ""),
      notificationsSchema,
    ),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  async function read(id: string) {
    setBusy(true);
    setError(null);
    try {
      await command(`/me/notifications/${id}/read`);
      resource.reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <p>
        <Link to="/account/preferences">Manage email preferences</Link>. Updates
        stay here when email is disabled.
      </p>
      <Action disabled={resource.loading} onClick={resource.reload}>
        Refresh activity
      </Action>
      <ErrorNotice error={resource.error ?? error} />
      {!resource.data ? (
        <p role="status">
          {resource.loading
            ? "Loading activity…"
            : "Could not load activity. Use Refresh activity to try again."}
        </p>
      ) : (
        <>
          {resource.data.notifications.length === 0 && (
            <p>No activity notices yet.</p>
          )}
          <ul className="secondary-list activity-list">
            {resource.data.notifications.map((notice) => (
              <li key={notice.id} data-unread={!notice.read}>
                <Link to={notice.href}>
                  {notice.kind === "review_customer"
                    ? "Purchase review updated"
                    : notice.kind === "submission_seller"
                      ? "Account submission updated"
                      : notice.kind === "order_customer"
                        ? "Order updated"
                        : notice.kind === "booking_customer"
                          ? "Session booking updated"
                          : "New support reply"}{" "}
                  · {notice.read ? "Read" : "Unread"}
                </Link>
                <time dateTime={notice.created_at}>
                  {new Date(notice.created_at).toLocaleString()}
                </time>
                {!notice.read && (
                  <Action
                    disabled={busy || resource.loading}
                    onClick={() => void read(notice.id)}
                  >
                    Mark read
                  </Action>
                )}
              </li>
            ))}
          </ul>
          {resource.data.next && (
            <Link
              to={
                "/notifications?after=" + encodeURIComponent(resource.data.next)
              }
            >
              Next notices
            </Link>
          )}
        </>
      )}
      {params.get("after") && <Link to="/notifications">Newest activity</Link>}
    </section>
  );
}
