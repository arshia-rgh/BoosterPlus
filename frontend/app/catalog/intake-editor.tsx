import { Action, Check, Ordering, Text, move, nextKey } from "./controls";
import { FieldEditor, RuleEditor } from "./editor-parts";
import {
  emptyField,
  intakeService,
  type Configuration,
  type IntakeForm,
} from "./model";

export default function IntakeEditor({
  config,
  change,
}: {
  config: Configuration;
  change: (value: IntakeForm | undefined) => void;
}) {
  const form = config.intake;
  return (
    <section className="catalog-section">
      <h2>Account resale intake</h2>
      <p>
        Declare the ordinary attributes sellers must provide for private review.
        This does not publish inventory or offer a purchase price. Ownership
        screenshots use the private review conversation; credentials belong to a
        later secure transfer.
      </p>
      <Check
        label="Accept account submissions"
        value={!!form}
        change={(enabled) => {
          change(
            enabled
              ? {
                  name: "Account review",
                  description: "",
                  fields: [],
                  rules: [],
                }
              : undefined,
          );
        }}
      />
      {form && (
        <>
          <Text
            name={`intake.name`}
            label="Intake form name"
            value={form.name}
            change={(name) => {
              change({ ...form, name });
            }}
          />
          <Text
            name={`intake.description`}
            label="Intake instructions"
            multiline
            value={form.description}
            change={(description) => {
              change({ ...form, description });
            }}
          />
          {form.fields.map((field, index) => (
            <details key={index} className="catalog-item">
              <summary>Account attribute: {field.label}</summary>
              <FieldEditor
                path={`intake.fields.${String(index)}`}
                intake
                field={field}
                service={intakeService(form)}
                config={config}
                change={(patch) => {
                  change({
                    ...form,
                    fields: form.fields.map((f, i) =>
                      i === index ? { ...f, ...patch } : f,
                    ),
                  });
                }}
              />
              <Ordering
                index={index}
                count={form.fields.length}
                change={(direction) => {
                  change({
                    ...form,
                    fields: move(form.fields, index, direction),
                  });
                }}
                remove={() => {
                  change({
                    ...form,
                    fields: form.fields.filter((_, i) => i !== index),
                  });
                }}
              />
            </details>
          ))}
          <Action
            disabled={form.fields.length >= 40}
            onClick={() => {
              change({
                ...form,
                fields: [
                  ...form.fields,
                  {
                    ...emptyField(nextKey("attribute", form.fields)),
                    stage: "order",
                  },
                ],
              });
            }}
          >
            Add account attribute
          </Action>
          {form.rules.map((rule, index) => (
            <details key={index} className="catalog-item">
              <summary>Account rule: {rule.key}</summary>
              <RuleEditor
                path={`intake.rules.${String(index)}`}
                rule={rule}
                fields={form.fields}
                change={(patch) => {
                  change({
                    ...form,
                    rules: form.rules.map((r, i) =>
                      i === index ? { ...r, ...patch } : r,
                    ),
                  });
                }}
              />
              <Ordering
                index={index}
                count={form.rules.length}
                change={(direction) => {
                  change({
                    ...form,
                    rules: move(form.rules, index, direction),
                  });
                }}
                remove={() => {
                  change({
                    ...form,
                    rules: form.rules.filter((_, i) => i !== index),
                  });
                }}
              />
            </details>
          ))}
          <Action
            disabled={form.rules.length >= 40}
            onClick={() => {
              change({
                ...form,
                rules: [
                  ...form.rules,
                  {
                    key: nextKey("intake_rule", form.rules),
                    kind: "reject",
                    message: "These selections need correction.",
                    from: "",
                    to: "",
                    from_units: "",
                    to_units: "",
                  },
                ],
              });
            }}
          >
            Add account rule
          </Action>
        </>
      )}
    </section>
  );
}
