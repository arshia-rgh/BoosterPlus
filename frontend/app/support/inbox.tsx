import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Action, ErrorNotice, Select, Text } from "../catalog/controls";
import { useResource } from "../orders/resource";
import { conversationsSchema } from "./model";
import Deliveries from "./deliveries";
import NewSupport from "./new";
import { kindLabel, stateLabel } from "./chat-state";
import "./chat.css";

type Filters = {
  state: string;
  assigned: string;
  customer: string;
  search: string;
  kind: string;
  unread: string;
};
function InboxFilters({
  value,
  admin,
  apply,
}: {
  value: Filters;
  admin: boolean;
  apply: (next: Filters) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <form
      className="chat-inbox-filters"
      onSubmit={(event) => {
        event.preventDefault();
        apply(draft);
      }}
    >
      <Text
        label="Search conversations"
        value={draft.search}
        change={(search) => {
          setDraft({ ...draft, search });
        }}
        help="Search a subject or full order, submission or conversation reference. Message contents are private and are not searched."
      />
      <Select
        label="Conversation status"
        value={draft.state}
        options={[
          ["", "All statuses"],
          ["open", "Needs staff reply"],
          ["waiting", "Waiting for customer"],
          ["resolved", "Resolved"],
        ]}
        change={(state) => {
          setDraft({ ...draft, state });
        }}
      />
      <Select
        label="Conversation type"
        value={draft.kind}
        options={[
          ["", "All conversations"],
          ["order", "Private order support"],
          ["submission", "Private seller review"],
          ["presales", "Pre-sales support"],
          ["fulfillment", "Shared boosting coordination"],
        ]}
        change={(kind) => {
          setDraft({ ...draft, kind });
        }}
      />
      <Select
        label="Read status"
        value={draft.unread}
        options={[
          ["", "All messages"],
          ["true", "Unread only"],
        ]}
        change={(unread) => {
          setDraft({ ...draft, unread });
        }}
      />
      {admin && (
        <Select
          label="Staff assignment"
          value={draft.assigned}
          options={[
            ["", "All assignments"],
            ["me", "Assigned to me"],
            ["unassigned", "Unassigned"],
          ]}
          change={(assigned) => {
            setDraft({ ...draft, assigned });
          }}
        />
      )}
      <button className="button" type="submit">
        Search conversations
      </button>
    </form>
  );
}
export default function Inbox({ admin = false }: { admin?: boolean }) {
  const [params, setParams] = useSearchParams();
  const filters: Filters = {
    state: params.get("state") ?? "",
    assigned: admin ? (params.get("assigned") ?? "") : "",
    customer: admin ? (params.get("customer") ?? "") : "",
    search: params.get("search") ?? "",
    kind: params.get("kind") ?? "",
    unread: params.get("unread") ?? "",
  };
  const after = params.get("after") ?? "",
    base = (admin ? "/admin" : "") + "/support",
    query = new URLSearchParams({ ...filters, after }).toString();
  const resource = useResource(
    (admin ? "/admin" : "") + "/conversations?" + query,
    conversationsSchema,
  );
  const heading = useRef<HTMLHeadingElement>(null),
    lastQuery = useRef(query),
    focusResult = useRef(false);
  useEffect(() => {
    if (lastQuery.current !== query) {
      lastQuery.current = query;
      focusResult.current = true;
    }
    if (focusResult.current && !resource.loading) {
      focusResult.current = false;
      heading.current?.focus();
    }
  }, [query, resource.loading]);
  const filtered = Object.values(filters).some(Boolean);
  return (
    <section className="chat-inbox">
      <div className="chat-inbox-heading">
        <h2>{admin ? "Support inbox" : "Your conversations"}</h2>
        <span className="quiet">
          Private support, seller reviews and shared coordination have separate
          audiences.
        </span>
      </div>
      {!admin && (
        <details
          open={/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
            params.get("listing") ?? "",
          )}
        >
          <summary>New conversation</summary>
          <NewSupport />
        </details>
      )}
      {admin && filters.customer && (
        <p>
          Customer filter: {filters.customer}{" "}
          <Action
            onClick={() => {
              setParams({ ...filters, customer: "" });
            }}
          >
            Clear customer filter
          </Action>
        </p>
      )}
      <InboxFilters
        key={JSON.stringify(filters)}
        value={filters}
        admin={admin}
        apply={(next) => {
          setParams({ ...next, search: next.search.trim() });
        }}
      />
      <div className="chat-inbox-actions">
        <Action disabled={resource.loading} onClick={resource.reload}>
          {resource.loading ? "Refreshing inbox…" : "Refresh inbox"}
        </Action>
        {filtered && (
          <Action
            onClick={() => {
              setParams({});
            }}
          >
            Clear filters
          </Action>
        )}
        {after && (
          <Link to={base + "?" + new URLSearchParams(filters).toString()}>
            First conversations
          </Link>
        )}
      </div>
      <ErrorNotice error={resource.error} />
      <h3 ref={heading} tabIndex={-1} className="sr-only">
        Conversation results
      </h3>
      {!resource.data ? (
        <p role="status">
          {resource.loading
            ? "Loading conversations…"
            : "Conversations could not be loaded. Use Refresh inbox to try again."}
        </p>
      ) : (
        <>
          <p className="quiet" role="status">
            {resource.data.conversations.length === 0
              ? filtered
                ? "No conversations match these filters. Clear or change the filters to see more."
                : after
                  ? "No more conversations on this page. Return to the first conversations."
                  : "No conversations yet. Start a conversation when you need help."
              : `Showing ${String(resource.data.conversations.length)} conversations${resource.data.next ? " · more available" : ""}.`}
          </p>
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
                    {(thread.order_id || thread.linked_order_id) && (
                      <small>
                        Order{" "}
                        {(thread.order_id || thread.linked_order_id).slice(
                          0,
                          8,
                        )}
                      </small>
                    )}
                    {thread.submission_id && (
                      <small>
                        Submission {thread.submission_id.slice(0, 8)}
                      </small>
                    )}
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
                  ...filters,
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
