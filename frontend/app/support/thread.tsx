import { useCallback, useEffect, useState, type SubmitEvent } from "react";
import { Link, useParams } from "react-router";
import { z } from "zod";
import { command, post, userSchema } from "../identity/api";
import { Action, ErrorNotice, Select, Text } from "../catalog/controls";
import { useResource } from "../orders/resource";
import {
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
  done,
}: {
  base: string;
  admin: boolean;
  done: () => void;
}) {
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
          disabled={!body.trim() || uploadPending}
        >
          {busy
            ? "Sending…"
            : visibility === "internal"
              ? "Save internal note"
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
  refresh,
}: {
  thread: Conversation;
  admin: boolean;
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
        {!resource.data ? (
          <p role="status">Loading messages…</p>
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
                  className={
                    message.visibility === "internal"
                      ? "message internal-note"
                      : "message"
                  }
                >
                  <div className="message-meta">
                    <strong>{message.sender_label}</strong>
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
      <Compose base={base} admin={admin} done={sent} />
    </>
  );
}
export default function Thread({ admin = false }: { admin?: boolean }) {
  const { id = "" } = useParams(),
    base = (admin ? "/admin" : "") + "/conversations/" + encodeURIComponent(id),
    resource = useResource(base, conversationSchema),
    thread = resource.data;
  return (
    <section>
      <Link to={(admin ? "/admin" : "") + "/support"}>← Conversations</Link>
      <ErrorNotice error={resource.error} />
      {!thread ? (
        <p role="status">Loading conversation…</p>
      ) : (
        <>
          <h2>{thread.subject}</h2>
          <p>
            {thread.kind === "presales" ? "Pre-sales support" : "Order support"}{" "}
            · {thread.state} · {thread.unread} unread
          </p>
          {(thread.order_id || thread.linked_order_id) && (
            <Link
              to={
                (admin ? "/admin" : "") +
                "/orders/" +
                (thread.order_id || thread.linked_order_id)
              }
            >
              View linked order
            </Link>
          )}
          <Messages
            key={thread.id}
            thread={thread}
            admin={admin}
            refresh={resource.reload}
          />
          {admin && (
            <StaffControls
              key={`staff-${String(thread.version)}`}
              thread={thread}
              done={resource.reload}
            />
          )}
        </>
      )}
    </section>
  );
}
