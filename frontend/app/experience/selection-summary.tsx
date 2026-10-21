import { useId, useRef, type ReactNode } from "react";
import { formatWinRate, isWinRateField } from "../catalog/win-rate";
import {
  matches,
  optionsFor,
  stageIndex,
  type Answers,
  type Configuration,
  type Service,
} from "../catalog/model";
export function selectedLabel(
  value: Answers[string] | undefined,
  options: { key: string; label: string }[],
) {
  if (
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  )
    return "Not selected";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value))
    return value
      .map((key) => options.find((option) => option.key === key)?.label ?? key)
      .join(", ");
  if (typeof value === "object")
    return value.groups
      .map(
        (group) =>
          `${options.find((option) => option.key === group.category)?.label ?? group.category}: ${group.count} · ${group.names.join(", ")}`,
      )
      .join("; ");
  return options.find((option) => option.key === value)?.label ?? value;
}
export default function SelectionSummary({
  config,
  service,
  values,
  stage,
  fixed,
  editableFields,
  state = "unchecked",
  compact = false,
  price,
  priceDetails,
  retry,
}: {
  config: Configuration;
  service: Service;
  values: Answers;
  stage: string;
  fixed: boolean;
  editableFields?: readonly string[] | undefined;
  compact?: boolean;
  price?: ReactNode;
  priceDetails?: ReactNode;
  retry?: (() => void) | undefined;
  state?:
    | "unchecked"
    | "checking"
    | "estimated"
    | "manual"
    | "valid"
    | "changed"
    | "invalid"
    | "unavailable"
    | "error";
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const detailsTitle = useId();
  const fields = service.fields.filter(
    (field) =>
      (!fixed || editableFields?.includes(field.key)) &&
      stageIndex(field.stage) <= stageIndex(stage) &&
      matches(field.visible_when, values, service.fields),
  );
  const chosen = fields.filter((field) => {
    const value = values[field.key];
    return (
      value !== undefined &&
      value !== "" &&
      (!Array.isArray(value) || value.length > 0)
    );
  }).length;
  // Free text, attachments and personal order information stay in their inputs.
  const summary = fields.filter(
    (field) =>
      !fixed &&
      [
        "rank",
        "select",
        "radio",
        "multiselect",
        "boolean",
        "integer",
        "decimal",
        "win_rate",
      ].includes(field.type) &&
      field.stage === "estimate",
  );
  const choices = (
    <>
      {fields.length > 0 && (
        <>
          <p>
            {fixed
              ? `${String(chosen)} of ${String(fields.length)} details added`
              : `${String(chosen)} of ${String(fields.length)} answered`}
          </p>
          <progress
            className="selection-progress"
            aria-label={fixed ? "Details added" : "Fields answered"}
            value={chosen}
            max={fields.length}
          />
        </>
      )}
      {summary.length > 0 && (
        <dl>
          {summary.map((field) => (
            <div key={field.key}>
              <dt>{field.label}</dt>
              <dd>
                {isWinRateField(field) && typeof values[field.key] === "string"
                  ? formatWinRate(values[field.key] as string)
                  : selectedLabel(values[field.key], optionsFor(field, config))}
                {!isWinRateField(field) &&
                field.unit &&
                values[field.key] !== undefined
                  ? ` ${field.unit}`
                  : ""}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <p className="selection-guidance">
        {state === "unavailable"
          ? "This offering is unavailable. You can review the options, but cannot request an order."
          : state === "checking"
            ? "Checking your current selections…"
            : state === "error"
              ? "We couldn't finish checking. Try again before continuing."
              : state === "invalid"
                ? "Some selections need attention."
                : state === "changed"
                  ? "Selections changed. Check again for an updated result."
                  : state === "manual"
                    ? "These selections need a manual price review. Continue to request a quote from our team."
                    : state === "estimated"
                      ? fixed
                        ? "Your provisional package discount is shown here. Eligibility is checked again at checkout."
                        : "Your provisional estimate is shown here. Our team confirms the final quote before you pay."
                      : state === "valid"
                        ? "Selections checked. Review and consent below to submit."
                        : fixed
                          ? "Add your details, then continue."
                          : "Choose your goal to see an estimate."}
      </p>
    </>
  );
  return (
    <aside
      className={`selection-summary${compact ? " selection-summary-live" : ""}`}
      aria-label="Selection summary"
    >
      <p className="eyebrow">{fixed ? "YOUR PACKAGE" : "YOUR CONFIGURATION"}</p>
      <h2>
        {fixed ? "Fixed contents, clear delivery." : "Build your next climb."}
      </h2>
      {price}
      {compact ? (
        <>
          <div className="selection-summary-actions">
            <button
              className="button secondary compact"
              type="button"
              aria-haspopup="dialog"
              onClick={(event) => {
                event.currentTarget.focus();
                dialog.current?.showModal();
              }}
            >
              Price &amp; selections
            </button>
            {retry && (
              <button
                className="button secondary compact"
                type="button"
                aria-label="Refresh estimate"
                onClick={retry}
              >
                Refresh
              </button>
            )}
          </div>
          <dialog
            ref={dialog}
            className="selection-details-dialog"
            aria-labelledby={detailsTitle}
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const controls = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>(
                  "button:not(:disabled), summary, a[href], [tabindex='0']",
                ),
              ).filter((element) => element.getClientRects().length > 0);
              const first = controls[0],
                last = controls.at(-1);
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }}
          >
            <div className="selection-details-heading">
              <h2 id={detailsTitle}>Price &amp; selections</h2>
              <button
                className="button secondary compact"
                type="button"
                onClick={() => dialog.current?.close()}
              >
                Close details
              </button>
            </div>
            {priceDetails}
            {choices}
          </dialog>
        </>
      ) : (
        choices
      )}
    </aside>
  );
}
