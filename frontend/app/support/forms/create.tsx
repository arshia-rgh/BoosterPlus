import { useEffect, useRef, useState } from "react";
import {
  Action,
  Check,
  ErrorNotice,
  Select,
  Text,
} from "../../catalog/controls";
import { APIError, post } from "../../identity/api";
import { useResource } from "../../orders/resource";
import { FieldValidation, type FieldIssue } from "../../ui/form-validation";
import { useEditorValidation } from "../../ui/editor-validation";
import { uncertain } from "../chat-state";
import { FormDialog, useFormGuard } from "./dialog";
import { AnswerInput } from "./answers";
import {
  answerIssues,
  chatFormSchema,
  formOptionsSchema,
  type FormField,
} from "./model";
import "./forms.css";
const blank = (key: string): FormField => ({
  key,
  label: "",
  kind: "text",
  secure: false,
  required: true,
});
export function CreateChatForm({
  base,
  changed,
}: {
  base: string;
  changed: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="chat-text-button"
        onClick={() => {
          setOpen(true);
        }}
      >
        ＋ Send a form
      </button>
      {open && (
        <FormDialog
          title="Send a form"
          close={() => {
            setOpen(false);
          }}
        >
          <FormEditor
            base={base}
            done={() => {
              setOpen(false);
              changed();
            }}
          />
        </FormDialog>
      )}
    </>
  );
}
function FormEditor({ base, done }: { base: string; done: () => void }) {
  const options = useResource(`${base}/forms/options`, formOptionsSchema);
  const [purpose, setPurpose] = useState("information"),
    [mode, setMode] = useState("request"),
    [recipient, setRecipient] = useState("customer"),
    [share, setShare] = useState(false),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [hours, setHours] = useState("72"),
    [fields, setFields] = useState<FormField[]>([blank("field_1")]),
    [answers, setAnswers] = useState<Record<string, string>>({}),
    [preview, setPreview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const serial = useRef(1),
    key = useRef(crypto.randomUUID()),
    lock = useRef(false),
    expires = useRef("");
  const validation = useEditorValidation();
  const editorForm = useRef<HTMLFormElement>(null);
  const [unknown, setUnknown] = useState(false);
  const submitted = useRef<unknown>(null);
  useFormGuard(
    Boolean(
      title ||
      description ||
      Object.keys(answers).length ||
      fields.some(
        (f) => f.label || f.secure || !f.required || f.kind !== "text",
      ) ||
      fields.length !== 1 ||
      purpose !== "information" ||
      mode !== "request" ||
      recipient !== "customer" ||
      share ||
      hours !== "72",
    ),
    busy,
    unknown,
  );
  const selected = options.data?.purposes.find((p) => p.key === purpose);
  const max = selected?.max_hours ?? 720;
  const min = purpose === "buyer_access" ? 25 : 1;
  const previewHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (preview) previewHeading.current?.focus();
  }, [preview]);
  function choose(p: string) {
    const selected = options.data?.purposes.find((v) => v.key === p);
    setPurpose(p);
    setMode(selected?.modes[0] ?? "request");
    setRecipient("customer");
    setShare(false);
    setHours(String(Math.min(72, selected?.max_hours ?? 720)));
    setTitle(
      p === "information"
        ? ""
        : p === "buyer_access"
          ? "Your account access"
          : p === "seller_access"
            ? "Account access request"
            : "Boosting access request",
    );
    setFields(
      p === "information"
        ? [blank("field_1")]
        : [
            { ...blank("field_1"), label: "Login / account ID", secure: true },
            {
              ...blank("field_2"),
              label: "Password / access details",
              secure: true,
            },
          ],
    );
    serial.current = 2;
    setAnswers({});
  }
  function update(i: number, patch: Partial<FormField>) {
    setFields(fields.map((f, j) => (i === j ? { ...f, ...patch } : f)));
  }
  function validate() {
    const issues: FieldIssue[] = [];
    if (!title.trim() || title.length > 120)
      issues.push({
        path: "title",
        message: "Enter a title (up to 120 characters).",
      });
    if (description.length > 500)
      issues.push({
        path: "description",
        message: "Keep the introduction within 500 characters.",
      });
    if (
      !Number.isInteger(Number(hours)) ||
      Number(hours) < min ||
      Number(hours) > max
    )
      issues.push({
        path: "hours",
        message: `Choose ${String(min)}–${String(max)} hours.`,
      });
    fields.forEach((f, i) => {
      if (!f.label.trim())
        issues.push({
          path: `fields.${String(i)}.label`,
          message: "Name this field.",
        });
      if (
        f.kind === "select" &&
        ((f.options?.filter(Boolean).length ?? 0) < 2 ||
          (f.options?.length ?? 0) > 20 ||
          new Set(f.options).size !== f.options?.length)
      )
        issues.push({
          path: `fields.${String(i)}.options`,
          message: "Enter 2–20 different choices, one per line.",
        });
    });
    if (purpose !== "information" && !fields.some((f) => f.secure))
      issues.push({
        path: "fields.0.label",
        message: "Access forms need a protected field.",
      });
    if (mode === "share") issues.push(...answerIssues(fields, answers));
    const valid = validation.check(issues);
    if (!valid)
      requestAnimationFrame(() =>
        editorForm.current
          ?.querySelector<HTMLElement>(
            `[name="${CSS.escape(issues[0]?.path ?? "")}"]`,
          )
          ?.focus(),
      );
    return valid;
  }
  async function send() {
    if (lock.current || !validate()) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    expires.current ||= new Date(
      Date.now() + Number(hours) * 3600000,
    ).toISOString();
    try {
      submitted.current ??= {
        request_key: key.current,
        mode,
        purpose,
        recipient,
        share_with_booster: share,
        title,
        description,
        fields,
        answers: mode === "share" ? answers : undefined,
        expires_at: expires.current,
      };
      await post(`${base}/forms`, submitted.current, chatFormSchema);
      setAnswers({});
      done();
    } catch (cause) {
      setError(cause);
      const ambiguous = uncertain(cause);
      setUnknown(ambiguous);
      if (!ambiguous) submitted.current = null;
      if (cause instanceof APIError) validation.check(cause.issues);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <FieldValidation value={validation.validation}>
      <ErrorNotice error={options.error ?? error} />
      {unknown && (
        <p role="alert">
          Delivery is uncertain. Retry this same form to check it safely; do not
          create a second copy.
        </p>
      )}
      {options.error ? (
        <button className="chat-text-button" onClick={options.reload}>
          Retry form options
        </button>
      ) : options.loading ? (
        <p role="status">Checking available forms…</p>
      ) : !options.data?.open ? (
        <p>Reopen the conversation before sending a form.</p>
      ) : (
        <form
          ref={editorForm}
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            if (!validate()) return;
            if (preview) void send();
            else setPreview(true);
          }}
        >
          <fieldset disabled={busy}>
            {preview ? (
              <>
                <h3 ref={previewHeading} tabIndex={-1}>
                  Recipient preview
                </h3>
                <p>
                  <strong>{title}</strong>
                </p>
                {description && <p>{description}</p>}
                <p>
                  {recipient === "booster"
                    ? "Assigned booster"
                    : "Customer / seller"}
                  {share ? ", selected booster" : ""} and PLAYORA staff ·{" "}
                  {hours} hours
                </p>
                {fields.map((f) => (
                  <div className="form-preview-field" key={f.key}>
                    <strong>{f.label}</strong>
                    <span>
                      {mode === "share"
                        ? answers[f.key]
                          ? f.secure
                            ? "Protected value entered"
                            : answers[f.key]
                          : "Not provided"
                        : `${f.secure ? "Protected field" : f.kind === "select" ? "Choose an option" : "Ordinary text"}${f.required ? " · required" : " · optional"}`}
                    </span>
                  </div>
                ))}
                <p>
                  {mode === "request"
                    ? "The recipient completes this form in the conversation."
                    : purpose === "buyer_access"
                      ? "Buyer access becomes available after delivery is confirmed."
                      : "The recipient can view these details in this conversation."}
                </p>
                <div className="form-actions">
                  <button className="button" type="submit">
                    {busy
                      ? "Sending…"
                      : unknown
                        ? "Retry same form"
                        : "Send form"}
                  </button>
                  <button
                    className="chat-text-button"
                    type="button"
                    disabled={unknown}
                    onClick={() => {
                      setPreview(false);
                      requestAnimationFrame(() =>
                        editorForm.current
                          ?.querySelector<HTMLElement>('[name="title"]')
                          ?.focus(),
                      );
                      key.current = crypto.randomUUID();
                      expires.current = "";
                    }}
                  >
                    Edit form
                  </button>
                </div>
              </>
            ) : (
              <>
                <Select
                  label="Purpose"
                  value={purpose}
                  options={options.data.purposes.map((p) => [p.key, p.label])}
                  change={choose}
                />
                {selected && selected.modes.length > 1 && (
                  <Select
                    label="Action"
                    value={mode}
                    options={[
                      ["request", "Request answers"],
                      ["share", "Send completed details"],
                    ]}
                    change={setMode}
                  />
                )}
                <Select
                  label="Recipient"
                  value={recipient}
                  options={
                    options.data.booster && purpose === "information"
                      ? [
                          ["customer", "Customer"],
                          ["booster", "Assigned booster"],
                        ]
                      : [["customer", "Customer / seller"]]
                  }
                  change={setRecipient}
                />
                {options.data.booster &&
                  recipient === "customer" &&
                  purpose !== "buyer_access" &&
                  purpose !== "seller_access" && (
                    <Check
                      label="Also allow the currently assigned booster to view answers"
                      value={share}
                      change={setShare}
                    />
                  )}
                <Text
                  label="Title"
                  name="title"
                  value={title}
                  change={setTitle}
                />
                <Text
                  label="Short introduction (optional)"
                  name="description"
                  value={description}
                  change={setDescription}
                />
                <Text
                  label="Expires after (hours)"
                  name="hours"
                  type="number"
                  value={hours}
                  change={setHours}
                  help={`${String(min)}–${String(max)} hours; protected answers expire with the form.`}
                />
                <h3>Fields</h3>
                <p className="quiet">
                  Mark passwords and other credentials as protected. Never put
                  credentials in labels or choices.
                </p>
                {fields.map((f, i) => (
                  <section className="form-field-editor" key={f.key}>
                    <div className="form-field-heading">
                      <strong>Field {i + 1}</strong>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          className="chat-text-button"
                          onClick={() => {
                            setFields(fields.filter((_, j) => i !== j));
                            setAnswers((v) => {
                              const next = { ...v };
                              return Object.fromEntries(
                                Object.entries(next).filter(
                                  ([key]) => key !== f.key,
                                ),
                              );
                            });
                          }}
                        >
                          Remove field {i + 1}
                        </button>
                      )}
                    </div>
                    <Text
                      label="Field label"
                      name={`fields.${String(i)}.label`}
                      value={f.label}
                      change={(label) => {
                        update(i, { label });
                      }}
                    />
                    <Select
                      label="Input"
                      value={f.kind}
                      options={[
                        ["text", "Short text"],
                        ["multiline", "Long text"],
                        ["select", "Choice"],
                      ]}
                      change={(kind) => {
                        update(i, {
                          kind: kind as FormField["kind"],
                          options: kind === "select" ? ["", ""] : undefined,
                        });
                      }}
                    />
                    {f.kind === "select" && (
                      <Text
                        label="Choices (one per line)"
                        name={`fields.${String(i)}.options`}
                        multiline
                        value={f.options?.join("\n") ?? ""}
                        change={(value) => {
                          update(i, { options: value.split("\n") });
                        }}
                      />
                    )}
                    <div className="form-actions">
                      <Check
                        label="Required"
                        value={f.required}
                        change={(required) => {
                          update(i, { required });
                        }}
                      />
                      <Check
                        label="Protected / sensitive"
                        value={f.secure}
                        change={(secure) => {
                          update(i, { secure });
                        }}
                      />
                    </div>
                    {mode === "share" && (
                      <AnswerInput
                        field={f}
                        error={
                          validation.issues.find(
                            (issue) => issue.path === `answers.${f.key}`,
                          )?.message
                        }
                        value={answers[f.key] ?? ""}
                        change={(value) => {
                          setAnswers({ ...answers, [f.key]: value });
                        }}
                      />
                    )}
                  </section>
                ))}
                <div className="form-actions">
                  <Action
                    disabled={fields.length >= 12}
                    onClick={() => {
                      serial.current++;
                      setFields([
                        ...fields,
                        blank("field_" + String(serial.current)),
                      ]);
                    }}
                  >
                    Add field
                  </Action>
                  <button className="button" type="submit">
                    Preview form
                  </button>
                </div>
              </>
            )}
          </fieldset>
        </form>
      )}
    </FieldValidation>
  );
}
