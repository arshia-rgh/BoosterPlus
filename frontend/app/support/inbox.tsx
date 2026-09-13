import { Link, useSearchParams } from "react-router";
import { Action, ErrorNotice, Select } from "../catalog/controls";
import { useResource } from "../orders/resource";
import { conversationsSchema } from "./model";
import Deliveries from "./deliveries";
import NewSupport from "./new";
import { kindLabel, stateLabel } from "./chat-state";
import "./chat.css";
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
    <section className="chat-inbox">
      <div className="chat-inbox-heading">
        <h2>{admin ? "Support inbox" : "Your conversations"}</h2>
        <span className="quiet">Private conversations, all in one place.</span>
      </div>
      {!admin && (
        <details>
          <summary>New conversation</summary>
          <NewSupport />
        </details>
      )}
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
      <div className="chat-inbox-filters">
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
            <p>
              {state || assigned || customer
                ? "No conversations match these filters. Change a filter to see more."
                : "No conversations yet. Start a conversation when you need help."}
            </p>
          )}
          <ul className="chat-inbox-list">
            {resource.data.conversations.map((thread) => (
              <li key={thread.id}>
                <Link
                  to={base + "/" + thread.id}
                  state={{ inboxSearch: params.toString() }}
                >
                  <span>
                    <strong>{thread.subject}</strong>
                    <small>
                      {kindLabel(thread.kind)} · {stateLabel(thread.state)}
                    </small>
                  </span>
                  {!!thread.unread && (
                    <span className="chat-unread">{thread.unread} unread</span>
                  )}
                  <time dateTime={thread.updated_at}>
                    {new Date(thread.updated_at).toLocaleString()}
                  </time>
                </Link>
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
      {admin && (
        <details>
          <summary>Notification delivery history</summary>
          <Deliveries />
        </details>
      )}
    </section>
  );
}
