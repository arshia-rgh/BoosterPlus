import { useRef, useState } from "react";
import { Action, Check, ErrorNotice, Text } from "../catalog/controls";
import { Input } from "../catalog/dynamic-form";
import {
  intakeService,
  matches,
  visibleAnswers,
  type Answers,
} from "../catalog/model";
import { post } from "../identity/api";
import { submissionSchema, type Submission } from "./model";

export default function SubmissionEditor({
  value,
  reload,
}: {
  value: Submission;
  reload: () => void;
}) {
  const [title, setTitle] = useState(value.submission.title),
    [answers, setAnswers] = useState<Answers>(value.answers),
    [notes, setNotes] = useState(value.ownership_notes),
    [declared, setDeclared] = useState(value.ownership_declared),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    form = value.offer.configuration.intake;
  const lock = useRef(false);
  if (!form)
    return <p>The pinned intake form is unavailable; contact support.</p>;
  const service = intakeService(form),
    values = visibleAnswers(service, answers, "order");
  async function save(submit: boolean) {
    if (lock.current || (submit && dirty)) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await post(
        `/submissions/${value.submission.id}/${submit ? "submit" : "edit"}`,
        submit
          ? { version: value.submission.version, note: "" }
          : {
              version: value.submission.version,
              title,
              answers: values,
              ownership_notes: notes,
              ownership_declared: declared,
            },
        submissionSchema,
      );
      reload();
    } catch (cause) {
      setError(cause);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="catalog-section seller-intake">
      <h3>{form.name}</h3>
      <p>{form.description}</p>
      <ErrorNotice error={error} />
      <fieldset disabled={busy}>
        <legend>Private submission details</legend>
        <h4>1. Describe the account</h4>
        <div className="seller-intake-fields">
          <Text
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
                change={(v) => {
                  setAnswers((current) => {
                    const next = Object.fromEntries(
                      Object.entries(current).filter(
                        ([key]) => key !== field.key,
                      ),
                    );
                    if (v !== undefined) next[field.key] = v;
                    return next;
                  });
                  setDirty(true);
                }}
              />
            ))}
        </div>
        <h4>2. Confirm ownership</h4>
        <Text
          label="Ownership and control information"
          multiline
          value={notes}
          change={(v) => {
            setNotes(v);
            setDirty(true);
          }}
          help="Describe how you obtained and control the account and relevant restrictions. Do not include login or recovery information."
        />
        <Check
          label="I control this account and have authority to submit it for review"
          value={declared}
          change={(v) => {
            setDeclared(v);
            setDirty(true);
          }}
        />
        <h4>3. Save and send for review</h4>
        <p>
          Save a private draft first. Submit only when the saved details are
          ready for the team.
        </p>
        <div className="seller-save-actions">
          <Action
            onClick={() => {
              void save(false);
            }}
          >
            Save account draft
          </Action>
          <Action
            disabled={dirty}
            onClick={() => {
              void save(true);
            }}
          >
            Submit saved account for review
          </Action>
        </div>
        {dirty && (
          <p role="status">
            Save your changes before submitting them for review.
          </p>
        )}
      </fieldset>
    </section>
  );
}
