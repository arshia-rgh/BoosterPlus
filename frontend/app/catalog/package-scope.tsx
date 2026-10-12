import { useCallback, useContext, useId, useRef } from "react";
import { FieldValidation, fieldError } from "../ui/form-validation";
import { Action, Select } from "./controls";
import { Input } from "./dynamic-form";
import { selectedLabel } from "../experience/selection-summary";
import { formatWinRate, isWinRateField } from "./win-rate";
import {
  optionsFor,
  type Answers,
  type Field,
  type Configuration,
  type Service,
  type Variant,
} from "./model";

export function PackageContents({
  service,
  config,
  variant,
}: {
  service: Service;
  config: Configuration;
  variant: Variant;
}) {
  const fields = service.fields.filter((field) =>
    Object.hasOwn(variant.preset_answers ?? {}, field.key),
  );
  return (
    <section className="package-contents" aria-label="Included in this package">
      <h3>Included in this package</h3>
      <p>
        These contents are fixed. Only the delivery information below comes from
        you.
      </p>
      {fields.length > 0 && (
        <dl className="package-specifications">
          {fields.map((field) => (
            <div key={field.key}>
              <dt>{field.label}</dt>
              <dd>
                {isWinRateField(field) &&
                typeof variant.preset_answers?.[field.key] === "string"
                  ? formatWinRate(variant.preset_answers[field.key] as string)
                  : selectedLabel(
                      variant.preset_answers?.[field.key],
                      optionsFor(field, config),
                    )}
                {field.unit && !isWinRateField(field) ? ` ${field.unit}` : ""}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <p className="quiet">
        Any custom preferences outside this offer require a separate custom
        request.
      </p>
    </section>
  );
}

export default function PackageScopeEditor({
  service,
  config,
  variant,
  path,
  change,
}: {
  service: Service | undefined;
  config: Configuration;
  variant: Variant;
  path: string;
  change: (patch: Partial<Variant>) => void;
}) {
  const fields =
    service?.fields.filter((field) => field.stage !== "fulfillment") ?? [];
  const declared = [
    ...Object.keys(variant.preset_answers ?? {}),
    ...variant.required_fields,
    ...(variant.excluded_fields ?? []),
  ];
  const unknown = [
    ...new Set(
      declared.filter((key) => !fields.some((field) => field.key === key)),
    ),
  ];
  const remove = (key: string) => ({
    preset_answers: Object.fromEntries(
      Object.entries(variant.preset_answers ?? {}).filter(
        ([name]) => name !== key,
      ),
    ),
    required_fields: variant.required_fields.filter((name) => name !== key),
    excluded_fields: (variant.excluded_fields ?? []).filter(
      (name) => name !== key,
    ),
  });
  return (
    <fieldset className="catalog-item">
      <legend>Fixed contents & delivery information</legend>
      <p>
        Set the offer's ranks, goals, win-rate promise, heroes and other
        included preferences here. Collect only customer-specific facts needed
        for eligibility or delivery. Do not turn a fixed offer back into a
        custom form.
      </p>
      {variant.preset_answers === undefined ? (
        <>
          <p role="status">
            This older offer needs a fixed-scope review before new orders can be
            accepted. Existing orders keep their agreement.
          </p>
          <Action
            name={`${path}.preset_answers`}
            onClick={() => {
              change({ preset_answers: {} });
            }}
          >
            Define fixed contents
          </Action>
        </>
      ) : (
        <>
          <ScopeIssue name={`${path}.preset_answers`} label="Fixed contents" />
          <ScopeIssue
            name={`${path}.excluded_fields`}
            label="Excluded fields"
          />
          {!service && <p>Choose a package service first.</p>}
          {fields.map((field) => {
            const fixed = Object.hasOwn(
              variant.preset_answers ?? {},
              field.key,
            );
            const mode = fixed
              ? "fixed"
              : variant.required_fields.includes(field.key)
                ? "customer"
                : variant.excluded_fields?.includes(field.key)
                  ? "excluded"
                  : "";
            return (
              <section className="catalog-item" key={field.key}>
                <Select
                  name={`${path}.${fixed ? "field_modes" : "preset_answers"}.${field.key}`}
                  label={`${field.label} — source`}
                  value={mode}
                  options={[
                    ["", "Choose how this offer uses this field"],
                    ...(field.type === "attachment"
                      ? []
                      : ([
                          ["fixed", "Fixed package value"],
                          ["customer", "Ask customer for delivery information"],
                        ] as const)),
                    ["excluded", "Not included in this offer"],
                  ]}
                  change={(next) => {
                    const cleared = remove(field.key);
                    change({
                      ...cleared,
                      ...(next === "fixed"
                        ? {
                            preset_answers: {
                              ...cleared.preset_answers,
                              [field.key]:
                                field.default ??
                                (field.type === "boolean"
                                  ? false
                                  : field.type === "multiselect"
                                    ? []
                                    : ""),
                            },
                          }
                        : next === "customer"
                          ? {
                              required_fields: [
                                ...cleared.required_fields,
                                field.key,
                              ],
                            }
                          : next === "excluded"
                            ? {
                                excluded_fields: [
                                  ...cleared.excluded_fields,
                                  field.key,
                                ],
                              }
                            : {}),
                    });
                  }}
                />
                {fixed && (
                  <FixedValue
                    name={`${path}.preset_answers.${field.key}`}
                    field={field}
                    config={config}
                    value={variant.preset_answers?.[field.key]}
                    change={(value) => {
                      change({
                        preset_answers: {
                          ...variant.preset_answers,
                          [field.key]: value ?? "",
                        },
                      });
                    }}
                  />
                )}
                {mode === "customer" && (
                  <p className="quiet">
                    Customers must provide this when it is visible. Package
                    contents and price stay fixed.
                  </p>
                )}
              </section>
            );
          })}
          {unknown.map((key) => (
            <p key={key}>
              Removed field “{key}” is still referenced.{" "}
              <Action
                name={`${path}.${Object.hasOwn(variant.preset_answers ?? {}, key) ? "preset_answers" : "excluded_fields"}.${key}`}
                onClick={() => {
                  change(remove(key));
                }}
              >
                Remove obsolete field {key}
              </Action>
            </p>
          ))}
        </>
      )}
    </fieldset>
  );
}

function ScopeIssue({ name, label }: { name: string; label: string }) {
  const id = useId();
  const validation = useContext(FieldValidation),
    register = validation?.register;
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && register) return register({ name, id, label });
    },
    [name, id, label, register],
  );
  const error = fieldError(validation, name);
  return (
    <div
      ref={ref}
      id={id}
      tabIndex={-1}
      role="group"
      aria-label={label}
      aria-describedby={error ? `${id}-error` : undefined}
    >
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
function FixedValue({
  name,
  field,
  config,
  value,
  change,
}: {
  name: string;
  field: Field;
  config: Configuration;
  value: Answers[string] | undefined;
  change: (value: Answers[string] | undefined) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const choices = optionsFor(field, config);
  const missing = ["select", "rank", "radio", "multiselect"].includes(
    field.type,
  )
    ? (Array.isArray(value)
        ? value
        : typeof value === "string" && value
          ? [value]
          : []
      ).filter((item) => !choices.some((option) => option.key === item))
    : [];
  return (
    <div ref={root}>
      <Input
        validationName={name}
        field={{ ...field, label: `${field.label} — fixed value` }}
        config={config}
        value={value}
        required
        error={undefined}
        change={change}
      />
      {missing.map((item) => (
        <div key={item}>
          <p>
            Unavailable fixed value: {item}. This option is no longer in the
            field’s choices.
          </p>
          <Action
            onClick={() => {
              change(
                Array.isArray(value)
                  ? value.filter((current) => current !== item)
                  : "",
              );
              requestAnimationFrame(() => {
                root.current
                  ?.querySelector<HTMLElement>("select, input, button")
                  ?.focus();
              });
            }}
          >
            Remove unavailable fixed value {item}
          </Action>
        </div>
      ))}
    </div>
  );
}
