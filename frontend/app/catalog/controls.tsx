import "./form-rhythm.css";
import {
  useId,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import {
  FieldValidation,
  fieldError,
  ValidationSummary,
} from "../ui/form-validation";
import { APIError, errorMessage } from "../identity/api";
import { VerificationLink } from "../account/return-path";
import type { Issue, Option, Condition, Field } from "./model";

export function Text({
  name,
  label,
  value,
  change,
  multiline = false,
  type = "text",
  help = "",
  error: localError,
  inputMode,
  step,
}: {
  name?: string | undefined;
  label: string;
  value: string;
  change: (value: string) => void;
  multiline?: boolean;
  type?: string;
  help?: string;
  error?: string | undefined;
  inputMode?: "numeric" | "decimal" | undefined;
  step?: number;
}) {
  const id = useId();
  const helpID = id + "-help";
  const validation = useContext(FieldValidation);
  const register = validation?.register;
  const fieldRef = useCallback(
    (input: HTMLInputElement | HTMLTextAreaElement | null) => {
      if (input && name && register) return register({ name, id, label });
    },
    [name, id, label, register],
  );
  const error = localError || fieldError(validation, name);
  const described =
    [help ? helpID : "", error ? id + "-error" : ""]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className="catalog-label">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          ref={fieldRef}
          name={name}
          id={id}
          value={value}
          onChange={(event) => {
            change(event.target.value);
            if (name) validation?.correct(name);
          }}
          aria-describedby={described}
          aria-invalid={error ? true : undefined}
        />
      ) : (
        <input
          ref={fieldRef}
          name={name}
          id={id}
          type={type}
          inputMode={inputMode}
          step={step}
          value={value}
          onChange={(event) => {
            change(event.target.value);
            if (name) validation?.correct(name);
          }}
          aria-describedby={described}
          aria-invalid={error ? true : undefined}
        />
      )}{" "}
      {help && (
        <span className="quiet" id={helpID}>
          {help}
        </span>
      )}
      {error && (
        <p className="field-error" id={id + "-error"}>
          {error}
        </p>
      )}
    </div>
  );
}

export function NumberInput({
  name,
  label,
  value,
  change,
}: {
  name?: string | undefined;
  label: string;
  value: number;
  change: (value: number) => void;
}) {
  const [draft, setDraft] = useState({
    value,
    text: Number.isFinite(value) ? String(value) : "",
  });
  if (!Object.is(value, draft.value))
    setDraft({ value, text: Number.isFinite(value) ? String(value) : "" });
  const invalid = !Number.isFinite(value);
  return (
    <Text
      name={name}
      label={label}
      inputMode="numeric"
      value={draft.text}
      error={invalid ? "Enter a whole number before continuing." : undefined}
      change={(text) => {
        const parsed =
          /^-?\d+$/.test(text) && Number.isSafeInteger(Number(text))
            ? Number(text)
            : Number.NaN;
        setDraft({ value: parsed, text });
        change(parsed);
      }}
    />
  );
}

export function Check({
  name,
  label,
  value,
  change,
}: {
  label: string;
  name?: string | undefined;
  value: boolean;
  change: (value: boolean) => void;
}) {
  const id = useId();
  const validation = useContext(FieldValidation);
  const register = validation?.register;
  const fieldRef = useCallback(
    (input: HTMLInputElement | null) => {
      if (input && name && register) return register({ name, id, label });
    },
    [name, id, label, register],
  );
  const error = fieldError(validation, name);
  return (
    <div>
      <label className="catalog-check" htmlFor={id}>
        <input
          ref={fieldRef}
          id={id}
          name={name}
          type="checkbox"
          checked={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? id + "-error" : undefined}
          onChange={(event) => {
            change(event.target.checked);
            if (name) validation?.correct(name);
          }}
        />
        {label}
      </label>
      {error && (
        <p className="field-error" id={id + "-error"}>
          {error}
        </p>
      )}
    </div>
  );
}

