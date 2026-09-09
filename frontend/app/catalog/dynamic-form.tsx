import { useId, useState, type SubmitEvent } from "react";
import { post } from "../identity/api";
import { ErrorNotice, Issues } from "./controls";
import {
  matches,
  optionsFor,
  stageIndex,
  validationSchema,
  visibleAnswers,
  type Answers,
  type Configuration,
  type Field,
  type Issue,
  type Service,
  type Variant,
} from "./model";

function Input({
  field,
  config,
  value,
  change,
  required,
  error,
}: {
  field: Field;
  config: Configuration;
  value: Answers[string] | undefined;
  change: (value: Answers[string] | undefined) => void;
  required: boolean;
  error: string | undefined;
}) {
  const id = useId(),
    helpId = id + "-help",
    errorId = id + "-error";
  const description = [field.help ? helpId : "", error ? errorId : ""]
    .filter(Boolean)
    .join(" ");
  const label = field.label + (required ? " (required)" : "");
  const common = {
    id,
    "aria-describedby": description || undefined,
    "aria-invalid": error ? true : undefined,
  };
  const options = optionsFor(field, config);
  const scalar = typeof value === "string" ? value : "";
  let control;
  if (field.type === "radio" || field.type === "multiselect")
    control = (
      <fieldset
        className="catalog-choices"
        aria-describedby={description || undefined}
      >
        <legend>{label}</legend>
        {options.map((option) => (
          <label key={option.key}>
            <input
              type={field.type === "radio" ? "radio" : "checkbox"}
              name={id}
              value={option.key}
              checked={
                field.type === "radio"
                  ? value === option.key
                  : Array.isArray(value) && value.includes(option.key)
              }
              onChange={(event) => {
                if (field.type === "radio") change(option.key);
                else {
                  const existing = Array.isArray(value) ? value : [];
                  change(
                    event.target.checked
                      ? [...existing, option.key]
                      : existing.filter((v) => v !== option.key),
                  );
                }
              }}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
    );
  else if (field.type === "boolean")
    control = (
      <>
        <label htmlFor={id}>{label}</label>
        <select
          {...common}
          value={typeof value === "boolean" ? String(value) : ""}
          onChange={(e) => {
            change(
              e.target.value === "" ? undefined : e.target.value === "true",
            );
          }}
        >
          <option value="">Choose…</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </>
    );
  else if (field.type === "select" || field.type === "rank")
    control = (
      <>
        <label htmlFor={id}>{label}</label>
        <select
          {...common}
          value={scalar}
          onChange={(e) => {
            change(e.target.value || undefined);
          }}
        >
          <option value="">Choose…</option>
          {options.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </>
    );
  else if (field.type === "attachment")
    control = (
      <>
        <label htmlFor={id}>{label}</label>
        <input {...common} type="file" disabled />
        <p className="quiet">
          Private uploads are being prepared. No file is collected here.
        </p>
      </>
    );
  else if (field.type === "long_text")
    control = (
      <>
        <label htmlFor={id}>{label}</label>
        <textarea
          {...common}
          value={scalar}
          maxLength={field.max_length}
          onChange={(e) => {
            change(e.target.value);
          }}
        />
      </>
    );
  else
    control = (
      <>
        <label htmlFor={id}>
          {label}
          {field.unit && ` · ${field.unit}`}
        </label>
        <input
          {...common}
          value={scalar}
          type="text"
          inputMode={
            field.type === "integer"
              ? "numeric"
              : field.type === "decimal"
                ? "decimal"
                : "text"
          }
          maxLength={field.type === "short_text" ? field.max_length : 24}
          onChange={(e) => {
            change(e.target.value);
          }}
        />
        {(field.type === "integer" || field.type === "decimal") && (
          <span className="quiet">
            {field.min}–{field.max}, step {field.step}
          </span>
        )}
      </>
    );
  return (
    <div className="catalog-input">
      {control}
      {field.help && (
        <p id={helpId} className="quiet">
          {field.help}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
export default function DynamicForm({
  config,
  service,
  releaseID,
  slug,
  stage = "estimate",
  pack = "",
  variant,
  paused = false,
  previewPath,
}: {
  config: Configuration;
  service: Service;
  releaseID: string;
  slug: string;
  stage?: string;
  pack?: string;
  variant?: Variant;
  paused?: boolean;
  previewPath?: string;
}) {
  const [raw, setRaw] = useState<Answers>({}),
    [issues, setIssues] = useState<Issue[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [valid, setValid] = useState(false);
  const values = visibleAnswers(service, raw, stage);
  const unavailable = paused || variant?.capacity === 0;
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setIssues([]);
    setValid(false);
    try {
      const result = await post(
        previewPath ?? `/catalog/games/${encodeURIComponent(slug)}/validate`,
        {
          release_id: releaseID,
          service: service.key,
          stage,
          package: pack,
          variant: variant?.key ?? "",
          answers: values,
        },
        validationSchema,
      );
      setIssues(result.issues);
      setRaw(result.answers);
      setValid(result.issues.length === 0);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="dynamic-form"
      onSubmit={(event) => void submit(event)}
      noValidate
    >
      <fieldset disabled={busy || unavailable}>
        <legend>{service.name} selections</legend>
        {service.fields
          .filter(
            (field) =>
              stageIndex(field.stage) <= stageIndex(stage) &&
              matches(field.visible_when, values, service.fields),
          )
          .map((field) => (
            <Input
              key={field.key}
              field={field}
              config={config}
              value={values[field.key]}
              required={
                field.required ||
                (!!field.required_when &&
                  matches(field.required_when, values, service.fields)) ||
                (variant?.required_fields.includes(field.key) ?? false)
              }
              change={(value) => {
                const next: Answers = Object.fromEntries(
                  Object.entries(values).filter(([key]) => key !== field.key),
                );
                if (value !== undefined) next[field.key] = value;
                setRaw(visibleAnswers(service, next, stage));
                setIssues([]);
                setValid(false);
              }}
              error={issues.find((issue) => issue.path === field.key)?.message}
            />
          ))}
        <button className="button" type="submit">
          {busy ? "Checking…" : "Check selections"}
        </button>
      </fieldset>
      <Issues issues={issues} />
      <ErrorNotice error={error} />
      {valid && (
        <p role="status">
          Selections are valid. No order has been created.{" "}
          {variant
            ? "This variant has a fixed price."
            : "A custom order will require an administrator’s final quote."}
        </p>
      )}
      {unavailable && (
        <p role="status">This offering is currently unavailable.</p>
      )}
      <p className="quiet">
        Orders and payments are not open yet. Do not enter game passwords or
        recovery codes in this form.
      </p>
    </form>
  );
}
