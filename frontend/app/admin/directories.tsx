import { Confirmation } from "../ui/form-validation";
import { DirectoryFilters, useDirectoryFilters } from "./directory-filters";
import { Link } from "../portal-router";
import { z } from "../validation";
import { Action, ErrorNotice } from "../catalog/controls";
import { Form } from "../identity/identity";
import { command } from "../identity/api";
import { useResource } from "../orders/resource";
import { subscriptionSchema } from "../availability/model";
const fileSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  conversation_id: z.string(),
  order_id: z.string(),
  state: z.string(),
  bound: z.boolean(),
  size: z.number(),
  content_type: z.string(),
  created_at: z.string(),
  expires_at: z.string(),
  purged_at: z.string().nullable(),
});
const mediaSchema = z.object({ files: z.array(fileSchema), next: z.string() });
const alertsSchema = z.object({
  subscriptions: z.array(
    z.object({
      subscription: subscriptionSchema,
      user_id: z.string(),
      consent_version: z.string(),
      suppression_reason: z.string(),
      delivery_state: z.string(),
      last_sent_at: z.string().nullable(),
    }),
  ),
  next: z.string(),
});
export function MediaDirectory() {
  const { query, after, setAfter, apply } = useDirectoryFilters();
  const resource = useResource("/admin/media?" + query, mediaSchema);
  return (
    <section>
      <h2>Private media lifecycle</h2>
      <p>
        Review scan and cleanup state. Retry restarts an exhausted scan; it
        never marks a file clean. Only unattached uploads can be removed here.
        Bound evidence follows the reviewed privacy and retention workflow.
        Actions require recent staff verification.
      </p>
      <DirectoryFilters
        key={query}
        query={query}
        apply={apply}
        customerLabel="Uploader account ID"
        states={[
          "pending",
          "uploaded",
          "queued",
          "ready",
          "rejected",
          "deleted",
        ]}
      />
      <Action onClick={resource.reload}>Refresh media</Action>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Loading matching records…</p>}
      {resource.data?.files.map((file) => (
        <article className="identity-card" key={file.id}>
          <h3>File {file.id}</h3>
          <p>
            {file.content_type} · {file.size} bytes · {file.state} ·{" "}
            {file.bound ? "Bound evidence" : "Unattached upload"}
          </p>
          <p>Uploader account {file.user_id}</p>
          <p>
            {file.state === "deleted"
              ? file.purged_at
                ? "Object purge confirmed"
                : "Object purge pending"
              : file.purged_at
                ? "Quarantine cleanup confirmed"
                : "Quarantine cleanup pending"}
          </p>
          {file.order_id ? (
            <Link
              to={`/admin/orders/${file.order_id}?section=request`}
              state={{ mediaSearch: query }}
            >
              View source order
            </Link>
          ) : file.conversation_id ? (
            <Link
              to={"/admin/support/" + file.conversation_id}
              state={{ mediaSearch: query }}
            >
              Open authorized conversation
            </Link>
          ) : (
            <p>This upload is not attached to a source record.</p>
          )}
          {!file.bound && file.state !== "deleted" && (
            <Form
              title="Remove unattached upload"
              submit={async () => {
                await command("/admin/media/" + file.id + "/remove", {});
                resource.reload();
              }}
            >
              <Confirmation>
                Revoke this unattached file and queue object cleanup
              </Confirmation>
            </Form>
          )}
          {!file.bound && file.state === "queued" && (
            <Form
              title="Retry exhausted scan"
              submit={async () => {
                await command("/admin/media/" + file.id + "/retry", {});
                resource.reload();
              }}
            >
              <p>
                The server rejects retries while a scan is active or when the
                upload has expired.
              </p>
            </Form>
          )}
        </article>
      ))}
      {resource.data?.files.length === 0 && <p>No matching media.</p>}
      {resource.data?.next && (
        <Action
          onClick={() => {
            setAfter(resource.data?.next ?? "");
          }}
        >
          Next media
        </Action>
      )}
      {after && (
        <Action
          onClick={() => {
            setAfter("");
          }}
        >
          First media
        </Action>
      )}
    </section>
  );
}
export function AlertDirectory() {
  const { query, after, setAfter, apply } = useDirectoryFilters();
  const resource = useResource("/admin/availability?" + query, alertsSchema);
  return (
    <section>
      <h2>Availability consent and delivery</h2>
      <p>
        Inspect explicit consent, current availability and the latest delivery
        state. Staff can suppress delivery; only the customer can provide new
        consent.
      </p>
      <DirectoryFilters
        key={query}
        query={query}
        apply={apply}
        states={["active", "suppressed", "unsubscribed"]}
      />
      <Action onClick={resource.reload}>Refresh alerts</Action>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Loading matching records…</p>}
      {resource.data?.subscriptions.map((item) => (
        <article className="identity-card" key={item.subscription.id}>
          <h3>{item.subscription.label}</h3>
          <p>
            Customer {item.user_id} · {item.subscription.state} · consent{" "}
            {item.consent_version}
          </p>
          <p>
            Latest delivery: {item.delivery_state || "None"}
            {item.last_sent_at
              ? " · " + new Date(item.last_sent_at).toLocaleString()
              : ""}
          </p>
          <p>{item.suppression_reason}</p>
          {item.subscription.state === "active" && (
            <Form
              title="Suppress availability emails"
              submit={async () => {
                await command(
                  "/admin/availability/" + item.subscription.id + "/suppress",
                  { version: item.subscription.version },
                );
                resource.reload();
              }}
            >
              <Confirmation>
                Stop future deliveries for this subscription
              </Confirmation>
            </Form>
          )}
        </article>
      ))}
      {resource.data?.subscriptions.length === 0 && (
        <p>No matching subscriptions.</p>
      )}
      {resource.data?.next && (
        <Action
          onClick={() => {
            setAfter(resource.data?.next ?? "");
          }}
        >
          Next subscriptions
        </Action>
      )}
      {after && (
        <Action
          onClick={() => {
            setAfter("");
          }}
        >
          First subscriptions
        </Action>
      )}
    </section>
  );
}
