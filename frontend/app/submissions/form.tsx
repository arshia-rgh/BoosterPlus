import { useRecordDraft } from "../ui/record-drafts";
import SellerImages from "./images";
import {
  FieldValidation,
  useFormValidation,
  type FieldIssue,
} from "../ui/form-validation";
import { useRef, useState } from "react";
import { Action, Check, ErrorNotice, Issues, Text } from "../catalog/controls";
import { Input } from "../catalog/dynamic-form";
import {
  changeLinkedChoice,
  linkedChoiceState,
  restoredAutomaticParents,
} from "../catalog/linked-choices";
import {
  intakeService,
  matches,
  visibleAnswers,
  type Answers,
} from "../catalog/model";
import { APIError, post } from "../identity/api";
import { submissionSchema, type Submission } from "./model";

export default function SubmissionEditor({
  value,
  reload,
  submitted,
}: {
  value: Submission;
  reload: () => void;
  submitted?: (() => void) | undefined;
}) {
  const [title, setTitle] = useState(value.submission.title),
    [answers, setAnswers] = useState<Answers>(value.answers),
    [notes, setNotes] = useState(value.ownership_notes),
    [declared, setDeclared] = useState(value.ownership_declared),
    [dirty, setDirty] = useState(false),
    [baseVersion, setBaseVersion] = useState(value.submission.version),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    form = value.offer.configuration.intake;
  const restoreParents = (current: Submission) =>
    current.offer.configuration.intake
      ? restoredAutomaticParents(
          intakeService(current.offer.configuration.intake),
          current.answers,
        )
      : new Set<string>();
  const [automaticParents, setAutomaticParents] = useState<ReadonlySet<string>>(
    () => restoreParents(value),
  );
  const [choiceNotice, setChoiceNotice] = useState(() =>
    restoreParents(value).size
      ? "Saved categories match your choices. All choices remain available; use the limit button to narrow them."
      : "",
  );
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const validation = useFormValidation(
    issues,
    (name) => {
      setIssues((old) => old.filter((issue) => issue.path !== name));
    },
    undefined,
    !busy,
  );
  const [photosPending, setPhotosPending] = useState(false);
  const lock = useRef(false);
  useRecordDraft(dirty, busy);
  function reset(current: Submission) {
    setTitle(current.submission.title);
    setAnswers(current.answers);
    setAutomaticParents(restoreParents(current));
    setChoiceNotice(
      restoreParents(current).size
        ? "Saved categories match your choices. All choices remain available; use the limit button to narrow them."
        : "",
    );
    setNotes(current.ownership_notes);
    setDeclared(current.ownership_declared);
    setBaseVersion(current.submission.version);
    setDirty(false);
    setError(null);
    setIssues([]);
  }
  const stale = value.submission.version > baseVersion;
  if (stale && !dirty && !busy) reset(value);
  if (!form)
    return <p>The pinned intake form is unavailable; contact support.</p>;
  const service = intakeService(form),
    values = visibleAnswers(service, answers, "order");
  async function save(submit: boolean) {
    if (lock.current || stale || (submit && photosPending)) return;
    const invalid: FieldIssue[] = [];
    if (!title.trim() || Array.from(title).length > 120 || title.includes("\0"))
      invalid.push({
        path: "title",
        message: "Enter an account title of 1–120 characters.",
      });
    if (Array.from(notes).length > 2000 || notes.includes("\0"))
      invalid.push({
        path: "ownership_notes",
        message: "Keep account notes within 2,000 characters.",
      });
    if (submit && !declared)
      invalid.push({
        path: "ownership_declared",
        message: "Confirm your authority to submit this account for review.",
      });
    setIssues(invalid);
    if (invalid.length) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      let saved = value;
      let version = baseVersion;
      if (dirty || !submit) {
        saved = await post(
          `/submissions/${value.submission.id}/edit`,
          {
            version,
            title,
            answers: values,
            ownership_notes: notes,
            ownership_declared: declared,
          },
          submissionSchema,
        );
        version = saved.submission.version;
        reset(saved);
      }
      if (submit)
        saved = await post(
          `/submissions/${value.submission.id}/submit`,
          { version, note: "" },
          submissionSchema,
        );
      reset(saved);
      reload();
      if (submit) submitted?.();
    } catch (cause) {
      setError(cause);
      if (cause instanceof APIError) setIssues(cause.issues);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <FieldValidation value={validation}>
      <section className="catalog-section seller-intake">
        <p>
          Add the account details, attach photos if helpful, then send it for
          review.
        </p>
        {form.description && (
          <details>
            <summary>Game-specific selling help</summary>
            <p>{form.description}</p>
          </details>
        )}
        <ErrorNotice error={error} hideIssues />
        <Issues issues={issues} />
        {stale && dirty && (
          <section role="alert">
            <p>
              This submission changed since you started editing. Your draft is
              still here; compare it with the latest record before continuing.
            </p>
            <Action
              onClick={() => {
                reset(value);
              }}
            >
              Discard this draft and load current details
            </Action>
          </section>
        )}
        <fieldset disabled={busy || stale}>
          <legend>Private submission details</legend>
          <h4>1. Describe the account</h4>
          {choiceNotice && <p role="status">{choiceNotice}</p>}
          <div className="seller-intake-fields">
            <Text
              name="title"
              label="Private account title"
              value={title}
              change={(v) => {
                setTitle(v);
                setDirty(true);
              }}
            />
            {service.fields
              .filter((f) => matches(f.visible_when, values, service.fields))
              .map((field) => (
                <Input
                  key={field.key}
                  config={value.offer.configuration}
                  field={field}
                  value={values[field.key]}
                  required={
                    field.required ||
                    (!!field.required_when &&
                      matches(field.required_when, values, service.fields))
                  }
                  error={undefined}
                  choiceState={linkedChoiceState(
                    service,
                    value.offer.configuration,
                    field,
                    values,
                    automaticParents,
                  )}
                  change={(v) => {
                    const next = changeLinkedChoice(
                      service,
                      answers,
                      field.key,
                      v,
                      automaticParents,
                    );
                    setAnswers(visibleAnswers(service, next.answers, "order"));
                    setAutomaticParents(next.automatic);
                    setChoiceNotice(next.notice);
                    validation.correct(field.key);
                    setDirty(true);
                  }}
                />
              ))}
          </div>
          <h4>2. Photos</h4>
          <SellerImages
            key={value.conversation_id}
            conversation={value.conversation_id}
            onPendingChange={setPhotosPending}
          />
          <h4>3. Permission to sell</h4>
          <Text
            name="ownership_notes"
            label="Account notes (optional)"
            multiline
            value={notes}
            change={(v) => {
              setNotes(v);
              setDirty(true);
            }}
            help="Mention restrictions or anything the buyer should know. Keep login and recovery details out of this form."
          />
          <Check
            name="ownership_declared"
            label="I control this account and have authority to submit it for review"
            value={declared}
            change={(v) => {
              setDeclared(v);
              setDirty(true);
            }}
          />

          <div className="seller-save-actions">
            <Action
              onClick={() => {
                void save(false);
              }}
            >
              Save account draft
            </Action>
            <Action
              disabled={photosPending}
              onClick={() => {
                void save(true);
              }}
            >
              Save and submit for review
            </Action>
          </div>
          {photosPending && (
            <p role="status">
              Send or remove the selected screenshots before submitting. Your
              account draft can still be saved.
            </p>
          )}
          {dirty && (
            <p role="status">
              Your changes will be saved when you submit. You can also save a
              draft and finish later.
            </p>
          )}
        </fieldset>
      </section>
    </FieldValidation>
  );
}
