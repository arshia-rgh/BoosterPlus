import { useState } from "react";
import { z } from "../validation";
import { Action, ErrorNotice } from "../catalog/controls";
import { command } from "../identity/api";
import { useResource } from "../orders/resource";
const schema = z.object({
  deliveries: z.array(
    z.object({
      id: z.string(),
      state: z.string(),
      attempts: z.number(),
      last_error: z.string(),
      created_at: z.string(),
    }),
  ),
});
export default function Deliveries() {
  const resource = useResource("/admin/notifications/deliveries", schema),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function retry(id: string) {
    setBusy(true);
    setError(null);
    try {
      await command(`/admin/notifications/deliveries/${id}/retry`);
      resource.reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="catalog-section">
      <h2>Activity email delivery</h2>
      <p>
        Up to 50 recent pending or failed deliveries. A retry requires recent
        sign-in and authenticator verification. An email provider may have
        accepted a delivery before a timeout; retries can produce duplicate
        emails.
      </p>
      <Action onClick={resource.reload}>Refresh deliveries</Action>
      <ErrorNotice error={resource.error ?? error} />
      {resource.data?.deliveries.length === 0 && (
        <p>No pending or failed activity emails.</p>
      )}
      <ul className="order-list">
        {resource.data?.deliveries.map((delivery) => (
          <li key={delivery.id}>
            <span>
              {delivery.state} · {delivery.attempts} attempts ·{" "}
              {delivery.last_error || "No recorded failure"}
            </span>
            <time dateTime={delivery.created_at}>
              {new Date(delivery.created_at).toLocaleString()}
            </time>
            {delivery.state === "failed" && (
              <Action disabled={busy} onClick={() => void retry(delivery.id)}>
                Retry delivery
              </Action>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
