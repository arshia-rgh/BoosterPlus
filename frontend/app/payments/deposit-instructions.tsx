import { useState } from "react";
import type { z } from "../validation";
import type { depositSchema, routeSchema } from "./model";

export default function DepositInstructions({
  deposit,
  route,
  now,
  currentTime,
  unavailable,
}: {
  deposit: z.infer<typeof depositSchema>;
  route: z.infer<typeof routeSchema>;
  now: number;
  currentTime: () => number;
  unavailable: boolean;
}) {
  const [feedback, setFeedback] = useState<{
    text: string;
    deposit: typeof deposit;
  } | null>(null);
  function setCopied(text: string) {
    setFeedback({ text, deposit });
  }
  const expiry = Date.parse(deposit.expires_at);
  const observed = Date.parse(deposit.checked_at);
  const deadline = Date.parse(deposit.valid_until);
  const usable =
    !unavailable &&
    Number.isFinite(now) &&
    Number.isFinite(expiry) &&
    Number.isFinite(observed) &&
    now < expiry &&
    now < deadline &&
    now >= observed &&
    deposit.currency === route.code &&
    deposit.network.toLowerCase() === route.network;
  async function copy(value: string, label: string) {
    if (
      !usable ||
      currentTime() >= Math.min(expiry, deadline) ||
      document.hidden ||
      !navigator.onLine
    ) {
      setCopied("Instructions changed or expired. Refresh before copying.");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopied(`${label} copied.`);
    } catch {
      setCopied(
        `Copy unavailable. Select the ${label.toLowerCase()} text instead.`,
      );
    }
  }
  return (
    <section
      className="deposit-instructions"
      aria-label="Provider deposit instructions"
    >
      <h3>
        {usable ? "Send your payment" : "Payment instructions need a refresh"}
      </h3>
      <p>
        Payment reference: <code>{deposit.payment_id}</code>
      </p>
      {usable ? (
        <>
          <p className="payment-route-note">
            Send only {route.label} on {route.network}. A different asset or
            network may not be recoverable. Check every field before sending.
          </p>
          <p className="deposit-deadline">
            Send before{" "}
            <time dateTime={deposit.expires_at}>
              {new Date(deposit.expires_at).toLocaleString()}
            </time>
            . Do not send after this deadline. If you have already sent funds,
            do not send again.
          </p>
          <div className="deposit-grid">
            <figure>
              <img
                src={deposit.qr}
                alt="QR code for the payment address"
                width="256"
                height="256"
              />
              <figcaption>
                This QR contains the address only. Enter the exact amount and
                any required memo separately.
              </figcaption>
            </figure>
            <div>
              <div className="deposit-copy-field">
                <h4>Send exactly</h4>
                <p>
                  <strong>{deposit.amount}</strong> {route.label}
                </p>
                <button
                  className="button secondary compact"
                  type="button"
                  onClick={() => void copy(deposit.amount, "Amount")}
                >
                  Copy amount
                </button>
              </div>
              <div className="deposit-copy-field">
                <h4>Payment address</h4>
                <code>{deposit.address}</code>
                <button
                  className="button secondary compact"
                  type="button"
                  onClick={() => void copy(deposit.address, "Address")}
                >
                  Copy address
                </button>
              </div>
              {deposit.memo && (
                <div className="deposit-copy-field">
                  <h4>Required memo / destination tag</h4>
                  <code>{deposit.memo}</code>
                  <p>
                    Include this with the transfer. It is not included in the
                    QR.
                  </p>
                  <button
                    className="button secondary compact"
                    type="button"
                    onClick={() => void copy(deposit.memo, "Memo")}
                  >
                    Copy memo
                  </button>
                </div>
              )}
            </div>
          </div>
          <p className="quiet">
            Provider information checked{" "}
            <time dateTime={deposit.checked_at}>
              {new Date(deposit.checked_at).toLocaleTimeString()}
            </time>
            .
          </p>
        </>
      ) : (
        <p>
          Do not send funds using old instructions. Reconnect and refresh the
          payment status. If you already sent funds, wait for reconciliation or
          contact support before sending anything else.
        </p>
      )}
      <p role="status">
        {usable && feedback?.deposit === deposit ? feedback.text : ""}
      </p>
    </section>
  );
}
