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
      <h2>Account activity</h2>
      <p>
        Email preferences are available in your profile. Updates stay here when
        email is disabled.
      </p>
      <Action onClick={resource.reload}>Refresh activity</Action>
      <ErrorNotice error={resource.error ?? error} />
      {!resource.data ? (
        <p role="status">Loading activity…</p>
      ) : (
        <>
          {resource.data.notifications.length === 0 && (
            <p>No activity notices yet.</p>
          )}
          <ul className="order-list">
            {resource.data.notifications.map((notice) => (
              <li key={notice.id}>
                <Link to={notice.href}>
                  {notice.kind === "submission_seller"
                    ? "Account submission updated"
                    : notice.kind === "order_customer"
                      ? "Order updated"
                      : "New support reply"}{" "}
                  · {notice.read ? "Read" : "Unread"}
                </Link>
                <time dateTime={notice.created_at}>
                  {new Date(notice.created_at).toLocaleString()}
                </time>
                {!notice.read && (
                  <Action disabled={busy} onClick={() => void read(notice.id)}>
                    Mark read
                  </Action>
                )}
              </li>
            ))}
          </ul>
          {resource.data.next && (
            <Link to={"/notifications?after=" + resource.data.next}>
              Next notices
            </Link>
          )}
        </>
      )}
    </section>
  );
}
