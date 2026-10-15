import { focusValidationTarget } from "../../ui/form-validation";
import { useEffect, useRef, useState } from "react";
import { Action, ErrorNotice } from "../../catalog/controls";
import { APIError, post } from "../../identity/api";
import {
  useProtectedReveal,
  useProtectedRevealFocus,
} from "../../identity/protected-reveal";
import { useResource } from "../../orders/resource";
import { denied, uncertain } from "../chat-state";
import { FormDialog, useFormGuard } from "./dialog";
import { AnswerInput } from "./answers";
import {
  answerIssues,
  chatFormSchema,
  secureAnswersSchema,
  type ChatForm,
} from "./model";
import "./forms.css";

export function ChatFormCard({
  base,
  id,
  revision,
  changed,
}: {
  base: string;
  id: string;
  revision: number;
  changed: () => void;
}) {
  const [open, setOpen] = useState(false);
  const resource = useResource(`${base}/forms/${id}`, chatFormSchema);
  const reload = resource.reload;
  const previousRevision = useRef(revision);
  useEffect(() => {
    if (previousRevision.current !== revision) {
      previousRevision.current = revision;
      reload();
    }
  }, [reload, revision]);
  const row = resource.error ? null : resource.data;
  return (
    <div className="chat-form-card">
      {row ? (
        <>
          <div>
            <strong>{row.title}</strong>
            <span className="form-state">
              {(
                {
                  open: "Awaiting response",
                  answered: "Response received",
                  cancelled: "Cancelled",
                  expired: "Expired",
                } as Record<string, string>
              )[row.state] ?? row.state}
            </span>
          </div>
          <p>
            {row.recipient} ·{" "}
            {row.has_secure ? "Contains protected fields" : "Information form"}
          </p>
          <button
            className="button compact secondary"
            onClick={() => {
              setOpen(true);
            }}
          >
            {row.can_respond ? "Complete form" : "View form"}
          </button>
          {open && (
            <FormDialog
              title={row.title}
              close={() => {
                setOpen(false);
              }}
            >
              <FormContent
                base={base}
                row={row}
                changed={() => {
                  reload();
                  changed();
                }}
              />
            </FormDialog>
          )}
        </>
      ) : (
        <>
          <span>
            {resource.error
              ? denied(resource.error)
                ? "This form is not available to your account."
                : "Unable to load this form. Please retry."
              : "Loading form…"}
          </span>
          {!!resource.error && (
            <button className="chat-text-button" onClick={reload}>
              Check access again
            </button>
          )}
        </>
      )}
    </div>
  );
}
function FormContent({
  base,
  row,
  changed,
}: {
  base: string;
  row: ChatForm;
  changed: () => void;
}) {
  const path = `${base}/forms/${row.id}`;
  const [answers, setAnswers] = useState<Record<string, string>>({}),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    [confirmCancel, setConfirmCancel] = useState(false);
  const key = useRef(crypto.randomUUID()),
    lock = useRef(false),
    form = useRef<HTMLFormElement>(null);
  const reveal = useProtectedReveal(
    path + "/reveal?revision=" + String(row.version) + "&state=" + row.state,
    30000,
  );
  const {
    result: resultRef,
    problem: problemRef,
    trigger: triggerRef,
    hideExplicitly,
  } = useProtectedRevealFocus(
    Boolean(reveal.value),
    reveal.busy,
    reveal.error,
    path,
  );
  let secure: Record<string, string> = {};
  if (reveal.value && row.can_reveal && row.state === "answered") {
    try {
      secure = secureAnswersSchema.parse(JSON.parse(reveal.value));
    } catch {
      secure = {};
    }
  }
  const [unknown, setUnknown] = useState(false),
    [notice, setNotice] = useState("");
  const submitted = useRef<{
    version: number;
    request_key: string;
    answers: Record<string, string>;
  } | null>(null);
  const outcome = useRef<HTMLParagraphElement>(null);
  useFormGuard(Object.values(answers).some(Boolean), busy, unknown);
  useEffect(() => {
    if (notice && !busy) outcome.current?.focus();
  }, [notice, busy]);
  const [localIssues, setLocalIssues] = useState<
    { path: string; message: string }[]
  >([]);
  const issues = error instanceof APIError ? error.issues : localIssues;
  const focusPending = useRef(false);
  useEffect(() => {
    if (busy || !issues.length || !focusPending.current) return;
    const first = issues
      .map((issue) =>
        form.current?.querySelector<HTMLElement>(
          `[name="${CSS.escape(issue.path)}"]`,
        ),
      )
      .find(Boolean);
    if (first) {
      focusPending.current = false;
      focusValidationTarget(first);
    }
  }, [busy, issues]);
  const cancelAction = useRef(false),
    cancelHeading = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (confirmCancel) cancelHeading.current?.focus();
  }, [confirmCancel]);
  async function submit(cancel = false) {
    if (lock.current) return;
    if (!cancel) {
      const invalid = answerIssues(row.fields, answers);
      setLocalIssues(invalid);
      if (invalid.length) {
        focusPending.current = true;
        return;
      }
    }
    cancelAction.current = cancel;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      if (!cancel)
        submitted.current ??= {
          version: row.version,
          request_key: key.current,
          answers,
        };
      await post(
        path + (cancel ? "/cancel" : "/reply"),
        cancel ? { version: row.version } : submitted.current,
        chatFormSchema,
      );
      setAnswers({});
      setUnknown(false);
      setNotice(
        cancel
          ? "Form cancelled. Protected answers have been removed."
          : "Response sent. Continue the conversation below.",
      );
      reveal.hide();
      changed();
    } catch (cause) {
      focusPending.current =
        cause instanceof APIError && cause.issues.length > 0;
      setError(cause);
      const ambiguous = uncertain(cause);
      setUnknown(ambiguous);
      if (!ambiguous) submitted.current = null;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <p className="form-audience">{row.audience}</p>
      <p ref={outcome} tabIndex={-1} role="status">
        {notice ||
          (row.state === "open"
            ? "Awaiting response"
            : row.state === "answered"
              ? "Response received"
              : row.state === "cancelled"
                ? "Form cancelled"
                : "Form expired")}
      </p>
      {unknown && (
        <p role="alert">
          Delivery is uncertain. Retry this same action to check it safely.
          <button
            type="button"
            className="chat-text-button"
            disabled={busy}
            onClick={() => void submit(cancelAction.current)}
          >
            Retry same action
          </button>
        </p>
      )}
      {row.description && <p>{row.description}</p>}
      <p className="quiet">
        Available until {new Date(row.expires_at).toLocaleString()}.
      </p>
      <ErrorNotice error={error} />
      {row.can_respond ? (
        <form
          ref={form}
          noValidate
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <fieldset disabled={busy}>
            <legend className="sr-only">Your response</legend>
            {row.fields.map((field) => (
              <AnswerInput
                key={field.key}
                field={field}
                disabled={unknown}
                value={answers[field.key] ?? ""}
                error={
                  issues.find((i) => i.path === `answers.${field.key}`)?.message
                }
                change={(value) => {
                  setAnswers({ ...answers, [field.key]: value });
                  setLocalIssues(
                    issues.filter(
                      (issue) => issue.path !== `answers.${field.key}`,
                    ),
                  );
                  if (error instanceof APIError && error.issues.length)
                    setError(null);
                }}
              />
            ))}
            <button className="button" type="submit">
              {busy
                ? "Sending…"
                : unknown
                  ? "Retry same response"
                  : "Send response"}
            </button>
          </fieldset>
        </form>
      ) : (
        <>
          {reveal.value && row.can_reveal && (
            <h3 ref={resultRef} tabIndex={-1}>
              Protected details · hide after use
            </h3>
          )}
          <dl className="chat-form-answers">
            {row.fields.map((field) => (
              <div key={field.key}>
                <dt>
                  {field.label}
                  {field.secure && (
                    <span className="form-secure-badge">Protected</span>
                  )}
                </dt>
                <dd>
                  {field.secure
                    ? (secure[field.key] ?? "Hidden")
                    : (row.answers[field.key] ?? "Not provided")}
                </dd>
              </div>
            ))}
          </dl>
          {row.has_secure && row.state === "answered" && (
            <>
              <div ref={problemRef} tabIndex={-1}>
                <ErrorNotice error={reveal.error} />
              </div>
              {row.can_reveal ? (
                <>
                  {reveal.value ? (
                    <>
                      <button
                        className="chat-text-button"
                        onClick={() => {
                          hideExplicitly(reveal.hide);
                        }}
                      >
                        Hide details now
                      </button>
                    </>
                  ) : (
                    <div ref={triggerRef}>
                      <Action
                        disabled={reveal.busy}
                        onClick={() => void reveal.reveal()}
                      >
                        {reveal.busy
                          ? "Verifying…"
                          : "Reveal protected details"}
                      </Action>
                    </div>
                  )}
                  <p className="quiet">
                    Details hide after 30 seconds or when you leave this window.
                  </p>
                </>
              ) : (
                <p>
                  Protected details are unavailable until delivery and access
                  requirements are met. Ask support in this conversation.
                </p>
              )}
            </>
          )}
        </>
      )}
      {row.can_cancel && !unknown && (
        <div className="form-cancel">
          {confirmCancel ? (
            <>
              <p ref={cancelHeading} tabIndex={-1}>
                Cancel this form and remove its protected answers?
              </p>
              <div className="form-actions">
                <Action disabled={busy} onClick={() => void submit(true)}>
                  Cancel form
                </Action>
                <button
                  className="chat-text-button"
                  onClick={() => {
                    setConfirmCancel(false);
                  }}
                >
                  Keep form
                </button>
              </div>
            </>
          ) : (
            <button
              className="chat-text-button"
              onClick={() => {
                setConfirmCancel(true);
              }}
            >
              Cancel this form
            </button>
          )}
        </div>
      )}
    </>
  );
}
