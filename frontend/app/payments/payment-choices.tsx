import { Anchor } from "../portal-router";
import { Action } from "../catalog/controls";
import type { Policy } from "./model";
import type { PaymentOptions } from "./options";

export default function PaymentChoices({
  routes,
  data,
  loading,
  error,
  route,
  change,
  retry,
  support,
}: {
  routes: Policy["routes"];
  data: PaymentOptions | null;
  loading: boolean;
  error: boolean;
  route: string;
  change: (code: string) => void;
  retry: () => void;
  support: string;
}) {
  const available =
    !loading &&
    !error &&
    routes.some(
      (v) =>
        data?.routes.find((r) => r.code === v.code)?.status === "available",
    );
  const allBelow =
    !loading &&
    !error &&
    !!data &&
    routes.every(
      (v) =>
        data.routes.find((r) => r.code === v.code)?.status === "below_minimum",
    );
  return (
    <fieldset className="payment-choices" aria-busy={loading}>
      <legend>Payment asset and network</legend>
      <div className="payment-choice-list">
        {routes.map((v) => {
          const option = data?.routes.find((r) => r.code === v.code);
          const enabled = !loading && !error && option?.status === "available";
          const note = loading
            ? "Checking availability…"
            : error || !option || option.status === "unavailable"
              ? "Temporarily unavailable."
              : option.status === "below_minimum"
                ? "Below the minimum for this network."
                : "Available for this order.";
          return (
            <label
              className="payment-choice"
              key={v.code}
              data-selected={enabled && route === v.code}
              data-disabled={!enabled}
            >
              <input
                type="radio"
                name="route"
                value={v.code}
                checked={route === v.code}
                disabled={!enabled}
                onChange={() => {
                  change(v.code);
                }}
                aria-label={`${v.label} · ${v.network}`}
                aria-describedby={`payment-route-${v.code}`}
              />
              <span>
                <strong>{v.label}</strong>
                <span className="payment-choice-network">{v.network}</span>
                <small id={`payment-route-${v.code}`}>
                  {note}
                  {!loading &&
                    !error &&
                    option?.status === "below_minimum" &&
                    option.minimum_crypto && (
                      <>
                        {" "}
                        Minimum: {option.minimum_crypto} {v.label}.
                      </>
                    )}
                </small>
              </span>
            </label>
          );
        })}
      </div>
      <div
        aria-live="polite"
        aria-atomic="true"
        className="payment-choice-feedback"
      >
        {loading ? (
          <p>Checking payment options…</p>
        ) : error ? (
          <p>Payment options couldn’t be checked. Try again.</p>
        ) : !available ? (
          <p>
            {allBelow
              ? "This order is below the minimum for the available payment options."
              : "No payment option is available for this order."}
          </p>
        ) : null}
      </div>
      {!loading && !available && (
        <div className="form-actions">
          <Action variant="secondary" onClick={retry}>
            Check again
          </Action>
          <Anchor href={support}>Ask support about this order</Anchor>
        </div>
      )}
    </fieldset>
  );
}
