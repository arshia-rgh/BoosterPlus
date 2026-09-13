import SelectionSummary from "../experience/selection-summary";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type SubmitEvent,
} from "react";
import {
  draftSnapshot,
  subscribeDraft,
  restoreConfiguration,
  saveConfigurationDraft,
} from "./configuration-draft";
import "./discovery.css";
import SubmitOrder from "../orders/submit";
import { Action } from "./controls";
import { post } from "../identity/api";
import { ErrorNotice, Issues } from "./controls";
import {
  matches,
  optionsFor,
  stageIndex,
  validationSchema,
  estimateSchema,
  type Estimate,
  visibleAnswers,
  type Answers,
  type Configuration,
  type Field,
  type Issue,
  type Service,
  type Variant,
} from "./model";

export function Input({
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
              aria-invalid={error ? true : undefined}
              aria-describedby={description || undefined}
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
function ConfigurationForm({
  config,
  service,
  releaseID,
  slug,
  stage = "estimate",
  pack = "",
  variant,
  paused = false,
  previewPath,
  validationPath,
  initialAnswers = {},
  initialCoupon = "",
  onCommit,
}: {
  config: Configuration;
  service: Service;
  releaseID: string;
  slug: string;
  stage?: string;
  pack?: string;
  variant?: Variant | undefined;
  paused?: boolean;
  previewPath?: string;
  validationPath?: string;
  initialAnswers?: Answers;
  initialCoupon?: string;
  onCommit?: (answers: Answers, coupon: string) => Promise<void>;
}) {
  const [raw, setRaw] = useState<Answers>(initialAnswers),
    [issues, setIssues] = useState<Issue[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [valid, setValid] = useState(false),
    [estimate, setEstimate] = useState<Estimate | null>(null),
    [coupon, setCoupon] = useState(initialCoupon);
  const [lastStage, setLastStage] = useState(stage);
  if (lastStage !== stage) {
    setLastStage(stage);
    setValid(false);
    setEstimate(null);
    setIssues([]);
    setError(null);
  }
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!busy && issues.length > 0) {
      form.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
    }
  }, [issues, busy]);
  const couponID = useId();
  const values = visibleAnswers(service, raw, stage);
  const unavailable = paused || variant?.capacity === 0;
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setIssues([]);
    setValid(false);
    setEstimate(null);
    try {
      const result = await post(
        validationPath ??
          previewPath ??
          `/catalog/games/${encodeURIComponent(slug)}/validate`,
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
      if (
        result.issues.length === 0 &&
        !onCommit &&
        ((coupon.trim() !== "" &&
          (stage === "estimate" || variant || service.pricing)) ||
          (!variant && stage === "estimate"))
      ) {
        const price = await post(
          coupon.trim() !== ""
            ? `/catalog/games/${encodeURIComponent(slug)}/discount`
            : previewPath
              ? previewPath.replace("validate-preview", "estimate-preview")
              : `/catalog/games/${encodeURIComponent(slug)}/estimate`,
          {
            release_id: releaseID,
            service: service.key,
            answers: result.answers,
            ...(coupon.trim() !== ""
              ? {
                  code: coupon.trim(),
                  stage,
                  package: pack,
                  variant: variant?.key ?? "",
                }
              : {}),
          },
          estimateSchema,
        );
        setEstimate(price);
        setIssues(price.issues);
        setValid(price.issues.length === 0);
      } else {
        setValid(result.issues.length === 0);
      }
    } catch (cause) {
      setValid(false);
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="dynamic-form guided-configuration"
      ref={form}
      onSubmit={(event) => void submit(event)}
      noValidate
    >
      <fieldset disabled={busy || unavailable}>
        <legend>{service.name} selections</legend>
        {service.fulfillment && (
          <details className="configuration-privacy">
            <summary>How your information is shared</summary>
            <p>
              After payment, your assigned booster can see these selected
              fields:{" "}
              {service.fields
                .filter((field) =>
                  service.fulfillment?.share_fields.includes(field.key),
                )
                .map((field) => field.label)
                .join(", ") || "none"}
              . Temporary game access is collected separately only for
              play-on-account work.
            </p>
          </details>
        )}
        {[
          {
            title: "Your goal",
            fields: service.fields.filter((field) => field.type === "rank"),
          },
          {
            title: "Play mode",
            fields: service.fields.filter(
              (field) =>
                field.type !== "rank" &&
                service.fulfillment?.field === field.key,
            ),
          },
          {
            title: "Your preferences",
            fields: service.fields.filter(
              (field) =>
                field.type !== "rank" &&
                service.fulfillment?.field !== field.key &&
                field.stage === "estimate",
            ),
          },
          {
            title: "Order details",
            fields: service.fields.filter(
              (field) =>
                field.type !== "rank" &&
                service.fulfillment?.field !== field.key &&
                field.stage !== "estimate",
            ),
          },
        ]
          .map((group) => ({
            ...group,
            fields: group.fields.filter(
              (field) =>
                stageIndex(field.stage) <= stageIndex(stage) &&
                matches(field.visible_when, values, service.fields),
            ),
          }))
          .filter((group) => group.fields.length > 0)
          .map((group) => (
            <section
              className="configuration-group"
              key={group.title}
              aria-label={group.title}
            >
              <h2>{group.title}</h2>
              <div className="configuration-fields">
                {group.fields.map((field) => (
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
                        Object.entries(values).filter(
                          ([key]) => key !== field.key,
                        ),
                      );
                      if (value !== undefined) next[field.key] = value;
                      setRaw(visibleAnswers(service, next, stage));
                      setIssues([]);
                      setValid(false);
                      setEstimate(null);
                    }}
                    error={
                      issues.find((issue) => issue.path === field.key)?.message
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        {!previewPath && (stage === "estimate" || stage === "order") && (
          <div className="catalog-input">
            <label htmlFor={couponID}>Coupon code (optional)</label>
            <input
              id={couponID}
              value={coupon}
              maxLength={40}
              onChange={(event) => {
                setCoupon(event.target.value);
                setEstimate(null);
                setValid(false);
                setError(null);
              }}
            />
            <p className="quiet">
              One code per order. Eligibility is rechecked when you accept the
              final price.
            </p>
          </div>
        )}
        <button className="button" type="submit">
          {busy ? "Checking…" : "Check selections"}
        </button>
      </fieldset>
      {!previewPath && !onCommit && (
        <SelectionSummary
          config={config}
          service={service}
          values={values}
          stage={stage}
          fixed={!!variant}
        />
      )}
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
      {estimate && (
        <section aria-label="Price estimate" aria-live="polite">
          {estimate.outcome === "estimated" ? (
            <>
              <h2>
                Estimated price: {estimate.currency}{" "}
                {minorDisplay(estimate.amount_minor)}
              </h2>
              <ul>
                {estimate.lines.map((line) => (
                  <li key={line.key}>
                    {line.label}: {estimate.currency}{" "}
                    {minorDisplay(line.amount_minor)}
                  </li>
                ))}
              </ul>
              <p>
                {variant
                  ? "Package discount is provisional until checkout."
                  : "Final price requires an administrator’s quote."}{" "}
                This estimate expires{" "}
                {new Date(estimate.expires_at).toLocaleTimeString()}.
              </p>
              {estimate.discount && (
                <p>
                  Coupon checks do not reserve a use. Personal limits apply when
                  signed in; eligibility is checked again when the order becomes
                  payable.
                </p>
              )}
            </>
          ) : estimate.outcome === "manual_review" ? (
            <p>Your selections need a manual price review.</p>
          ) : null}
        </section>
      )}
      {valid &&
        stage === "order" &&
        !previewPath &&
        !unavailable &&
        (onCommit ? (
          <Action
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError(null);
              void onCommit(values, coupon)
                .catch((cause: unknown) => {
                  setError(cause);
                })
                .finally(() => {
                  setBusy(false);
                });
            }}
          >
            Save revised request
          </Action>
        ) : (
          <SubmitOrder
            onSignIn={() => {
              saveConfigurationDraft(
                releaseID,
                service,
                config,
                pack,
                variant?.key ?? "",
                values,
              );
            }}
            slug={slug}
            service={service.key}
            releaseID={releaseID}
            pack={pack}
            variant={variant}
            answers={values}
            coupon={coupon}
            estimate={estimate}
            setBusy={setBusy}
          />
        ))}
      {unavailable && (
        <p role="status">This offering is currently unavailable.</p>
      )}
      <p className="quiet">
        Do not enter game passwords or recovery codes in this form.
      </p>
    </form>
  );
}

export function minorDisplay(value: string): string {
  const amount = BigInt(value),
    negative = amount < 0n,
    absolute = negative ? -amount : amount;
  return `${negative ? "−" : ""}${String(absolute / 100n)}.${String(absolute % 100n).padStart(2, "0")}`;
}

export default function DynamicForm(
  props: ComponentProps<typeof ConfigurationForm>,
) {
  const raw = useSyncExternalStore(subscribeDraft, draftSnapshot, () => null);
  const restored =
    !props.previewPath && !props.onCommit && !props.initialAnswers
      ? restoreConfiguration(
          raw,
          props.releaseID,
          props.service,
          props.config,
          props.pack ?? "",
          props.variant?.key ?? "",
        )
      : null;
  return (
    <>
      {restored && (
        <p role="status" className="configuration-resumed">
          Your saved choices are restored. Check them against the current
          catalog before submitting. Private details and consent must be entered
          again.
        </p>
      )}
      <ConfigurationForm
        {...props}
        key={raw && raw.length <= 20000 ? raw : "fresh"}
        initialAnswers={props.initialAnswers ?? restored ?? {}}
      />
    </>
  );
}
