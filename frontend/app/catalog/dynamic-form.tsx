import ChoiceInput from "./choice-input";
import PriceEstimate from "./price-estimate";
import { useLiveEstimate } from "./live-estimate";
export { minorDisplay } from "./price-estimate";
import { rankUnitsField, rankUnitsError, isRankGoalField } from "./rank-units";
import CosmeticsInput from "./cosmetics-input";
import {
  packageAnswers,
  packageChoiceState,
  packageService,
} from "./package-fields";
import WinRateInput from "./win-rate-input";
import {
  changeLinkedChoice,
  linkedChoiceState,
  restoredAutomaticParents,
} from "./linked-choices";
import { isWinRateField, parseWinRate } from "./win-rate";
import {
  FieldValidation,
  fieldError,
  useFormValidation,
} from "../ui/form-validation";
import { sessionEventMatches } from "../identity/portal";
import IntakeImage from "../media/intake-image";
import { RequestReference } from "../orders/request-recovery";
import SelectionSummary from "../experience/selection-summary";
import {
  useCallback,
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
  restoreDraftParents,
  saveConfigurationDraft,
} from "./configuration-draft";
import "./discovery.css";
import SubmitOrder from "../orders/submit";
import { Action } from "./controls";
import { APIError, post } from "../identity/api";
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

const subscribeHydration = () => () => undefined;
const clientHydrated = () => true;
const serverHydrated = () => false;

