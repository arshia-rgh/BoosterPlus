import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type SubmitEvent,
} from "react";
import { useRecordDraft } from "../ui/record-drafts";
import { post, APIError } from "../identity/api";
import { ErrorNotice, Select, Issues } from "../catalog/controls";
import { UploadImage } from "../media/attachment";
import { messageSchema } from "./model";
import { denied, uncertain } from "./chat-state";
import {
  FieldValidation,
  useFormValidation,
  fieldError,
  focusValidationTarget,
  type FieldIssue,
} from "../ui/form-validation";

export default function Composer({
  base,
  admin,
  audience = "Customer and PLAYORA support",
  proofAllowed,
  unavailable,
  done,
  fail,
}: {
  base: string;
  admin: boolean;
  audience?: string;
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
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const validation = useFormValidation(
    issues,
    (name) => {
      setIssues((old) => old.filter((issue) => issue.path !== name));
    },
    undefined,
    !busy,
  );
  const [error, setError] = useState<unknown>(null),
    [notice, setNotice] = useState("");
  const [desktop, setDesktop] = useState(false);
  const [enterToSend, setEnterToSend] = useState(false);
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
  const focusFailure = useRef(false);
  const sendButton = useRef<HTMLButtonElement>(null);
  const failureID = useId();
  const labelID = useId(),
    helpID = useId();
  const register = validation.register;
  useEffect(() => {
    const message = register({
      name: "body",
      id: labelID,
      label: visibility === "internal" ? "Internal note" : "Message",
    });
    const image = register({
      name: "attachments",
      id: attachmentID + "-trigger",
      label: "Attached proof image",
    });
    return () => {
      message();
      image();
    };
  }, [register, labelID, attachmentID, visibility]);
  const bodyError = fieldError(validation, "body"),
    attachmentError = fieldError(validation, "attachments");
  const body = visibility === "internal" ? drafts.internal : drafts.public;
  useRecordDraft(
    !!drafts.public || !!drafts.internal || !!attachment || unknown,
    busy || uploadPending,
  );
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
    if (busy) return;
    // Only the user's completed send sets these flags; polling never moves focus.
    if (focusFailure.current) {
      focusFailure.current = false;
      focusValidationTarget(sendButton.current);
    } else if (refocus.current) {
      refocus.current = false;
      input.current?.focus();
    }
  });
  const changeAttachment = useCallback((id: string, pending: boolean) => {
    setAttachment(id);
    if (id)
      setIssues((old) => old.filter((issue) => issue.path !== "attachments"));
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
    if (lock.current || unavailable || uploadPending) return;
    const invalid: FieldIssue[] = [];
    if (!body.trim() || body.length > 4000 || body.includes("\0"))
      invalid.push({
        path: "body",
        message: "Write a message of 1–4,000 characters.",
      });
    if (purpose === "proof" && !attachment) {
      invalid.push({
        path: "attachments",
        message: "Attach an approved image before publishing proof.",
      });
      setAttachmentsOpen(true);
    }
    setIssues(invalid);
    if (invalid.length) return;
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
      if (cause instanceof APIError) {
        setIssues(cause.issues);
        if (cause.issues.some((issue) => issue.path.startsWith("attachments")))
          setAttachmentsOpen(true);
      }
      setUnknown(uncertain(cause));
      focusFailure.current = !(
        cause instanceof APIError && cause.issues.length
      );
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
      !enterToSend ||
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
    <FieldValidation value={validation}>
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
              name="visibility"
              label="Message audience"
              value={visibility}
              disabled={!editable}
              options={[
                ["public", "Reply"],
                ["internal", "Internal note · staff only"],
              ]}
              change={(next) => {
                setVisibility(next);
                setIssues([]);
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
            <strong>To: {audience}</strong>
          )}
          {proofAllowed && visibility === "public" && (
            <Select
              name="purpose"
              label="Message type"
              value={purpose}
              disabled={!editable}
              options={[
                ["message", "Coordination message"],
                ["proof", "Publish proof images"],
              ]}
              change={(next) => {
                setPurpose(next);
                setIssues([]);
                key.current = crypto.randomUUID();
                if (next === "proof") setAttachmentsOpen(true);
              }}
            />
          )}
        </div>
        {admin && visibility === "public" && (
          <p className="composer-recipients">To: {audience}</p>
        )}
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
          aria-invalid={bodyError ? true : undefined}
          aria-describedby={[helpID, bodyError ? labelID + "-error" : ""]
            .filter(Boolean)
            .join(" ")}
          placeholder={
            visibility === "internal"
              ? "Write a private staff note…"
              : "Write your message…"
          }
          onChange={(event) => {
            const text = event.target.value;
            setDrafts((current) => ({ ...current, [visibility]: text }));
            validation.correct("body");
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
        {bodyError && (
          <p className="field-error" id={labelID + "-error"}>
            {bodyError}
          </p>
        )}
        <div className="composer-toolbar">
          <button
            type="button"
            className="chat-text-button"
            disabled={!editable}
            ref={attachButton}
            id={attachmentID + "-trigger"}
            aria-describedby={
              attachmentError ? attachmentID + "-error" : undefined
            }
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
            ref={sendButton}
            aria-describedby={error ? failureID : undefined}
            disabled={busy || unavailable || uploadPending}
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
        {attachmentError && (
          <p id={attachmentID + "-error"} className="field-error">
            {attachmentError}
          </p>
        )}
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
        {desktop && (
          <label className="composer-enter-preference">
            <input
              type="checkbox"
              checked={enterToSend}
              onChange={(event) => {
                setEnterToSend(event.target.checked);
              }}
            />
            Press Enter to send
          </label>
        )}
        <p id={helpID} className="composer-help">
          {desktop && enterToSend
            ? "Enter to send · Shift+Enter for a new line. "
            : "Use the send button when ready. "}
          Never send passwords in messages.
        </p>
        <div id={failureID}>
          {unknown && (
            <p role="status">
              Send not confirmed. Your message is kept unchanged. Retry checks
              the same send without creating a duplicate.
            </p>
          )}
          <ErrorNotice error={error} hideIssues />
        </div>
        <Issues issues={issues} />
        {!!notice && (
          <p role="status" className="composer-notice">
            {notice}
          </p>
        )}
      </form>
    </FieldValidation>
  );
}