export function Select({
  name,
  label,
  value,
  change,
  options,
  disabled = false,
}: {
  name?: string | undefined;
  label: string;
  value: string;
  change: (value: string) => void;
  options: readonly (readonly [string, string])[];
  disabled?: boolean;
}) {
  const id = useId();
  const validation = useContext(FieldValidation);
  const register = validation?.register;
  const fieldRef = useCallback(
    (input: HTMLSelectElement | null) => {
      if (input && name && register) return register({ name, id, label });
    },
    [name, id, label, register],
  );
  const error = fieldError(validation, name);
  return (
    <div className="catalog-label">
      <label htmlFor={id}>{label}</label>
      <select
        ref={fieldRef}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? id + "-error" : undefined}
        id={id}
        disabled={disabled}
        value={value}
        onChange={(event) => {
          change(event.target.value);
          if (name) validation?.correct(name);
        }}
      >
        {options.map(([key, name]) => (
          <option value={key} key={key}>
            {name}
          </option>
        ))}
      </select>
      {error && (
        <p className="field-error" id={id + "-error"}>
          {error}
        </p>
      )}
    </div>
  );
}
export function Action({
  name,
  children,
  onClick,
  disabled = false,
}: {
  name?: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  const id = useId();
  const validation = useContext(FieldValidation);
  const register = validation?.register;
  const label = typeof children === "string" ? children : "Configuration";
  const fieldRef = useCallback(
    (button: HTMLButtonElement | null) => {
      if (name && register && button) return register({ name, id, label });
    },
    [name, register, id, label],
  );
  const error = fieldError(validation, name);
  return (
    <>
      <button
        id={id}
        ref={fieldRef}
        type="button"
        className="button compact"
        onClick={onClick}
        disabled={disabled}
        aria-describedby={error ? id + "-error" : undefined}
      >
        {children}
      </button>
      {error && (
        <p id={id + "-error"} className="field-error">
          {error}
        </p>
      )}
    </>
  );
}
export function Issues({ issues }: { issues: Issue[] }) {
  const validation = useContext(FieldValidation);
  return issues.length > 0 ? (
    <div role="alert" className="catalog-issues">
      <p>Check the highlighted details before continuing:</p>
      <ValidationSummary
        issues={issues}
        fields={validation?.fields ?? []}
        focus={validation?.focus}
      />
    </div>
  ) : null;
}
export function ErrorNotice({
  error,
  hideIssues = false,
  message,
}: {
  error: unknown;
  hideIssues?: boolean;
  message?: string | undefined;
}) {
  return error ? (
    <>
      <p role="alert">{message ?? errorMessage(error)}</p>
      <VerificationLink error={error} />
      {!hideIssues && (
        <Issues issues={error instanceof APIError ? error.issues : []} />
      )}
    </>
  ) : null;
}
export function move<T>(items: T[], index: number, direction: number): T[] {
  const result = [...items];
  const target = index + direction;
  const current = result.at(index),
    other = result.at(target);
  if (
    index >= 0 &&
    target >= 0 &&
    current !== undefined &&
    other !== undefined
  ) {
    result.splice(index, 1, other);
    result.splice(target, 1, current);
  }
  return result;
}
export function nextKey(prefix: string, items: { key: string }[]): string {
  let i = 1;
  while (items.some((item) => item.key === `${prefix}_${String(i)}`)) i++;
  return `${prefix}_${String(i)}`;
}
export function Ordering({
  index,
  count,
  change,
  remove,
}: {
  index: number;
  count: number;
  change: (direction: number) => void;
  remove: () => void;
}) {
  return (
    <div className="catalog-actions">
      <Action
        disabled={index === 0}
        onClick={() => {
          change(-1);
        }}
      >
        Move up
      </Action>
      <Action
        disabled={index === count - 1}
        onClick={() => {
          change(1);
        }}
      >
        Move down
      </Action>
      <Action onClick={remove}>Remove</Action>
    </div>
  );
}
export function OptionsEditor({
  path = "options",
  ranks = false,
  options,
  change,
}: {
  path?: string;
  ranks?: boolean;
  options: Option[];
  change: (options: Option[]) => void;
}) {
  const id = useId();
  const validation = useContext(FieldValidation);
  const register = validation?.register;
  const groupRef = useCallback(
    (group: HTMLDivElement | null) => {
      if (group && register)
        return register({ name: path, id, label: "Available options" });
    },
    [path, id, register],
  );
  const error = fieldError(validation, path);
  const update = (i: number, patch: Partial<Option>) => {
    change(
      options.map((option, index) =>
        index === i ? { ...option, ...patch } : option,
      ),
    );
  };
  return (
    <div ref={groupRef} id={id}>
      {ranks && (
        <p className="quiet">
          Option order defines rank progression. Represent each division as an
          entry; units are the stars/points needed to cross that interval. An
          absolute starting value lets customers enter total stars (for example,
          Honor starts at 25 and spans 25 stars, so customers enter 25–49).
        </p>
      )}
      <p className="quiet">
        Keys may match labels, including spaces and capital letters. Keep an
        existing key when changing its label so saved rules and mappings still
        refer to the same option.
      </p>
      {options.map((option, i) => (
        <fieldset className="catalog-item" key={i}>
          <legend>Option {i + 1}</legend>
          <div className="catalog-grid">
            <Text
              name={`${path}.${String(i)}.key`}
              label="Option key"
              value={option.key}
              change={(key) => {
                update(i, { key });
              }}
            />
            <Text
              name={`${path}.${String(i)}.label`}
              label="Option label"
              value={option.label}
              change={(label) => {
                update(i, { label });
              }}
            />
            <NumberInput
              name={`${path}.${String(i)}.units`}
              label="Maximum rank units"
              value={option.units}
              change={(units) => {
                update(i, { units });
              }}
            />
            {ranks && (
              <Text
                name={`${path}.${String(i)}.unit_start`}
                label="Absolute starting stars (optional)"
                value={
                  option.unit_start === undefined
                    ? ""
                    : String(option.unit_start)
                }
                change={(value) => {
                  if (value === "") {
                    const rest = { ...option };
                    delete rest.unit_start;
                    change(
                      options.map((item, index) => (index === i ? rest : item)),
                    );
                  } else if (/^\d{1,7}$/.test(value))
                    update(i, { unit_start: Number(value) });
                }}
              />
            )}
          </div>
          <Action
            disabled={
              !option.label.trim() ||
              option.key === option.label ||
              options.some(
                (other, index) => index !== i && other.key === option.label,
              )
            }
            onClick={() => {
              update(i, { key: option.label });
            }}
          >
            Use label as option key
          </Action>
          {options.some(
            (other, index) => index !== i && other.key === option.label,
          ) && (
            <p className="field-error">
              Another option already uses this label as its key. Choose a unique
              value.
            </p>
          )}
          <Ordering
            index={i}
            count={options.length}
            change={(direction) => {
              change(move(options, i, direction));
            }}
            remove={() => {
              change(options.filter((_, index) => index !== i));
            }}
          />
        </fieldset>
      ))}
      {error && <p className="field-error">{error}</p>}
      <Action
        disabled={options.length >= 300}
        onClick={() => {
          change([
            ...options,
            { key: nextKey("option", options), label: "New option", units: 0 },
          ]);
        }}
      >
        Add option
      </Action>
    </div>
  );
}
export function ConditionEditor({
  path,
  label,
  value,
  change,
  fields,
  depth = 0,
}: {
  label: string;
  path?: string | undefined;
  value: Condition | undefined;
  change: (value: Condition | undefined) => void;
  fields: Field[];
  depth?: number;
}) {
  const blank = (): Condition => ({
    op: "eq",
    field: fields[0]?.key ?? "",
    values: [""],
    children: [],
  });
  return (
    <fieldset className="catalog-item">
      <legend>{label}</legend>
      <Check
        name={path}
        label="Enable condition"
        value={!!value}
        change={(enabled) => {
          change(enabled ? blank() : undefined);
        }}
      />
      {value && (
        <>
          <Select
            name={path ? `${path}.op` : undefined}
            label="Condition operator"
            value={value.op}
            change={(op) => {
              change(
                op === "all" || op === "any"
                  ? { op, field: "", values: [], children: [blank()] }
                  : {
                      op,
                      field: value.field || fields[0]?.key || "",
                      values: [value.values[0] ?? ""],
                      children: [],
                    },
              );
            }}
            options={[
              ["eq", "Equals"],
              ["in", "Is one of / contains any"],
              ["gt", "Greater than"],
              ["gte", "At least"],
              ["lt", "Less than"],
              ["lte", "At most"],
              ["all", "All conditions"],
              ["any", "Any condition"],
            ]}
          />
          {value.op === "all" || value.op === "any" ? (
            <>
              {value.children.map((child, i) => (
                <ConditionEditor
                  key={i}
                  path={path ? `${path}.children.${String(i)}` : undefined}
                  label={`Condition ${String(i + 1)}`}
                  value={child}
                  depth={depth + 1}
                  fields={fields}
                  change={(next) => {
                    change({
                      ...value,
                      children: next
                        ? value.children.map((c, index) =>
                            index === i ? next : c,
                          )
                        : value.children.filter((_, index) => index !== i),
                    });
                  }}
                />
              ))}
              <Action
                disabled={depth >= 3 || value.children.length >= 8}
                onClick={() => {
                  change({ ...value, children: [...value.children, blank()] });
                }}
              >
                Add condition
              </Action>
            </>
          ) : (
            <div className="catalog-grid">
              <Select
                name={path ? `${path}.field` : undefined}
                label="Condition field"
                value={value.field}
                change={(field) => {
                  change({ ...value, field });
                }}
                options={[
                  ["", "Select field"],
                  ...fields.map(
                    (field) =>
                      [field.key, `${field.label} (${field.key})`] as const,
                  ),
                ]}
              />
              <div>
                {(value.values.length ? value.values : [""]).map(
                  (entry, index) => (
                    <div key={index}>
                      <Text
                        name={
                          path ? `${path}.values.${String(index)}` : undefined
                        }
                        label={
                          index === 0
                            ? "Condition values"
                            : `Condition value ${String(index + 1)}`
                        }
                        value={entry}
                        change={(text) => {
                          const values = value.values.length
                            ? value.values
                            : [""];
                          change({
                            ...value,
                            values: values.map((v, i) =>
                              i === index ? text : v,
                            ),
                          });
                        }}
                        help="One exact option value, true/false, or number per input. Spaces, case and commas are preserved."
                      />
                      {value.op === "in" && value.values.length > 1 && (
                        <Action
                          onClick={() => {
                            change({
                              ...value,
                              values: value.values.filter(
                                (_, i) => i !== index,
                              ),
                            });
                          }}
                        >
                          Remove condition value {index + 1}
                        </Action>
                      )}
                    </div>
                  ),
                )}
                {value.op === "in" && (
                  <Action
                    disabled={value.values.length >= 30}
                    onClick={() => {
                      change({ ...value, values: [...value.values, ""] });
                    }}
                  >
                    Add condition value
                  </Action>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}
