import { Link, Navigate, useParams } from "../portal-router";
import Identity from "../identity/identity";
import { Action, ErrorNotice } from "../catalog/controls";
import { useResource } from "../orders/resource";
import { conversationSchema } from "../support/model";
import { z } from "../validation";
function AssignmentConversation() {
  const { id = "" } = useParams();
  const thread = useResource(
    `/conversations/${encodeURIComponent(id)}`,
    conversationSchema,
  );
  const order = z.uuid().safeParse(thread.data?.order_id);
  if (
    thread.data?.kind === "fulfillment" &&
    thread.data.booster_shared &&
    order.success &&
    !thread.error
  )
    return (
      <Navigate replace to={`/booster/orders/${order.data}?section=messages`} />
    );
  return (
    <section aria-label="Assignment conversation access">
      <ErrorNotice error={thread.error} />
      <p role="status">
        {thread.loading
          ? "Finding the assignment for this conversation…"
          : "This conversation is unavailable to your current booster session."}
      </p>
      <Action disabled={thread.loading} onClick={thread.reload}>
        Check conversation access
      </Action>
      <Link to="/booster/orders">Return to assigned work</Link>
    </section>
  );
}
export function meta() {
  return [{ title: "Assigned coordination — PLAYORA" }];
}
export default function Page() {
  return (
    <Identity title="Assigned coordination" capability="booster">
      <AssignmentConversation />
    </Identity>
  );
}
