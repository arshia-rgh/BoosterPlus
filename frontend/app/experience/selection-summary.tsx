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
  return options.find((option) => option.key === value)?.label ?? value;
}
export default function SelectionSummary({
  config,
  service,
  values,
  stage,
  fixed,
  state = "unchecked",
}: {
  config: Configuration;
  service: Service;
  values: Answers;
  stage: string;
  fixed: boolean;
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
  const fields = service.fields.filter(
    (field) =>
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
      [
        "rank",
        "select",
        "radio",
        "multiselect",
        "boolean",
        "integer",
        "decimal",
      ].includes(field.type) && field.stage === "estimate",
  );
  return (
    <aside className="selection-summary" aria-label="Selection summary">
      <p className="eyebrow">YOUR CONFIGURATION</p>
      <h2>{fixed ? "Make it yours." : "Build your next climb."}</h2>
      <p>
        {chosen} of {fields.length} visible fields answered. This is a
        completion guide, not validation.
      </p>
      <progress
        className="selection-progress"
        aria-label="Visible fields answered"
        value={chosen}
        max={Math.max(1, fields.length)}
      />
      <dl>
        {summary.map((field) => (
          <div key={field.key}>
            <dt>{field.label}</dt>
            <dd>
              {selectedLabel(values[field.key], optionsFor(field, config))}
              {field.unit && values[field.key] !== undefined
                ? ` ${field.unit}`
                : ""}
            </dd>
          </div>
        ))}
      </dl>
      <p className="selection-guidance">
        {state === "unavailable"
          ? "This offering is unavailable. You can review the options, but cannot request an order."
          : state === "checking"
            ? "Checking your current selections…"
            : state === "error"
              ? "We couldn't finish checking. Try again before continuing."
              : state === "invalid"
                ? "Some selections need attention. Resolve the highlighted issues and check again."
                : state === "changed"
                  ? "Your selections have changed. Check again for an updated result."
                  : state === "manual"
                    ? "These selections need a manual price review. Continue to request a quote from our team."
                    : state === "estimated"
                      ? fixed
                        ? "Your provisional package discount is below. Eligibility is checked again at checkout."
                        : "Your provisional estimate is below. Our team confirms the final quote before you pay."
                      : state === "valid"
                        ? "Your selections are checked. Review the request and consent below before submitting."
                        : fixed
                          ? "Review the published variant price and check your selections before creating your order."
                          : "Check your selections for a provisional estimate. Our team reviews your request before you accept a final quote."}
      </p>
      <p>
        Private order details stay in the form. Selected non-private choices can
        be restored after sign-in.
      </p>
    </aside>
  );
}
