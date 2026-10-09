import { useState } from "react";
import { parseWinRate } from "./win-rate";

const kinds = [
  ["any", "No preference"],
  ["range", "Between two percentages"],
  ["below", "Below a percentage"],
  ["above", "Above a percentage"],
  ["exact", "Exactly 100%"],
] as const;

function canonical(value: string) {
  return /^(?:\d{1,3})(?:\.\d)?$/.test(value) ? String(Number(value)) : value;
}
function percent(value: string) {
  // Reuse the canonical contract; together these two modes include both endpoints.
  return (
    parseWinRate(`below:${value}`).kind === "below" ||
    parseWinRate(`above:${value}`).kind === "above"
  );
}

/** A request selector; its terms are agreed for the individual order. */
export default function WinRateInput({
  id,
  label,
  value,
  change,
  error,
  describedBy,
}: {
  id: string;
  label: string;
  value: string;
  change: (value: string | undefined) => void;
  error?: string | undefined;
  describedBy?: string | undefined;
}) {
  const [touched, setTouched] = useState(false);
  const parsed = parseWinRate(value);
  const parts = value.split(":");
  const mode = kinds.find(([kind]) => kind === parts[0])?.[0] ?? "";
  const first = parts[1] ?? "",
    second = parts[2] ?? "";
  const showErrors = touched || !!error;
  let lowerError = "",
    upperError = "",
    percentError = "",
    preferenceError = "";
  if (showErrors) {
    if (mode === "range") {
      if (!percent(first))
        lowerError =
          "Enter a lower win rate from 0 to 100, with at most one decimal place.";
      if (!percent(second))
        upperError =
          "Enter an upper win rate from 0 to 100, with at most one decimal place.";
      if (!lowerError && !upperError && Number(first) >= Number(second))
        upperError = `Enter an upper win rate greater than the lower win rate (${first}%).`;
    } else if (
      mode === "below" &&
      parseWinRate(`below:${first}`).kind !== "below"
    )
      percentError =
        "Enter a win rate greater than 0 and no more than 100, with at most one decimal place.";
    else if (
      mode === "above" &&
      parseWinRate(`above:${first}`).kind !== "above"
    )
      percentError =
        "Enter a win rate from 0 to less than 100, with at most one decimal place.";
    // A generic group rejection must not replace a concrete percentage correction.
    if (!lowerError && !upperError && !percentError)
      preferenceError =
        error ||
        (parsed.kind === "invalid" || parsed.kind === "legacy"
          ? "Choose a win-rate preference."
          : "");
  }
  const helpID = id + "-terms";
  function described(message: string, errorID: string) {
    return [describedBy, helpID, message ? errorID : ""]
      .filter(Boolean)
      .join(" ");
  }
  function amount(
    suffix: string,
    text: string,
    current: string,
    message: string,
    update: (next: string) => void,
  ) {
    const errorID = id + suffix + "-error";
    return (
      <div className="catalog-label">
        <label htmlFor={id + suffix}>{text}</label>
        <input
          id={id + suffix}
          type="text"
          inputMode="decimal"
          value={current}
          maxLength={8}
          aria-invalid={message ? true : undefined}
          aria-describedby={described(message, errorID)}
          onBlur={() => {
            setTouched(true);
          }}
          onChange={(event) => {
            update(canonical(event.target.value));
          }}
        />
        {message && (
          <p id={errorID} className="field-error">
            {message}
          </p>
        )}
      </div>
    );
  }
  return (
    <fieldset
      className="win-rate-preference"
      aria-describedby={described("", "")}
    >
      <legend>{label}</legend>
      <label htmlFor={id}>Win-rate preference</label>
      <select
        id={id}
        value={mode}
        aria-invalid={preferenceError ? true : undefined}
        aria-describedby={described(preferenceError, id + "-preference-error")}
        onChange={(event) => {
          setTouched(false);
          const next = event.target.value;
          change(
            next === "any"
              ? "any"
              : next === "exact"
                ? "exact:100"
                : next === "range"
                  ? "range::"
                  : next
                    ? next + ":"
                    : undefined,
          );
        }}
      >
        <option value="">Choose a preference…</option>
        {kinds.map(([kind, text]) => (
          <option key={kind} value={kind}>
            {text}
          </option>
        ))}
      </select>
      {preferenceError && (
        <p id={id + "-preference-error"} className="field-error">
          {preferenceError}
        </p>
      )}
      {mode === "range" && (
        <div className="catalog-grid">
          {amount("-lower", "Lower win rate (%)", first, lowerError, (next) => {
            change(`range:${next}:${second}`);
          })}
          {amount(
            "-upper",
            "Upper win rate (%)",
            second,
            upperError,
            (next) => {
              change(`range:${first}:${next}`);
            },
          )}
        </div>
      )}
      {(mode === "below" || mode === "above") &&
        amount(
          "-percent",
          mode === "below" ? "Below win rate (%)" : "Above win rate (%)",
          first,
          percentError,
          (next) => {
            change(`${mode}:${next}`);
          },
        )}
      {parsed.kind === "legacy" && (
        <p className="quiet">
          Previous request: {parsed.percent}%. Choose a preference again to
          describe your current request.
        </p>
      )}
      <p id={helpID} className="quiet">
        Use 0–100%, with up to one decimal place. The accepted package or order
        defines the agreed outcome.
      </p>
    </fieldset>
  );
}
