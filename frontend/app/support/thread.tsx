import { useCallback, useEffect, useState, type SubmitEvent } from "react";
import { Link, useParams } from "react-router";
import { z } from "../validation";
import { command, post, userSchema } from "../identity/api";
import { Action, ErrorNotice, Select, Text } from "../catalog/controls";
import { useResource } from "../orders/resource";
import {
  conversationsSchema,
  conversationSchema,
  messageSchema,
  messagesSchema,
  type Conversation,
} from "./model";
import { UploadImage, DownloadImage } from "../media/attachment";
const staffSchema = z.object({ users: z.array(userSchema) });
function StaffControls({
  thread,
  done,
}: {
  thread: Conversation;
  done: () => void;
}) {
  const staff = useResource("/admin/users", staffSchema),
    [state, setState] = useState(thread.state),
    [assigned, setAssigned] = useState(thread.assigned_to ?? ""),
    [order, setOrder] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function change(action: string) {
    setBusy(true);
    setError(null);
    try {
      await post(
        `/admin/conversations/${thread.id}/${action}`,
        {
          version: thread.version,
          state: action === "state" ? state : "",
          assigned_to: action === "assign" ? assigned : "",
          order_id: action === "link" ? order : "",
          ...(action === "sharing"
            ? { booster_shared: !thread.booster_shared }
            : {}),
        },
        conversationSchema,
      );
      done();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="catalog-section">
      <h2>Manage conversation</h2>
      <fieldset disabled={busy}>
        <legend>Staff controls</legend>
        <Select
          label="Set conversation status"
          value={state}
          change={(value) => {
            if (value === "open" || value === "waiting" || value === "resolved")
              setState(value);
          }}
          options={[
            ["open", "Needs staff reply"],
            ["waiting", "Waiting for customer"],
            ["resolved", "Resolved"],
          ]}
        />
        <Action onClick={() => void change("state")}>
          Save conversation status
        </Action>
        <Select
          label="Assign support staff"
          value={assigned}
          change={setAssigned}
          options={[
            ["", "Unassigned"],
            ...(staff.data?.users
              .filter(
                (user) =>
                  ["administrator", "owner"].includes(user.role) &&
                  user.mfa_enabled &&
                  !user.suspended,
              )
              .map(
                (user) =>
                  [
                    user.id,
                    user.staff_alias || user.display_name || user.email,
                  ] as const,
              ) ?? []),
          ]}
        />
        <Action disabled={!staff.data} onClick={() => void change("assign")}>
          Save assignment
        </Action>
        {thread.kind === "fulfillment" && (
          <Action onClick={() => void change("sharing")}>
            {thread.booster_shared
              ? "Pause booster sharing"
              : "Resume booster sharing"}
          </Action>
        )}
        {thread.kind === "presales" && !thread.linked_order_id && (
          <>
            <Text
              label="Link to customer order ID"
              value={order}
              change={setOrder}
              help="The order must belong to this conversation’s customer. The original conversation is preserved."
            />
            <Action
              disabled={!order.trim()}
              onClick={() => void change("link")}
            >
              Link order
            </Action>
          </>
        )}
      </fieldset>
      <ErrorNotice error={error ?? staff.error} />
    </section>
  );
}
function Compose({
  base,
  admin,
  proofAllowed,
  done,
}: {
  base: string;
  admin: boolean;
  proofAllowed: boolean;
  done: () => void;
}) {
  const [purpose, setPurpose] = useState("message");
  const [body, setBody] = useState(""),
    [visibility, setVisibility] = useState("public"),
    [key, setKey] = useState(() => crypto.randomUUID()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const [attachment, setAttachment] = useState("");
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadVersion, setUploadVersion] = useState(0);
  const changeAttachment = useCallback((id: string, pending: boolean) => {
    setAttachment(id);
    setUploadPending(pending);
    setKey(crypto.randomUUID());
  }, []);
  async function send(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await post(
        base + "/messages",
        {
          request_key: key,
          purpose,
          body,
          visibility,
          attachments: attachment ? [attachment] : [],
        },
        messageSchema,
      );
      setBody("");
      setAttachment("");
      setUploadPending(false);
      setUploadVersion((v) => v + 1);
      setKey(crypto.randomUUID());
      done();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="catalog-section" onSubmit={(event) => void send(event)}>
      <fieldset disabled={busy}>
        <legend>
          {visibility === "internal" ? "Internal staff note" : "Send a message"}
        </legend>
        <p>
          Messages are private to this conversation. Do not send game passwords,
          recovery codes, or payment secrets here.
        </p>
        {admin && (
          <Select
            label="Message audience"
            value={visibility}
            change={(value) => {
              setVisibility(value);
              setPurpose("message");
              setAttachment("");
              setUploadPending(false);
              setKey(crypto.randomUUID());
            }}
            options={[
              ["public", "Customer-visible reply"],
              ["internal", "Internal staff note"],
            ]}
          />
        )}
        {proofAllowed && visibility === "public" && (
          <Select
            label="Message type"
            value={purpose}
            change={(value) => {
              setPurpose(value);
              setKey(crypto.randomUUID());
            }}
            options={[
              ["message", "Coordination message"],
              ["proof", "Publish proof images"],
            ]}
          />
        )}
        <Text
          label={visibility === "internal" ? "Internal note" : "Message"}
          value={body}
          change={(value) => {
            setBody(value);
            setKey(crypto.randomUUID());
          }}
          multiline
        />
        <p className="quiet">Up to 4,000 characters.</p>
        <UploadImage
          key={visibility + String(uploadVersion)}
          conversation={base.split("/").at(-1) ?? ""}
          admin={admin}
          visibility={visibility}
          change={changeAttachment}
        />
        <button
          className="button"
          type="submit"
          disabled={
            !body.trim() ||
            uploadPending ||
            (purpose === "proof" && !attachment)
          }
        >
          {busy
            ? "Sending…"
            : visibility === "internal"
              ? "Save internal note"
              : purpose === "proof"
                ? "Publish proof"
                : "Send message"}
        </button>
      </fieldset>
      <ErrorNotice error={error} />
    </form>
  );
}
function Messages({
  thread,
  admin,
  booster,
  refresh,
}: {
  thread: Conversation;
  admin: boolean;
  booster: boolean;
  refresh: () => void;
}) {
  const base = (admin ? "/admin" : "") + "/conversations/" + thread.id,
    [before, setBefore] = useState(0),
    [live, setLive] = useState(false),
    [error, setError] = useState<unknown>(null);
  const resource = useResource(
      base + `/messages?before=${String(before)}`,
      messagesSchema,
    ),
    reload = resource.reload;
  const last = resource.data?.messages.at(-1)?.sequence ?? 0;
  useEffect(() => {
    if (!last || document.visibilityState !== "visible") return;
    let active = true;
    void command(base + "/read", { sequence: last })
      .then(() => {
        if (active) refresh();
      })
      .catch((cause: unknown) => {
        if (active) setError(cause);
      });
    return () => {
      active = false;
    };
  }, [base, last, refresh]);
  useEffect(() => {
    let source: EventSource | null = null;
    if (typeof EventSource !== "undefined") {
      source = new EventSource(
        "/api/v1" + base + "/stream?after=" + String(thread.version),
      );
      source.onopen = () => {
        setLive(true);
      };
      source.onerror = () => {
        setLive(false);
        refresh();
      };
      source.addEventListener("change", () => {
        reload();
        refresh();
      });
    }
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") {
        reload();
        refresh();
      }
    }, 10000);
    return () => {
      source?.close();
      clearInterval(poll);
    };
  }, [base, thread.version, reload, refresh]);
  function sent() {
    setBefore(0);
    reload();
    refresh();
  }
  return (
    <>
      <section className="catalog-section" aria-label="Conversation messages">
        <h2>Messages</h2>
        <p role="status">
          {live
            ? "Live updates connected"
            : "Updates refresh automatically; reconnecting live updates…"}
        </p>
        <Action
          onClick={() => {
            reload();
            refresh();
          }}
        >
          Refresh conversation
        </Action>
        <ErrorNotice error={resource.error ?? error} />
        {!resource.data || resource.error ? (
          <p role="status">
            {resource.error ? "Messages are unavailable." : "Loading messages…"}
          </p>
        ) : (
          <>
            {resource.data.messages.length === 0 && (
              <p>No messages yet. Introduce your question below.</p>
            )}
            {resource.data.next > 0 && (
              <Action
                onClick={() => {
                  setBefore(resource.data?.next ?? 0);
                }}
              >
                Earlier messages
              </Action>
            )}
            {before > 0 && (
              <Action
                onClick={() => {
                  setBefore(0);
                }}
              >
                Latest messages
              </Action>
            )}
            <ol className="message-list">
              {resource.data.messages.map((message) => (
                <li
                  key={message.id}
                  data-sender={message.sender_role}
                  className={
                    message.visibility === "internal"
                      ? "message internal-note"
                      : "message"
                  }
                >
                  <div className="message-meta">
                    <strong>{message.sender_label}</strong>
                    {message.purpose === "proof" && (
                      <span className="status">Published proof</span>
                    )}
                    {message.visibility === "internal" && (
                      <span className="status">Internal · staff only</span>
                    )}
                    <time dateTime={message.created_at}>
                      {new Date(message.created_at).toLocaleString()}
                    </time>
                  </div>
                  <p>{message.body}</p>
                  {message.attachments?.map((id) => (
                    <DownloadImage key={id} id={id} admin={admin} />
                  ))}
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
      <Compose
        base={base}
        admin={admin}
        proofAllowed={(admin || booster) && thread.kind === "fulfillment"}
        done={sent}
      />
    </>
  );
}
function ConversationRail({
  current,
  admin,
}: {
  current: string;
  admin: boolean;
}) {
  const prefix = admin ? "/admin" : "";
  const resource = useResource(prefix + "/conversations", conversationsSchema);
  return (
    <aside
      className={
        admin ? "admin-conversation-rail" : "customer-conversation-rail"
      }
      aria-label="Conversation switcher"
    >
      <details open>
        <summary>Recent conversations</summary>
        <ErrorNotice error={resource.error} />
        {resource.loading && <p role="status">Loading inbox…</p>}
        {!resource.error && resource.data && (
          <nav aria-label="Recent conversations">
            {resource.data.conversations.map((thread) => (
              <Link
                key={thread.id}
                to={`${prefix}/support/${thread.id}`}
                aria-current={current === thread.id ? "page" : undefined}
              >
                <strong>{thread.subject}</strong>
                <small>
                  {thread.state} · {thread.unread} unread
                </small>
              </Link>
            ))}
          </nav>
        )}
        <Action onClick={resource.reload}>Refresh recent conversations</Action>
        <Link to={prefix + "/support"}>All conversations and filters →</Link>
      </details>
    </aside>
  );
}
export default function Thread({
  admin = false,
  booster = false,
}: {
  admin?: boolean;
  booster?: boolean;
}) {
  const { id = "" } = useParams(),
    base = (admin ? "/admin" : "") + "/conversations/" + encodeURIComponent(id),
    resource = useResource(base, conversationSchema),
    thread = resource.error ? null : resource.data;
  const retry = resource.reload;
  useEffect(() => {
    // Listen before any failed-request render: an online event can arrive before
    // that render's passive effects run. Recovery also invalidates stale reads.
    window.addEventListener("online", retry);
    return () => {
      window.removeEventListener("online", retry);
    };
  }, [retry]);
  useEffect(() => {
    if (!resource.error || resource.loading) return;
    // Keep recovery outside Messages, which unmounts to conceal private data on failure.
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") retry();
    }, 10000);
    return () => {
      clearInterval(poll);
    };
  }, [resource.error, resource.loading, retry]);
  return (
    <div
      className={
        admin
          ? "admin-conversation-workspace"
          : !booster
            ? "customer-conversation-workspace"
            : undefined
      }
    >
      {!booster && <ConversationRail current={id} admin={admin} />}
      <section>
        <Link
          to={
            booster ? "/booster/orders" : (admin ? "/admin" : "") + "/support"
          }
        >
          ← {booster ? "Assigned work" : "Conversations"}
        </Link>
        <ErrorNotice error={resource.error} />
        {!!resource.error && (
          <Action disabled={resource.loading} onClick={retry}>
            Retry conversation access
          </Action>
        )}
        {!thread ? (
          <p role="status">
            {resource.error
              ? "Conversation access is unavailable."
              : "Loading conversation…"}
          </p>
        ) : (
          <>
            <h2>{thread.subject}</h2>
            <p>
              {thread.kind === "fulfillment"
                ? "Shared boosting coordination"
                : thread.kind === "presales"
                  ? "Pre-sales support"
                  : thread.kind === "submission"
                    ? "Private seller review"
                    : "Order support"}{" "}
              · {thread.state} · {thread.unread} unread
            </p>
            {thread.submission_id && (
              <Link
                to={
                  (admin ? "/admin/submissions/" : "/sell/") +
                  thread.submission_id
                }
              >
                View account submission
              </Link>
            )}
            {(thread.order_id || thread.linked_order_id) && (
              <Link
                to={
                  (booster ? "/booster" : admin ? "/admin" : "") +
                  "/orders/" +
                  (thread.order_id || thread.linked_order_id)
                }
              >
                View linked order
              </Link>
            )}
            {thread.kind === "fulfillment" && (
              <p>
                {thread.booster_shared
                  ? "The currently assigned booster can read shared messages and proof. Internal notes stay restricted to administrators."
                  : "Booster sharing is paused. Customer and administrator history is retained."}
              </p>
            )}
            <div className={admin ? "conversation-layout" : undefined}>
              <div>
                <Messages
                  key={thread.id}
                  thread={thread}
                  admin={admin}
                  booster={booster}
                  refresh={resource.reload}
                />
              </div>
              {admin && (
                <StaffControls
                  key={`staff-${String(thread.version)}`}
                  thread={thread}
                  done={resource.reload}
                />
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
