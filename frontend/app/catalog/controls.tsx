import { useId, type ReactNode } from "react";
import { APIError, errorMessage } from "../identity/api";
import type { Issue, Option, Condition, Field } from "./model";

export function Text({
  label,
  value,
  change,
  multiline = false,
  type = "text",
  help = "",
}: {
  label: string;
  value: string;
  change: (value: string) => void;
  multiline?: boolean;
  type?: string;
  help?: string;
}) {
  const id = useId();
  const helpID = id + "-help";
  return (
    <div className="catalog-label">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(event) => {
            change(event.target.value);
          }}
          aria-describedby={help ? helpID : undefined}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => {
            change(event.target.value);
          }}
          aria-describedby={help ? helpID : undefined}
        />
      )}{" "}
      {help && (
        <span className="quiet" id={helpID}>
          {help}
        </span>
      )}
    </div>
  );
}

export function NumberInput({
  label,
  value,
  change,
}: {
  label: string;
  value: number;
  change: (value: number) => void;
}) {
  return (
    <Text
      label={label}
      type="number"
      value={String(value)}
      change={(v) => {
        const parsed = Number(v);
        if (Number.isSafeInteger(parsed)) change(parsed);
      }}
    />
  );
}
export function Check({
  label,
  value,
  change,
}: {
  label: string;
  value: boolean;
  change: (value: boolean) => void;
}) {
  return (
    <label className="catalog-check">
      <input
        type="checkbox"
        checked={value}
        onChange={(event) => {
          change(event.target.checked);
        }}
      />
      {label}
    </label>
  );
}
export function Select({
  label,
  value,
  change,
  options,
}: {
  label: string;
  value: string;
  change: (value: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  const id = useId();
  return (
    <div className="catalog-label">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          change(event.target.value);
        }}
      >
        {options.map(([key, name]) => (
          <option value={key} key={key}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
export function Action({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="button compact"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function Issues({ issues }: { issues: Issue[] }) {
  return issues.length > 0 ? (
    <div role="alert" className="catalog-issues">
      <p>Resolve these issues before continuing:</p>
      <ul>
        {issues.map((issue, index) => (
          <li key={index}>
            <strong>{issue.path}</strong>: {issue.message}
          </li>
        ))}
      </ul>
    </div>
  ) : null;
}
export function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <>
      <p role="alert">{errorMessage(error)}</p>
      <Issues issues={error instanceof APIError ? error.issues : []} />
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
  options,
  change,
}: {
  options: Option[];
  change: (options: Option[]) => void;
}) {
  const update = (i: number, patch: Partial<Option>) => {
    change(
      options.map((option, index) =>
        index === i ? { ...option, ...patch } : option,
      ),
    );
  };
  return (
    <div>
      <p className="quiet">
        Option order defines rank progression. Represent each division as an
        entry; units are its maximum stars/points.
      </p>
      {options.map((option, i) => (
        <fieldset className="catalog-item" key={i}>
          <legend>Option {i + 1}</legend>
          <div className="catalog-grid">
            <Text
              label="Option key"
              value={option.key}
              change={(key) => {
                update(i, { key });
              }}
            />
            <Text
              label="Option label"
              value={option.label}
              change={(label) => {
                update(i, { label });
              }}
            />
            <NumberInput
              label="Maximum rank units"
              value={option.units}
              change={(units) => {
                update(i, { units });
              }}
            />
          </div>
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
  label,
  value,
  change,
  fields,
  depth = 0,
}: {
  label: string;
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
        label="Enable condition"
        value={!!value}
        change={(enabled) => {
          change(enabled ? blank() : undefined);
        }}
      />
      {value && (
        <>
          <Select
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
              <Text
                label="Condition values"
                value={value.values.join(",")}
                change={(text) => {
                  change({
                    ...value,
                    values: text.split(",").map((v) => v.trim()),
                  });
                }}
                help="Stable option keys, true/false, or exact numbers. Separate membership values with commas."
              />
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}
