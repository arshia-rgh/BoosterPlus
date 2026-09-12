import { Link, useSearchParams } from "react-router";
import { Action, ErrorNotice, Select } from "../catalog/controls";
import { useResource } from "../orders/resource";
import { conversationsSchema } from "./model";
import Deliveries from "./deliveries";
import NewSupport from "./new";
export default function Inbox({ admin = false }: { admin?: boolean }) {
  const [params, setParams] = useSearchParams(),
    state = params.get("state") ?? "",
    assigned = params.get("assigned") ?? "",
    customer = admin ? (params.get("customer") ?? "") : "",
    after = params.get("after") ?? "";
  const base = (admin ? "/admin" : "") + "/support",
    resource = useResource(
      (admin ? "/admin" : "") +
        `/conversations?${new URLSearchParams({ state, assigned, after, customer }).toString()}`,
      conversationsSchema,
    );
  return (
    <section>
      <h2>{admin ? "Support inbox" : "Your conversations"}</h2>
      {!admin && <NewSupport />}
      {admin && customer && (
        <p>
          Customer filter: {customer}{" "}
          <Action
            onClick={() => {
              setParams({ state, assigned });
            }}
          >
            Clear customer filter
          </Action>
        </p>
      )}
      <div className="catalog-grid">
        <Select
          label="Conversation status"
          value={state}
          options={[
            ["", "All statuses"],
            ["open", "Needs staff reply"],
            ["waiting", "Waiting for customer"],
            ["resolved", "Resolved"],
          ]}
          change={(value) => {
            setParams({ state: value, assigned, customer });
          }}
        />
        {admin && (
          <Select
            label="Staff assignment"
            value={assigned}
            options={[
              ["", "All assignments"],
              ["me", "Assigned to me"],
              ["unassigned", "Unassigned"],
            ]}
            change={(value) => {
              setParams({ state, assigned: value, customer });
            }}
          />
        )}
        <Action onClick={resource.reload}>Refresh inbox</Action>
      </div>
      <ErrorNotice error={resource.error} />
      {!resource.data ? (
        <p role="status">
          {resource.loading
            ? "Loading conversations…"
            : "Conversations could not be loaded. Use Refresh inbox to try again."}
        </p>
      ) : (
        <>
          {resource.data.conversations.length === 0 && (
            <p>No matching conversations.</p>
          )}
          <ul className="order-list">
            {resource.data.conversations.map((thread) => (
              <li key={thread.id}>
                <Link to={base + "/" + thread.id}>
                  <strong>{thread.subject}</strong>
                  <span>
                    {thread.kind === "order" ? "Order support" : "Pre-sales"} ·{" "}
                    {thread.state} · {thread.unread} unread
                  </span>
                </Link>
                <time dateTime={thread.updated_at}>
                  {new Date(thread.updated_at).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
          {resource.data.next && (
            <Link
              to={
                base +
                "?" +
                new URLSearchParams({
                  customer,
                  state,
                  assigned,
                  after: resource.data.next,
                }).toString()
              }
            >
              Next conversations
            </Link>
          )}
        </>
      )}
      {admin && <Deliveries />}
    </section>
  );
}
