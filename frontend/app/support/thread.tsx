import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useParams } from "react-router";
import { z } from "../validation";
import { command } from "../identity/api";
import { AuthorizedIdentity } from "../identity/frame";
import { Action, ErrorNotice } from "../catalog/controls";
import { useResource } from "../orders/resource";
import { conversationsSchema, type Conversation } from "./model";
import { DownloadImage } from "../media/attachment";
import { kindLabel, readingPosition, stateLabel } from "./chat-state";
import { useChat } from "./use-chat";
import Composer from "./composer";
import StaffControls from "./staff-controls";
import "./chat.css";

function ConversationRail({
  current,
  admin,
  active,
}: {
  current: string;
  admin: boolean;
  active: Conversation | null;
}) {
  const prefix = admin ? "/admin" : "";
  const resource = useResource(prefix + "/conversations", conversationsSchema);
  return (
    <aside className="chat-rail" aria-label="Conversation switcher">
      <div className="chat-rail-heading">
        <strong>Inbox</strong>
        <Link to={prefix + "/support"}>All conversations</Link>
      </div>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Loading inbox…</p>}
      <nav aria-label="Recent conversations">
        {resource.data?.conversations.map((item) => {
          const thread = item.id === current && active ? active : item;
          return (
            <Link
              key={thread.id}
              to={`${prefix}/support/${thread.id}`}
              aria-current={current === thread.id ? "page" : undefined}
            >
              <strong>{thread.subject}</strong>
              <small>{stateLabel(thread.state)}</small>
              {!!thread.unread && (
                <span className="chat-unread">{thread.unread} unread</span>
              )}
            </Link>
          );
        })}
      </nav>
      <Action onClick={resource.reload}>Refresh recent conversations</Action>
    </aside>
  );
}
function ContextLinks({
  thread,
  admin,
  booster,
}: {
  thread: Conversation;
  admin: boolean;
  booster: boolean;
}) {
  const location = useLocation();
  const source = z
    .object({ orderListSearch: z.string().max(2048) })
    .safeParse(location.state);
  return (
    <>
      <p>
        {kindLabel(thread.kind)} · {thread.state} · {thread.unread} unread
      </p>
      {thread.submission_id && (
        <Link
          to={(admin ? "/admin/submissions/" : "/sell/") + thread.submission_id}
        >
          View account submission
        </Link>
      )}
      {(thread.order_id || thread.linked_order_id) && (
        <Link
          state={source.success ? source.data : null}
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
    </>
  );
}
function ThreadSession({
  id,
  admin,
  booster,
}: {
  id: string;
  admin: boolean;
  booster: boolean;
}) {
  const base =
    (admin ? "/admin" : "") + "/conversations/" + encodeURIComponent(id);
  const identity = useContext(AuthorizedIdentity);
  const user = identity?.session.user?.id ?? "isolated-view";
  const [savedPosition] = useState(() => readingPosition(user, id));
  const room = useRef<HTMLDivElement>(null),
    history = useRef<HTMLDivElement>(null);
  const recovering = useRef<boolean | null>(null);
  const initial = useRef(false),
    pinned = useRef(true),
    last = useRef(0),
    marked = useRef(0);
  const captureReading = useCallback(() => {
    const box = history.current;
    if (!box) return;
    const node = [...box.querySelectorAll<HTMLElement>(".message-bubble")].find(
      (item) =>
        item.getBoundingClientRect().bottom >
        box.getBoundingClientRect().top + 4,
    );
    // Repeated outage responses must not replace the saved position with the
    // recovery notice's geometry.
    if (!node) return;
    pinned.current = box.scrollHeight - box.scrollTop - box.clientHeight <= 24;
    readingPosition(user, id, {
      sequence: Number(node.closest<HTMLElement>(".message")?.dataset.sequence),
      offset:
        box.getBoundingClientRect().top - node.getBoundingClientRect().top,
    });
  }, [id, user]);
  const chat = useChat(base, savedPosition?.sequence, captureReading);
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: globalThis.KeyboardEvent) => {
      const element = details.current;
      if (
        event.key === "Escape" &&
        element?.open &&
        event.target instanceof Node &&
        element.contains(event.target)
      ) {
        event.preventDefault();
        element.open = false;
        element.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("keydown", close);
    };
  }, []);
  const anchor = useRef<{
    sequence: string;
    offset: number;
    first: number;
  } | null>(null);
  const [newCount, setNewCount] = useState(0),
    [announcement, setAnnouncement] = useState("");
  const refresh = chat.refresh,
    fail = chat.fail;
  const latest = chat.messages.at(-1)?.sequence ?? 0;
  const markRead = useCallback(() => {
    if (
      !latest ||
      chat.error ||
      marked.current >= latest ||
      document.visibilityState !== "visible"
    )
      return;
    marked.current = latest;
    void command(base + "/read", { sequence: latest })
      .then(() => {
        void refresh();
      })
      .catch((cause: unknown) => {
        marked.current = 0;
        fail(cause);
      });
  }, [base, latest, chat.error, refresh, fail]);
  const atBottom = useCallback(() => {
    const box = history.current;
    if (!box || chat.error) return;
    const remaining = box.scrollHeight - box.scrollTop - box.clientHeight;
    captureReading();
    if (remaining <= 3) {
      setNewCount(0);
      markRead();
    }
  }, [captureReading, markRead, chat.error]);
  useLayoutEffect(() => {
    const box = history.current;
    if (!chat.thread) {
      initial.current = false;
      recovering.current = null;
      last.current = 0;
      marked.current = 0;
      anchor.current = null;
      pinned.current = true;
      return;
    }
    if (!box) return;
    if (chat.error) {
      recovering.current ??= pinned.current;
      initial.current = false;
      return;
    }
    if (!initial.current) {
      initial.current = true;
      const resumeReading = recovering.current === false;
      const arrivals = chat.messages.filter(
        (message) => message.sequence > last.current,
      ).length;
      setNewCount((current) => (resumeReading ? current + arrivals : 0));
      setAnnouncement(
        resumeReading && arrivals
          ? `${String(arrivals)} new messages in this conversation.`
          : "",
      );
      const saved = readingPosition(user, id) ?? savedPosition;
      const restored = saved
        ? box.querySelector<HTMLElement>(
            `[data-sequence="${String(saved.sequence)}"] .message-bubble`,
          )
        : null;
      const unread = box.querySelector<HTMLElement>(
        `[data-sequence="${String(chat.firstUnread)}"]`,
      );
      box.scrollTop =
        recovering.current === true
          ? box.scrollHeight
          : ((restored && saved
              ? box.scrollTop +
                restored.getBoundingClientRect().top -
                box.getBoundingClientRect().top +
                saved.offset
              : undefined) ??
            (unread
              ? box.scrollTop +
                unread.getBoundingClientRect().top -
                box.getBoundingClientRect().top -
                12
              : box.scrollHeight));
      recovering.current = null;
    } else if (
      anchor.current &&
      (chat.messages[0]?.sequence ?? 0) < anchor.current.first
    ) {
      const node = box.querySelector<HTMLElement>(
        `[data-sequence="${anchor.current.sequence}"] .message-bubble`,
      );
      if (node)
        box.scrollTop +=
          node.getBoundingClientRect().top -
          box.getBoundingClientRect().top -
          anchor.current.offset;
      anchor.current = null;
    } else if (latest > last.current) {
      const added = chat.messages.filter(
        (message) => message.sequence > last.current,
      ).length;
      if (pinned.current) box.scrollTop = box.scrollHeight;
      else setNewCount((current) => current + added);
      setAnnouncement(
        `${String(added)} new ${added === 1 ? "message" : "messages"} in this conversation.`,
      );
    }
    last.current = latest;
    atBottom();
  }, [
    chat.messages,
    chat.thread,
    chat.error,
    chat.firstUnread,
    latest,
    id,
    user,
    atBottom,
    savedPosition,
  ]);
  useEffect(() => {
    const visible = () => {
      if (document.visibilityState === "visible") atBottom();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      document.removeEventListener("visibilitychange", visible);
    };
  }, [atBottom]);
  useEffect(() => {
    const element = room.current;
    if (!element) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const viewport = window.visualViewport;
        const bottom = viewport
          ? viewport.height + viewport.offsetTop
          : window.innerHeight;
        element.style.setProperty(
          "--chat-height",
          `${String(Math.max(window.innerWidth <= 600 ? Math.min(640, (viewport?.height ?? window.innerHeight) - 12) : 320, Math.min(900, bottom - element.getBoundingClientRect().top - 12)))}px`,
        );
      });
    };
    const focus = (event: FocusEvent) => {
      if (
        event.target instanceof HTMLTextAreaElement &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(max-width: 600px)").matches
      ) {
        if (typeof element.scrollIntoView === "function")
          element.scrollIntoView({ block: "start" });
        measure();
      }
    };
    element.addEventListener("focusin", focus);
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("focusin", focus);
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
    };
  }, [chat.thread?.id]);
  function newest() {
    if (history.current)
      history.current.scrollTop = history.current.scrollHeight;
    pinned.current = true;
    setNewCount(0);
    markRead();
  }
  async function earlier() {
    const box = history.current;
    if (box) {
      const node = [
        ...box.querySelectorAll<HTMLElement>(".message-bubble"),
      ].find(
        (item) =>
          item.getBoundingClientRect().bottom >
          box.getBoundingClientRect().top + 4,
      );
      if (node)
        anchor.current = {
          first: chat.messages[0]?.sequence ?? 0,
          sequence:
            node.closest<HTMLElement>(".message")?.dataset.sequence ?? "",
          offset:
            node.getBoundingClientRect().top - box.getBoundingClientRect().top,
        };
    }
    if (!(await chat.loadEarlier())) anchor.current = null;
  }
  const location = useLocation();
  const inboxState = z
    .object({ inboxSearch: z.string().max(2048) })
    .safeParse(location.state);
  const inboxSearch = inboxState.success
    ? "?" + new URLSearchParams(inboxState.data.inboxSearch).toString()
    : "";
  const back = booster
    ? "/booster/orders"
    : (admin ? "/admin" : "") + "/support" + inboxSearch;
  return (
    <div className={"chat-workspace" + (booster ? " booster-chat" : "")}>
      {!booster && (
        <ConversationRail current={id} admin={admin} active={chat.thread} />
      )}
      {!chat.thread ? (
        <section className="chat-access">
          <Link to={back}>← {booster ? "Assigned work" : "Conversations"}</Link>
          <ErrorNotice error={chat.error} />
          <p role="status">
            {chat.error
              ? "Conversation access is unavailable."
              : "Loading conversation…"}
          </p>
          {!!chat.error && (
            <Action
              onClick={() => {
                void refresh(true);
              }}
            >
              Retry conversation access
            </Action>
          )}
        </section>
      ) : (
        <div ref={room} className="chat-room">
          <header className="chat-room-header">
            <Link className="chat-back" to={back}>
              ← {booster ? "Assigned work" : "Inbox"}
            </Link>
            <div className="chat-title">
              <h2>{chat.thread.subject}</h2>
              <span>
                {kindLabel(chat.thread.kind)} · {stateLabel(chat.thread.state)}
              </span>
            </div>
            <details ref={details} className="chat-details">
              <summary>{admin ? "Details & actions" : "Details"}</summary>
              <div className="chat-details-panel">
                <strong>{chat.thread.subject}</strong>
                <ContextLinks
                  thread={chat.thread}
                  admin={admin}
                  booster={booster}
                />
                {admin && (
                  <StaffControls
                    thread={chat.thread}
                    done={() => {
                      void refresh();
                    }}
                  />
                )}
              </div>
            </details>
          </header>
          <div className="chat-connection">
            <span role="status">
              {chat.error
                ? "Connection interrupted · your draft is kept"
                : chat.live
                  ? "Live updates connected"
                  : "Reconnecting · automatic updates remain available"}
            </span>
            <button
              className="chat-text-button"
              onClick={() => {
                void refresh(true);
              }}
            >
              Refresh conversation
            </button>
          </div>
          {/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- This history scroller must receive focus for native Arrow/Page scrolling. */}
          <div
            ref={history}
            className="chat-history"
            tabIndex={0}
            role="region"
            aria-label="Conversation messages"
            onScroll={atBottom}
          >
            {chat.error ? (
              <div className="chat-recovery">
                <ErrorNotice error={chat.error} />
                <p>
                  Messages are hidden while access is checked. Your draft stays
                  in memory. Reconnect or refresh to continue.
                </p>
              </div>
            ) : (
              <>
                {!!chat.earlier && (
                  <Action
                    disabled={chat.olderBusy}
                    onClick={() => {
                      void earlier();
                    }}
                  >
                    {chat.olderBusy
                      ? "Loading earlier messages…"
                      : "Earlier messages"}
                  </Action>
                )}
                {chat.catchingUp && (
                  <p role="status">
                    Catching up with recent messages…{" "}
                    <Action
                      onClick={() => {
                        void refresh();
                      }}
                    >
                      Continue updating
                    </Action>
                  </p>
                )}
                {!chat.messages.length && (
                  <div className="chat-empty">
                    <strong>Start the conversation</strong>
                    <p>
                      Ask your question below. Replies and shared files will
                      appear here.
                    </p>
                  </div>
                )}
                <ol className="message-list">
                  {chat.messages.map((message, index) => {
                    const previous = chat.messages[index - 1];
                    const date = new Date(message.created_at);
                    const day = date.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    const nextDay =
                      !previous ||
                      new Date(previous.created_at).toDateString() !==
                        date.toDateString();
                    const grouped =
                      !nextDay &&
                      previous.sender_label === message.sender_label &&
                      previous.visibility === message.visibility &&
                      date.getTime() - new Date(previous.created_at).getTime() <
                        300000;
                    const ownSide =
                      admin || booster
                        ? message.sender_role !== "customer"
                        : message.sender_role === "customer";
                    return (
                      <li
                        key={message.id}
                        data-sequence={message.sequence}
                        className={
                          "message" +
                          (message.visibility === "internal"
                            ? " internal-note"
                            : "") +
                          (ownSide ? " outgoing-message" : "") +
                          (grouped ? " grouped-message" : "")
                        }
                      >
                        {nextDay && <div className="chat-day">{day}</div>}
                        {message.sequence === chat.firstUnread && (
                          <div className="chat-unread-divider">
                            Unread messages
                          </div>
                        )}
                        <article className="message-bubble">
                          <div className="message-meta">
                            <strong>{message.sender_label}</strong>
                            {message.sender_label !== "Customer" && (
                              <span>
                                {message.sender_role === "customer"
                                  ? "Customer"
                                  : "Staff"}
                              </span>
                            )}
                            {message.visibility === "internal" && (
                              <span className="message-tag">
                                Internal · staff only
                              </span>
                            )}
                            {message.purpose === "proof" && (
                              <span className="message-tag">
                                Published proof
                              </span>
                            )}
                            <time
                              dateTime={message.created_at}
                              title={date.toLocaleString()}
                              aria-label={date.toLocaleString()}
                            >
                              {date.toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </time>
                          </div>
                          <p>{message.body}</p>
                          {message.attachments?.map((file) => (
                            <DownloadImage key={file} id={file} admin={admin} />
                          ))}
                        </article>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}
          </div>
          {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
          {!!newCount && (
            <button className="chat-new-messages" onClick={newest}>
              New messages ({newCount}) ↓
            </button>
          )}
          <span className="sr-only" role="status">
            {announcement}
          </span>
          <Composer
            base={base}
            admin={admin}
            proofAllowed={
              (admin || booster) && chat.thread.kind === "fulfillment"
            }
            unavailable={!!chat.error}
            fail={fail}
            done={() => {
              pinned.current = true;
              void refresh();
            }}
          />
        </div>
      )}
    </div>
  );
}
export default function Thread({
  admin = false,
  booster = false,
}: {
  admin?: boolean;
  booster?: boolean;
}) {
  const { id = "" } = useParams();
  return (
    <ThreadSession
      key={(admin ? "admin:" : "customer:") + id}
      id={id}
      admin={admin}
      booster={booster}
    />
  );
}
