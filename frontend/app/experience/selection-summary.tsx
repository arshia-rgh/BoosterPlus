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
}: {
  config: Configuration;
  service: Service;
  values: Answers;
  stage: string;
  fixed: boolean;
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
      <p>
        {fixed
          ? "The published package price applies to this variant. Review it before creating your order."
          : "Check your selections for a provisional estimate. Our team reviews your request before you accept a final quote."}
      </p>
      <p>
        Private order details stay in the form. Nothing is saved until you
        submit.
      </p>
    </aside>
  );
}
