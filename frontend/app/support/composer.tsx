import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type SubmitEvent,
} from "react";
import { post } from "../identity/api";
import { ErrorNotice, Select } from "../catalog/controls";
import { UploadImage } from "../media/attachment";
import { messageSchema } from "./model";
import { denied, uncertain } from "./chat-state";

export default function Composer({
  base,
  admin,
  proofAllowed,
  unavailable,
  done,
  fail,
}: {
  base: string;
  admin: boolean;
  proofAllowed: boolean;
  unavailable: boolean;
  done: () => void;
  fail: (error: unknown) => void;
}) {
  const [visibility, setVisibility] = useState("public");
  const [drafts, setDrafts] = useState({ public: "", internal: "" });
  const [purpose, setPurpose] = useState("message");
  const [attachment, setAttachment] = useState("");
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadVersion, setUploadVersion] = useState(0);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [busy, setBusy] = useState(false),
    [unknown, setUnknown] = useState(false);
  const [error, setError] = useState<unknown>(null),
    [notice, setNotice] = useState("");
  const [desktop, setDesktop] = useState(false);
  const key = useRef(crypto.randomUUID()),
    lock = useRef(false),
    composing = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const attachButton = useRef<HTMLButtonElement>(null);
  const attachmentID = useId();
  const attachmentPanel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: globalThis.KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        event.target instanceof Node &&
        attachmentPanel.current?.contains(event.target)
      ) {
        event.preventDefault();
        setAttachmentsOpen(false);
        attachButton.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("keydown", close);
    };
  }, []);
  const refocus = useRef(false);
  const labelID = useId(),
    helpID = useId();
  const body = visibility === "internal" ? drafts.internal : drafts.public;
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(
      "(min-width: 851px) and (hover: hover) and (pointer: fine)",
    );
    const update = () => {
      setDesktop(query.matches);
    };
    update();
    query.addEventListener("change", update);
    return () => {
      query.removeEventListener("change", update);
    };
  }, []);
  useEffect(() => {
    if (!input.current) return;
    input.current.style.height = "auto";
    input.current.style.height =
      String(Math.min(128, input.current.scrollHeight)) + "px";
  }, [body]);
  useEffect(() => {
    if (!busy && refocus.current) {
      refocus.current = false;
      input.current?.focus();
    }
  }, [busy]);
  const changeAttachment = useCallback((id: string, pending: boolean) => {
    setAttachment(id);
    setUploadPending(pending);
    key.current = crypto.randomUUID();
  }, []);
  const editable = !busy && !unknown && !unavailable;
  const valid =
    body.trim().length > 0 &&
    body.length <= 4000 &&
    !uploadPending &&
    (purpose !== "proof" || !!attachment);
  async function send(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || unavailable || !valid) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      // A retry uses the same immutable payload/key; the server returns an existing send.
      await post(
        base + "/messages",
        {
          request_key: key.current,
          purpose,
          body,
          visibility,
          attachments: attachment ? [attachment] : [],
        },
        messageSchema,
      );
      setDrafts((current) => ({ ...current, [visibility]: "" }));
      setUnknown(false);
      setAttachment("");
      setUploadPending(false);
      setUploadVersion((current) => current + 1);
      setAttachmentsOpen(false);
      key.current = crypto.randomUUID();
      setNotice(
        visibility === "internal" ? "Internal note saved." : "Message sent.",
      );
      done();
      refocus.current = true;
    } catch (cause) {
      if (denied(cause)) {
        fail(cause);
        return;
      }
      setError(cause);
      setUnknown(uncertain(cause));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function shortcut(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      !desktop ||
      composing.current ||
      event.nativeEvent.isComposing ||
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- Retain legacy IME-confirm detection alongside isComposing.
      event.keyCode === 229
    )
      return;
    event.preventDefault();
    if (valid && editable) event.currentTarget.form?.requestSubmit();
  }
  return (
    <form
      aria-label={
        visibility === "internal" ? "Compose internal note" : "Compose reply"
      }
      className={
        "chat-composer" + (visibility === "internal" ? " note-composer" : "")
      }
      onSubmit={(event) => {
        void send(event);
      }}
    >
      <div className="composer-audience">
        {admin ? (
          <Select
            label="Message audience"
            value={visibility}
            disabled={!editable}
            options={[
              ["public", "Reply to customer"],
              ["internal", "Internal note · staff only"],
            ]}
            change={(next) => {
              setVisibility(next);
              setPurpose("message");
              setAttachment("");
              setUploadPending(false);
              setUploadVersion((current) => current + 1);
              setAttachmentsOpen(false);
              setError(null);
              setNotice(
                "Separate drafts. Attachments reset when switching audience.",
              );
              key.current = crypto.randomUUID();
            }}
          />
        ) : (
          <strong>Reply to this conversation</strong>
        )}
        {proofAllowed && visibility === "public" && (
          <Select
            label="Message type"
            value={purpose}
            disabled={!editable}
            options={[
              ["message", "Coordination message"],
              ["proof", "Publish proof images"],
            ]}
            change={(next) => {
              setPurpose(next);
              key.current = crypto.randomUUID();
              if (next === "proof") setAttachmentsOpen(true);
            }}
          />
        )}
      </div>
      {visibility === "internal" && (
        <p className="audience-warning">
          Private note · visible to administrators only.
        </p>
      )}
      <label htmlFor={labelID} className="sr-only">
        {visibility === "internal" ? "Internal note" : "Message"}
      </label>
      <textarea
        id={labelID}
        ref={input}
        rows={2}
        maxLength={4000}
        disabled={!editable}
        value={body}
        aria-describedby={helpID}
        placeholder={
          visibility === "internal"
            ? "Write a private staff note…"
            : "Write your message…"
        }
        onChange={(event) => {
          const text = event.target.value;
          setDrafts((current) => ({ ...current, [visibility]: text }));
          key.current = crypto.randomUUID();
          setError(null);
          setNotice("");
        }}
        onKeyDown={shortcut}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
        }}
      />
      <div className="composer-toolbar">
        <button
          type="button"
          className="chat-text-button"
          disabled={!editable}
          ref={attachButton}
          aria-controls={attachmentID}
          aria-expanded={attachmentsOpen}
          onClick={() => {
            setAttachmentsOpen((current) => !current);
          }}
        >
          Attach image
        </button>
        <small>{String(body.length)} / 4,000</small>
        <button
          className="button"
          type="submit"
          disabled={busy || unavailable || !valid}
        >
          {busy
            ? "Sending…"
            : unknown
              ? "Retry same message"
              : visibility === "internal"
                ? "Save internal note"
                : purpose === "proof"
                  ? "Publish proof"
                  : "Send message"}
        </button>
      </div>
      <div id={attachmentID} ref={attachmentPanel} hidden={!attachmentsOpen}>
        <fieldset disabled={!editable} className="composer-attachment">
          <button
            type="button"
            className="chat-text-button"
            onClick={() => {
              setAttachmentsOpen(false);
              attachButton.current?.focus();
            }}
          >
            Close attachments
          </button>
          <UploadImage
            key={visibility + String(uploadVersion)}
            conversation={base.split("/").at(-1) ?? ""}
            admin={admin}
            visibility={visibility}
            change={changeAttachment}
            compact
          />
        </fieldset>
      </div>
      <p id={helpID} className="composer-help">
        {desktop
          ? "Enter to send · Shift+Enter for a new line. "
          : "Use the send button when ready. "}
        Drafts clear on exit. Use secure access for credentials.
      </p>
      {unknown && (
        <p role="status">
          Send not confirmed. Your message is kept unchanged. Retry checks the
          same send without creating a duplicate.
        </p>
      )}
      <ErrorNotice error={error} />
      {!!notice && (
        <p role="status" className="composer-notice">
          {notice}
        </p>
      )}
    </form>
  );
}
