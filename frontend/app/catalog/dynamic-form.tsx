import { sessionEventMatches } from "../identity/portal";
import IntakeImage from "../media/intake-image";
import { RequestReference } from "../orders/request-recovery";
import SelectionSummary from "../experience/selection-summary";
import {
  useContext,
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
  intake,
}: {
  field: Field;
  config: Configuration;
  value: Answers[string] | undefined;
  change: (value: Answers[string] | undefined) => void;
  required: boolean;
  error: string | undefined;
  intake?:
    | { scope: string; pending: (busy: boolean) => void; onSignIn: () => void }
    | undefined;
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
        {intake && field.stage === "order" ? (
          <IntakeImage
            scope={intake.scope}
            label={field.label}
            value={Array.isArray(value) ? value[0] : undefined}
            change={(next) => {
              change(next ? [next] : undefined);
            }}
            pending={intake.pending}
            onSignIn={intake.onSignIn}
            describedBy={common["aria-describedby"]}
            invalid={!!error}
          />
        ) : (
          <>
            <p>{label}</p>
            <p className="quiet">
              {field.stage === "order"
                ? "Private screenshot upload is available in the customer request form."
                : "Share optional evidence in the order’s messages after submission."}
            </p>
          </>
        )}
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
  journey,
  intakeScope,
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
  intakeScope?: string;
  journey?: { review: () => void; invalidate: () => void; edit: () => void };
}) {
  const reference = useContext(RequestReference);
  const [uploadScope] = useState(
    () => intakeScope || reference || crypto.randomUUID(),
  );
  const [uploads, setUploads] = useState<Record<string, boolean>>({});
  const [uploadEpoch, setUploadEpoch] = useState(0);
  const [raw, setRaw] = useState<Answers>(initialAnswers),
    [issues, setIssues] = useState<Issue[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [valid, setValid] = useState(false),
    [estimate, setEstimate] = useState<Estimate | null>(null),
    [coupon, setCoupon] = useState(initialCoupon);
  const [changed, setChanged] = useState(false);
  useEffect(() => {
    const changed = (event: Event) => {
      if (!sessionEventMatches(event, "customer")) return;
      setRaw((old) =>
        Object.fromEntries(
          Object.entries(old).filter(([key]) =>
            service.fields.some(
              (field) => field.key === key && field.stage === "estimate",
            ),
          ),
        ),
      );
      setUploads({});
      setUploadEpoch((v) => v + 1);
      setValid(false);
    };
    window.addEventListener("boosterplus:session-changed", changed);
    return () => {
      window.removeEventListener("boosterplus:session-changed", changed);
    };
  }, [service.fields]);

  const [lastStage, setLastStage] = useState(stage);
  if (lastStage !== stage) {
    setLastStage(stage);
    setChanged(false);
    setValid(false);
    if (!journey) setEstimate(null);
    setIssues([]);
    setError(null);
  }
  const requestSequence = useRef(0);
  useEffect(
    () => () => {
      requestSequence.current += 1;
    },
    [stage, releaseID, service.key, pack, variant?.key],
  );
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
  const uploadPending = service.fields.some(
    (field) =>
      stageIndex(field.stage) <= stageIndex(stage) &&
      matches(field.visible_when, values, service.fields) &&
      uploads[field.key],
  );
  function retainOrderDetails(next: Answers): Answers {
    if (!journey || stage !== "estimate") return next;
    const details = Object.fromEntries(
      Object.entries(raw).filter(([key]) =>
        service.fields.some(
          (field) => field.key === key && field.stage === "order",
        ),
      ),
    );
    return visibleAnswers(service, { ...details, ...next }, "order");
  }
  async function submit(event?: SubmitEvent<HTMLFormElement>, advance = false) {
    event?.preventDefault();
    if (busy || unavailable || uploadPending) return;
    const sequence = ++requestSequence.current;
    setBusy(true);
    setError(null);
    setIssues([]);
    setValid(false);
    if (!journey || stage === "estimate") setEstimate(null);
    setChanged(false);
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
      if (sequence !== requestSequence.current) return;
      setIssues(result.issues);
      setRaw(retainOrderDetails(result.answers));
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
        if (sequence !== requestSequence.current) return;
        setEstimate(price);
        setIssues(price.issues);
        setValid(price.issues.length === 0);
        if (
          advance &&
          price.issues.length === 0 &&
          ["estimated", "manual_review"].includes(price.outcome)
        )
          journey?.review();
      } else {
        setValid(result.issues.length === 0);
        if (advance && result.issues.length === 0) journey?.review();
      }
    } catch (cause) {
      if (sequence !== requestSequence.current) return;
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
      <div className="configuration-layout">
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
                  (!journey || stage !== "order" || field.stage === "order") &&
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
                      key={`${field.key}:${String(uploadEpoch)}`}
                      field={field}
                      intake={
                        !previewPath &&
                        field.type === "attachment" &&
                        (!onCommit || intakeScope)
                          ? {
                              scope: uploadScope,
                              onSignIn: () => {
                                saveConfigurationDraft(
                                  releaseID,
                                  service,
                                  config,
                                  pack,
                                  variant?.key ?? "",
                                  values,
                                );
                              },
                              pending: (pending) => {
                                setUploads((previous) =>
                                  previous[field.key] === pending
                                    ? previous
                                    : { ...previous, [field.key]: pending },
                                );
                              },
                            }
                          : undefined
                      }
                      config={config}
                      value={values[field.key]}
                      required={
                        field.required ||
                        (!!field.required_when &&
                          matches(
                            field.required_when,
                            values,
                            service.fields,
                          )) ||
                        (variant?.required_fields.includes(field.key) ?? false)
                      }
                      change={(value) => {
                        const next: Answers = Object.fromEntries(
                          Object.entries(values).filter(
                            ([key]) => key !== field.key,
                          ),
                        );
                        if (value !== undefined) next[field.key] = value;
                        setRaw(
                          retainOrderDetails(
                            visibleAnswers(service, next, stage),
                          ),
                        );
                        if (stage === "estimate") journey?.invalidate();
                        setChanged(true);
                        setError(null);
                        setIssues([]);
                        setValid(false);
                        if (!journey || stage === "estimate") setEstimate(null);
                      }}
                      error={
                        issues.find((issue) => issue.path === field.key)
                          ?.message
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
          {!previewPath &&
            (!journey || stage === "estimate") &&
            (stage === "estimate" || stage === "order") && (
              <div className="catalog-input">
                <label htmlFor={couponID}>Coupon code (optional)</label>
                <input
                  id={couponID}
                  value={coupon}
                  maxLength={40}
                  onChange={(event) => {
                    setCoupon(event.target.value);
                    journey?.invalidate();
                    setChanged(true);
                    setIssues([]);
                    setEstimate(null);
                    setValid(false);
                    setError(null);
                  }}
                />
                <p className="quiet">
                  One code per order. Eligibility is rechecked when you accept
                  the final price.
                </p>
              </div>
            )}
          {journey && stage === "order" && (
            <p>
              Your goal and preferences are shown in the summary.{" "}
              <button
                type="button"
                className="button compact"
                disabled={uploadPending}
                onClick={journey.edit}
              >
                Edit choices
              </button>
            </p>
          )}
          <div className="configuration-actions">
            <button
              className={
                journey && stage === "estimate" ? "button secondary" : "button"
              }
              type="submit"
              disabled={uploadPending}
            >
              {busy ? "Checking…" : "Check selections"}
            </button>
            {journey && stage === "estimate" && (
              <button
                className="button"
                type="button"
                onClick={() => void submit(undefined, true)}
              >
                {busy ? "Checking…" : "Continue to order information →"}
              </button>
            )}
          </div>
        </fieldset>
        {!previewPath && !onCommit && (
          <SelectionSummary
            config={config}
            service={service}
            values={values}
            stage={stage}
            fixed={!!variant}
            state={
              unavailable
                ? "unavailable"
                : busy
                  ? "checking"
                  : error
                    ? "error"
                    : issues.length
                      ? "invalid"
                      : estimate?.outcome === "manual_review"
                        ? "manual"
                        : estimate?.outcome === "estimated"
                          ? "estimated"
                          : valid
                            ? "valid"
                            : changed
                              ? "changed"
                              : "unchecked"
            }
          />
        )}
      </div>
      <Issues issues={issues} />
      <ErrorNotice error={error} />
      {uploadPending && (
        <p role="status">
          Finish checking or remove the selected image before continuing.
        </p>
      )}
      {valid && !uploadPending && (
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
        !uploadPending &&
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
            intakeKey={uploadScope}
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
