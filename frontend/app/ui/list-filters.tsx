import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { NavigationType, useNavigationType } from "../portal-router";
import { Text } from "../catalog/controls";
import { focusValidationTarget } from "./form-validation";
import "./list-filters.css";
export type FilterValues = Record<string, string>;
export type FilterField = {
  key: string;
  label: string;
  options?: readonly (readonly [string, string])[];
  maxLength?: number;
  inputMode?: "text" | "decimal";
  help?: string;
  render?: (value: string, change: (value: string) => void) => ReactNode;
};
type Props = {
  title: string;
  values: FilterValues;
  fields: readonly FilterField[];
  defaults?: FilterValues;
  search?: { key: string; label: string; submit?: string; maxLength?: number };
  apply: (values: FilterValues) => void;
  validate?: (values: FilterValues) => FilterValues;
  normalize?: (values: FilterValues, changed: string) => FilterValues;
  extra?: (
    values: FilterValues,
    change: (key: string, value: string) => void,
  ) => ReactNode;
};
/** Search stays visible; modal edits are drafts until Apply. */
export function ListFilters({
  title,
  values,
  fields,
  defaults = {},
  search,
  apply,
  validate,
  normalize,
  extra,
}: Props) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    chipsRoot = useRef<HTMLDivElement>(null);
  const restoreChipFocus = useRef(false);
  const appliedKey = JSON.stringify(values);
  useEffect(() => {
    if (!restoreChipFocus.current) return;
    restoreChipFocus.current = false;
    (
      chipsRoot.current?.querySelector<HTMLButtonElement>("button") ??
      trigger.current
    )?.focus();
  }, [appliedKey]);
  const navigation = useNavigationType();
  const currentSearch = search ? (values[search.key] ?? "") : "";
  const [query, setQuery] = useState(currentSearch),
    [previous, setPrevious] = useState(currentSearch),
    [submitted, setSubmitted] = useState<string | null>(null);
  if (previous !== currentSearch) {
    setPrevious(currentSearch);
    if (navigation === NavigationType.Pop || submitted !== currentSearch)
      setQuery(currentSearch);
    setSubmitted(null);
  }
  const [draft, setDraft] = useState<FilterValues>(values),
    [errors, setErrors] = useState<FilterValues>({});
  const chips = fields.filter(
    (f) => values[f.key] && values[f.key] !== (defaults[f.key] ?? ""),
  );
  const clean = (v: FilterValues) =>
    Object.fromEntries(Object.entries(v).filter(([, value]) => !!value));
  const update = (key: string, value: string) => {
    setErrors({});
    setDraft((old) =>
      normalize
        ? normalize({ ...old, [key]: value }, key)
        : { ...old, [key]: value },
    );
  };
  const remove = (key: string) => {
    const next = {
      ...values,
      [key]: Object.entries(defaults).find(([name]) => name === key)?.[1] ?? "",
    };
    restoreChipFocus.current = true;
    apply(clean(normalize ? normalize(next, key) : next));
    if (key === search?.key) setQuery("");
  };
  return (
    <section className="list-filter-bar" aria-label={title}>
      <div className="list-filter-toolbar">
        {search && (
          <form
            className="list-filter-search"
            onSubmit={(event) => {
              event.preventDefault();
              const text = query.trim();
              setSubmitted(text);
              apply(clean({ ...values, [search.key]: text }));
            }}
          >
            <Text
              label={search.label}
              value={query}
              change={setQuery}
              maxLength={search.maxLength ?? 120}
            />
            <button type="submit" className="button secondary compact">
              {search.submit ?? "Search"}
            </button>
          </form>
        )}
        <button
          ref={trigger}
          type="button"
          className="button secondary compact list-filter-trigger"
          aria-haspopup="dialog"
          onClick={() => {
            setDraft({ ...defaults, ...values });
            setErrors({});
            dialog.current?.showModal();
            dialog.current?.querySelector<HTMLElement>("h2")?.focus();
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 17h16" />
            <circle cx="9" cy="7" r="2.5" />
            <circle cx="15" cy="17" r="2.5" />
          </svg>
          Filters
          {chips.length > 0 && (
            <span className="list-filter-count">{chips.length}</span>
          )}
        </button>
      </div>
      {(chips.length > 0 || !!currentSearch) && (
        <div
          ref={chipsRoot}
          className="list-filter-chips"
          aria-label="Applied filters"
        >
          {search && !!currentSearch && (
            <button
              type="button"
              className="list-filter-chip"
              onClick={() => {
                remove(search.key);
              }}
              aria-label={`Remove search filter: ${currentSearch}`}
            >
              <span>Search: {currentSearch}</span>
              <span aria-hidden="true">×</span>
            </button>
          )}
          {chips.map((f) => {
            const value =
              f.options?.find(([key]) => key === values[f.key])?.[1] ??
              values[f.key] ??
              "";
            return (
              <button
                key={f.key}
                type="button"
                className="list-filter-chip"
                onClick={() => {
                  remove(f.key);
                }}
                aria-label={`Remove ${f.label.toLowerCase()} filter: ${value}`}
              >
                <span>
                  {f.label}: {value}
                </span>
                <span aria-hidden="true">×</span>
              </button>
            );
          })}
          <button
            type="button"
            className="list-filter-clear"
            onClick={() => {
              setQuery("");
              apply(clean(defaults));
              requestAnimationFrame(() => trigger.current?.focus());
            }}
          >
            Clear all
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        className="list-filter-dialog"
        aria-labelledby={`${id}-title`}
        onClose={() => trigger.current?.focus()}
      >
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const next = {
              ...draft,
              ...(search ? { [search.key]: currentSearch } : {}),
            };
            const issues = validate?.(next) ?? {};
            setErrors(issues);
            const first = Object.entries(issues).find(
              ([, message]) => !!message,
            )?.[0];
            if (first) {
              requestAnimationFrame(() => {
                focusValidationTarget(
                  document.getElementById(`${id}-${first}`),
                );
              });
              return;
            }
            dialog.current?.close();
            apply(clean(next));
          }}
        >
          <header className="list-filter-dialog-heading">
            <h2 id={`${id}-title`} tabIndex={-1}>
              {title}
            </h2>
            <button
              type="button"
              className="list-filter-close"
              aria-label="Close filters"
              onClick={() => dialog.current?.close()}
            >
              ×
            </button>
          </header>
          <div className="list-filter-fields">
            {extra?.(draft, update)}
            {fields.map((f) =>
              f.render ? (
                <div key={f.key}>
                  {f.render(draft[f.key] ?? "", (value) => {
                    update(f.key, value);
                  })}
                </div>
              ) : (
                <div key={f.key} className="catalog-label">
                  <label htmlFor={`${id}-${f.key}`}>{f.label}</label>
                  {f.options ? (
                    <select
                      id={`${id}-${f.key}`}
                      value={draft[f.key] ?? defaults[f.key] ?? ""}
                      onChange={(event) => {
                        update(f.key, event.target.value);
                      }}
                      aria-invalid={!!errors[f.key] || undefined}
                      aria-describedby={
                        [
                          f.help ? `${id}-${f.key}-help` : "",
                          errors[f.key] ? `${id}-${f.key}-error` : "",
                        ]
                          .filter(Boolean)
                          .join(" ") || undefined
                      }
                    >
                      {f.options.map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={`${id}-${f.key}`}
                      inputMode={f.inputMode ?? "text"}
                      value={draft[f.key] ?? ""}
                      maxLength={f.maxLength ?? 120}
                      onChange={(event) => {
                        update(f.key, event.target.value);
                      }}
                      aria-invalid={!!errors[f.key] || undefined}
                      aria-describedby={
                        [
                          f.help ? `${id}-${f.key}-help` : "",
                          errors[f.key] ? `${id}-${f.key}-error` : "",
                        ]
                          .filter(Boolean)
                          .join(" ") || undefined
                      }
                    />
                  )}
                  {f.help && (
                    <p className="quiet" id={`${id}-${f.key}-help`}>
                      {f.help}
                    </p>
                  )}
                  {errors[f.key] && (
                    <p
                      className="field-error"
                      id={`${id}-${f.key}-error`}
                      role="alert"
                    >
                      {errors[f.key]}
                    </p>
                  )}
                </div>
              ),
            )}
          </div>
          <footer className="list-filter-dialog-actions">
            <button
              type="button"
              className="list-filter-clear"
              onClick={() => {
                setDraft({ ...defaults });
                setErrors({});
              }}
            >
              Reset filters
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
            <button type="submit" className="button">
              Apply filters
            </button>
          </footer>
        </form>
      </dialog>
    </section>
  );
}
