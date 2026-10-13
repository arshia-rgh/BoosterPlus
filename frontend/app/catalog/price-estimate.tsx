import type { Estimate } from "./model";

export function minorDisplay(value: string): string {
  const amount = BigInt(value),
    negative = amount < 0n,
    absolute = negative ? -amount : amount;
  return `${negative ? "−" : ""}${String(absolute / 100n)}.${String(absolute % 100n).padStart(2, "0")}`;
}

export default function PriceEstimate({
  estimate,
  fixed = false,
  state,
  message,
  retry,
  compact = false,
}: {
  estimate?: Estimate | null | undefined;
  fixed?: boolean;
  state?: string;
  message?: string | undefined;
  retry?: (() => void) | undefined;
  compact?: boolean;
}) {
  return (
    <section className="configuration-price" aria-label="Price estimate">
      <div
        className="configuration-price-status"
        aria-live="polite"
        aria-atomic="true"
      >
        {estimate?.outcome === "estimated" ? (
          <h3 className="configuration-price-amount">
            <span>Estimated price:</span> {estimate.currency}{" "}
            {minorDisplay(estimate.amount_minor)}
          </h3>
        ) : estimate?.outcome === "manual_review" ? (
          <p>Your selections need a manual price review.</p>
        ) : (
          <p>
            {state === "unavailable"
              ? "This offering is currently unavailable."
              : state === "checking"
                ? "Updating your estimate…"
                : state === "invalid"
                  ? "Check your selections to update the estimate."
                  : state === "error"
                    ? (compact
                        ? "Estimate unavailable. Your selections are still here."
                        : message) ||
                      "We couldn’t update the estimate. Your selections are still here."
                    : state === "expired"
                      ? "This estimate has expired. Refresh it for the current price."
                      : "Choose your goal and required preferences to see an estimate."}
          </p>
        )}
      </div>
      <p className="configuration-price-note">
        {fixed
          ? "Package discount is provisional until checkout."
          : "Provisional price. Our team confirms the final quote before you pay."}
      </p>
      {!compact && retry && ["error", "expired"].includes(state ?? "") && (
        <button
          type="button"
          className="button secondary compact"
          onClick={retry}
        >
          Refresh estimate
        </button>
      )}
      {!compact && estimate?.outcome === "estimated" && (
        <details className="configuration-price-details">
          <summary>Price breakdown</summary>
          <ul>
            {estimate.lines.map((line) => (
              <li key={line.key}>
                {line.label}: {estimate.currency}{" "}
                {minorDisplay(line.amount_minor)}
              </li>
            ))}
          </ul>
          <p>
            This estimate expires{" "}
            {new Date(estimate.expires_at).toLocaleTimeString()}.
          </p>
          {estimate.discount && (
            <p>
              Coupon checks do not reserve a use. Personal limits apply when
              signed in; eligibility is checked again when the order becomes
              payable.
            </p>
          )}
        </details>
      )}
    </section>
  );
}
