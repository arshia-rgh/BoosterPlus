import { useRef, useState } from "react";
import type { Answers, Field, Option } from "./model";

/** Native choices retain keyboard behavior; large catalogs get a bounded search view. */
export default function ChoiceInput({
  field,
  options,
  value,
  change,
  id,
  label,
  describedBy,
  invalid,
  disabled,
}: {
  field: Field;
  options: Option[];
  value: Answers[string] | undefined;
  change: (value: Answers[string] | undefined) => void;
  id: string;
  label: string;
  describedBy: string | undefined;
  invalid: boolean;
  disabled: boolean | undefined;
}) {
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const multiple = field.type === "multiselect";
  const selected = Array.isArray(value) ? value : [];
  const searchable = options.length > 12 || search.length > 0;
  const matches = options.filter((option) =>
    option.label
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );
  const full =
    multiple &&
    field.max_selections > 0 &&
    selected.length >= field.max_selections;
  const countId = id + "-count";
  const description =
    [describedBy, multiple ? countId : undefined].filter(Boolean).join(" ") ||
    undefined;
  return (
    <fieldset
      className={`catalog-choices catalog-choice-control${searchable ? " catalog-choices-searchable" : ""}`}
      disabled={disabled}
      aria-describedby={description}
    >
      <legend>{label}</legend>
      {multiple && (
        <p
          id={countId}
          className="quiet catalog-choice-count"
          aria-live="polite"
          aria-atomic="true"
        >
          {field.max_selections > 0
            ? `${String(selected.length)} of ${String(field.max_selections)} selected`
            : `${String(selected.length)} selected`}
          {full ? ". Remove a selection to choose another." : ""}
        </p>
      )}
      {searchable && (
        <>
          <label htmlFor={id + "-search"}>
            Search {field.label.toLocaleLowerCase()}
          </label>
          <div className="catalog-choice-search">
            <input
              ref={searchRef}
              id={id + "-search"}
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
              aria-controls={id + "-options"}
              aria-describedby={description}
              aria-invalid={invalid || undefined}
              autoComplete="off"
            />
            {search && (
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setSearch("");
                  searchRef.current?.focus();
                }}
              >
                Clear search
              </button>
            )}
          </div>
          {!multiple && typeof value === "string" && value && (
            <p>
              Selected:{" "}
              {options.find((option) => option.key === value)?.label ?? value}
            </p>
          )}
          {multiple && selected.length > 0 && (
            <ul
              className="catalog-choice-selected"
              aria-label="Selected choices"
            >
              {selected.map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      change(selected.filter((item) => item !== key));
                      searchRef.current?.focus();
                    }}
                    aria-label={`Remove ${options.find((option) => option.key === key)?.label ?? key}`}
                  >
                    {options.find((option) => option.key === key)?.label ?? key}
                    <span aria-hidden="true"> ×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <div id={id + "-options"} className="catalog-choice-options">
        {matches.map((option) => (
          <label key={option.key}>
            <input
              type={multiple ? "checkbox" : "radio"}
              name={id}
              aria-invalid={invalid || undefined}
              aria-describedby={description}
              value={option.key}
              checked={
                multiple ? selected.includes(option.key) : value === option.key
              }
              disabled={full && !selected.includes(option.key)}
              onChange={(event) => {
                if (!multiple) change(option.key);
                else
                  change(
                    event.target.checked
                      ? [...selected, option.key]
                      : selected.filter((key) => key !== option.key),
                  );
              }}
            />
            {option.label}
          </label>
        ))}
      </div>
      {searchable && (
        <p role="status">
          {!search.trim()
            ? ""
            : matches.length
              ? `${String(matches.length)} matching choices`
              : "No matches. Try another name or clear the search."}
        </p>
      )}
    </fieldset>
  );
}