export function Input({
  field,
  config,
  value,
  change,
  required,
  error: suppliedError,
  rangeError,
  intake,
  choiceState,
  validationName,
}: {
  field: Field;
  config: Configuration;
  value: Answers[string] | undefined;
  change: (value: Answers[string] | undefined) => void;
  required: boolean;
  error: string | undefined;
  rangeError?: string | undefined;
  choiceState?: ReturnType<typeof linkedChoiceState> | undefined;
  validationName?: string;
  intake?:
    | { scope: string; pending: (busy: boolean) => void; onSignIn: () => void }
    | undefined;
}) {
  const validation = useContext(FieldValidation);
  const name = validationName ?? field.key;
  const [editing, setEditing] = useState(false);
  const error =
    suppliedError ||
    fieldError(validation, name) ||
    (!editing ? rangeError : undefined);
  const id = useId(),
    helpId = id + "-help",
    errorId = id + "-error";
  const register = validation?.register;
  const fieldRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && register)
        return register({
          name,
          id: id + "-field",
          label: field.label,
        });
    },
    [name, field.label, id, register],
  );
  const description = [
    field.help || choiceState?.hint ? helpId : "",
    error ? errorId : "",
  ]
    .filter(Boolean)
    .join(" ");
  const label = field.label + (required ? " (required)" : "");
  const common = {
    id,
    "aria-describedby": description || undefined,
    "aria-invalid": error ? true : undefined,
    disabled: choiceState?.disabled,
  };
  const options = choiceState?.options ?? optionsFor(field, config);
  const scalar = typeof value === "string" ? value : "";
  let control;
  if (field.type === "cosmetics")
    control = (
      <CosmeticsInput
        field={field}
        config={config}
        value={value}
        change={change}
        name={name}
        label={label}
        describedBy={description || undefined}
        invalid={!!error}
      />
    );
  else if (isWinRateField(field))
    control = (
      <WinRateInput
        id={id}
        label={label}
        value={scalar}
        change={change}
        error={error}
        describedBy={field.help ? helpId : undefined}
      />
    );
  else if (field.type === "radio" || field.type === "multiselect")
    control = (
      <ChoiceInput
        field={field}
        options={options}
        value={value}
        change={change}
        id={id}
        label={label}
        describedBy={description || undefined}
        invalid={!!error}
        disabled={choiceState?.disabled}
      />
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
          onFocus={() => {
            setEditing(true);
          }}
          onBlur={() => {
            setEditing(false);
          }}
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
    <div ref={fieldRef} id={id + "-field"} className="catalog-input">
      {control}
      {choiceState?.restriction && (
        <Action
          onClick={() => {
            change(choiceState.restriction?.value);
          }}
        >
          {choiceState.restriction.label}
        </Action>
      )}
      {(field.help || choiceState?.hint) && (
        <p id={helpId} className="quiet">
          {field.help} {choiceState?.hint}
        </p>
      )}
      {error && !isWinRateField(field) && (
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
  initialAutomaticParents,
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
  initialAutomaticParents?: ReadonlySet<string> | undefined;
  initialCoupon?: string;
  onCommit?: (answers: Answers, coupon: string) => Promise<void>;
  intakeScope?: string;
  journey?: { review: () => void; invalidate: () => void; edit: () => void };
}) {
  // Server-rendered controls must not accept input before React can retain it.
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    clientHydrated,
    serverHydrated,
  );
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
  const [automaticParents, setAutomaticParents] = useState<ReadonlySet<string>>(
    () =>
      initialAutomaticParents ??
      restoredAutomaticParents(service, initialAnswers),
  );
  const [choiceNotice, setChoiceNotice] = useState(() =>
    initialAutomaticParents === undefined &&
    restoredAutomaticParents(service, initialAnswers).size
      ? "Saved categories match your choices. All choices remain available; use the limit button to narrow them."
      : "",
  );
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
  const validation = useFormValidation(
    issues,
    (name) => {
      setIssues((current) => current.filter((issue) => issue.path !== name));
    },
    undefined,
    !busy,
  );
  const couponID = useId();
  const register = validation.register;
  const couponRef = useCallback(
    (input: HTMLInputElement | null) => {
      if (input)
        return register({ name: "code", id: couponID, label: "Coupon code" });
    },
    [couponID, register],
  );
  const couponError = fieldError(validation, "code");
  const values = visibleAnswers(
    service,
    variant ? packageAnswers(raw, variant) : raw,
    stage,
  );
  const unavailable =
    paused ||
    variant?.capacity === 0 ||
    (!!variant && variant.preset_answers === undefined);
  const uploadPending = service.fields.some(
    (field) =>
      stageIndex(field.stage) <= stageIndex(stage) &&
      matches(field.visible_when, values, service.fields) &&
      uploads[field.key],
  );
  const liveSummary = !!journey && !variant && !previewPath && !onCommit;
  const estimateAnswers = visibleAnswers(service, raw, "estimate");
  const complete = service.fields
    .filter(
      (field) =>
        field.stage === "estimate" &&
        matches(field.visible_when, estimateAnswers, service.fields),
    )
    .every((field) => {
      const value = estimateAnswers[field.key];
      const required =
        field.required ||
        (!!field.required_when &&
          matches(field.required_when, estimateAnswers, service.fields));
      if (
        required &&
        (value === undefined ||
          value === "" ||
          (Array.isArray(value) && value.length === 0))
      )
        return false;
      if (
        isWinRateField(field) &&
        typeof value === "string" &&
        ["invalid", "legacy"].includes(parseWinRate(value).kind)
      )
        return false;
      return !rankUnitsError(service, config, field, estimateAnswers);
    });
  const live = useLiveEstimate({
    enabled:
      liveSummary &&
      stage === "estimate" &&
      hydrated &&
      !unavailable &&
      !busy &&
      !valid,
    complete,
    slug,
    releaseID,
    service: service.key,
    answers: estimateAnswers,
    coupon,
  });
  const shownEstimate =
    estimate ?? (!issues.length && !error && !busy ? live.estimate : undefined);
  const priceState = unavailable
    ? "unavailable"
    : busy
      ? "checking"
      : issues.length
        ? "invalid"
        : live.state;
  const retryEstimate =
    !unavailable &&
    !busy &&
    !issues.length &&
    ["error", "expired"].includes(live.state)
      ? live.retry
      : undefined;
  const priceView = (liveSummary || estimate) && (
    <PriceEstimate
      estimate={shownEstimate}
      fixed={!!variant}
      compact={liveSummary}
      state={priceState}
      message={live.message}
      retry={retryEstimate}
    />
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
    if (!hydrated || busy || unavailable || uploadPending) return;
    const preferenceIssues = service.fields
      .filter(
        (field) =>
          isWinRateField(field) &&
          typeof values[field.key] === "string" &&
          ["invalid", "legacy"].includes(
            parseWinRate(values[field.key] as string).kind,
          ),
      )
      .map((field) => ({
        path: field.key,
        message:
          "Choose a win-rate preference and enter valid percentages before continuing.",
      }));
    if (preferenceIssues.length) {
      setIssues(preferenceIssues);
      setValid(false);
      return;
    }
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
      if (result.issues.length === 0)
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
      if (cause instanceof APIError) setIssues(cause.issues);
    } finally {
      setBusy(false);
    }
  }
  return (
    <FieldValidation value={validation}>
      <form
        className="dynamic-form guided-configuration"
        ref={form}
        onSubmit={(event) => void submit(event)}
        noValidate
      >
        {!hydrated && <p role="status">Preparing your form…</p>}
        <noscript>
          JavaScript is needed to configure and submit an order.
        </noscript>
        <div className="configuration-layout">
          <fieldset disabled={!hydrated || busy || unavailable}>
            <legend>
              {variant
                ? "Your delivery information"
                : `${service.name} selections`}
            </legend>
            {choiceNotice && <p role="status">{choiceNotice}</p>}
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
                fields: service.fields.filter((field) =>
                  isRankGoalField(service, field),
                ),
              },
              {
                title: "Play mode",
                fields: service.fields.filter(
                  (field) =>
                    !isRankGoalField(service, field) &&
                    service.fulfillment?.field === field.key,
                ),
              },
              {
                title: "Your preferences",
                fields: service.fields.filter(
                  (field) =>
                    !isRankGoalField(service, field) &&
                    service.fulfillment?.field !== field.key &&
                    field.stage === "estimate",
                ),
              },
              {
                title: "Order details",
                fields: service.fields.filter(
                  (field) =>
                    !isRankGoalField(service, field) &&
                    service.fulfillment?.field !== field.key &&
                    field.stage !== "estimate",
                ),
              },
            ]
              .map((group) => ({
                ...group,
                fields: group.fields.filter(
                  (field) =>
                    (!variant || variant.required_fields.includes(field.key)) &&
                    stageIndex(field.stage) <= stageIndex(stage) &&
                    (!journey ||
                      stage !== "order" ||
                      field.stage === "order") &&
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
                        field={rankUnitsField(service, config, field, values)}
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
                                    automaticParents,
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
                        choiceState={packageChoiceState(
                          service,
                          config,
                          field,
                          values,
                          automaticParents,
                          variant,
                        )}
                        value={values[field.key]}
                        required={
                          field.required ||
                          (!!field.required_when &&
                            matches(
                              field.required_when,
                              values,
                              service.fields,
                            )) ||
                          (variant?.required_fields.includes(field.key) ??
                            false)
                        }
                        change={(value) => {
                          const linked = changeLinkedChoice(
                            service,
                            values,
                            field.key,
                            value,
                            automaticParents,
                          );
                          const next = linked.answers;
                          setAutomaticParents(linked.automatic);
                          setChoiceNotice(linked.notice);
                          setRaw(
                            retainOrderDetails(
                              visibleAnswers(service, next, stage),
                            ),
                          );
                          if (stage === "estimate") journey?.invalidate();
                          setChanged(true);
                          setError(null);
                          setIssues((current) =>
                            current.filter(
                              (issue) =>
                                issue.path !== field.key &&
                                (!service.fields.some(
                                  (candidate) => candidate.key === issue.path,
                                ) ||
                                  service.fields.some(
                                    (candidate) =>
                                      candidate.key === issue.path &&
                                      matches(
                                        candidate.visible_when,
                                        next,
                                        service.fields,
                                      ),
                                  )),
                            ),
                          );
                          setValid(false);
                          if (!journey || stage === "estimate")
                            setEstimate(null);
                        }}
                        rangeError={rankUnitsError(
                          service,
                          config,
                          field,
                          values,
                        )}
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
                    ref={couponRef}
                    id={couponID}
                    aria-invalid={couponError ? true : undefined}
                    aria-describedby={
                      couponError ? couponID + "-error" : undefined
                    }
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
                  journey && stage === "estimate"
                    ? "button secondary"
                    : "button"
                }
                type="submit"
                disabled={uploadPending}
              >
                {busy
                  ? "Checking…"
                  : variant
                    ? "Continue with this package"
                    : "Check selections"}
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
              compact={liveSummary}
              price={priceView}
              priceDetails={
                liveSummary && (
                  <PriceEstimate
                    estimate={shownEstimate}
                    state={priceState}
                    message={live.message}
                    retry={retryEstimate}
                  />
                )
              }
              retry={liveSummary ? retryEstimate : undefined}
              state={
                unavailable
                  ? "unavailable"
                  : busy
                    ? "checking"
                    : error
                      ? "error"
                      : issues.length
                        ? "invalid"
                        : shownEstimate?.outcome === "manual_review"
                          ? "manual"
                          : shownEstimate?.outcome === "estimated"
                            ? "estimated"
                            : valid
                              ? "valid"
                              : liveSummary && live.state === "checking"
                                ? "checking"
                                : liveSummary && live.state === "error"
                                  ? "error"
                                  : liveSummary && live.state === "invalid"
                                    ? "invalid"
                                    : changed
                                      ? "changed"
                                      : "unchecked"
              }
            />
          )}
        </div>
        <Issues issues={issues} />
        <ErrorNotice error={error} hideIssues />
        {uploadPending && (
          <p role="status">
            Finish checking or remove the selected image before continuing.
          </p>
        )}
        {valid && !uploadPending && (
          <p role="status">
            Selections are valid. No order has been created.{" "}
            {variant
              ? "Your delivery information is ready. This package has a fixed price."
              : "A custom order will require an administrator’s final quote."}
          </p>
        )}
        {(previewPath || onCommit) && priceView}
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
                  automaticParents,
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
    </FieldValidation>
  );
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
  const [restoredKey, setRestoredKey] = useState<string | null>(null);
  if (restored && raw && raw !== restoredKey) setRestoredKey(raw);
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
        service={
          props.variant
            ? packageService(props.service, props.variant)
            : props.service
        }
        // An unrelated or expired saved draft must not remount this form and
        // discard current input when the client storage snapshot becomes ready.
        key={restoredKey ?? "fresh"}
        initialAnswers={props.initialAnswers ?? restored ?? {}}
        initialAutomaticParents={
          restored && raw
            ? restoreDraftParents(raw, props.service, restored)
            : props.initialAutomaticParents
        }
      />
    </>
  );
}
