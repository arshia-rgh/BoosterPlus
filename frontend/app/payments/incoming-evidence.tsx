import { Action } from "../catalog/controls";
import type { IncomingEvidence } from "./model";

export default function IncomingPaymentEvidence({
  evidence,
  more,
  reconcile,
}: {
  evidence: IncomingEvidence[];
  more: boolean;
  reconcile: (reference: string) => void;
}) {
  return (
    <div className="finance-evidence">
      {!evidence.length && (
        <p>
          No linked provider observation yet. This does not confirm receipt of
          funds.
        </p>
      )}
      {evidence.map((item) => (
        <details key={item.payment_id}>
          <summary>
            Provider payment {item.payment_id} ·{" "}
            {item.issue ? "Needs review" : item.state.replaceAll("_", " ")}
          </summary>
          <p>
            Observed amounts are separate from order pricing and settlement.
            Check the order payment history for allocated receipts.
          </p>
          <dl className="account-attributes">
            <div>
              <dt>Provider expected amount</dt>
              <dd>
                {item.expected_amount
                  ? `${item.expected_amount} ${item.currency.toUpperCase()}`
                  : "No matching amount evidence"}
              </dd>
            </div>
            <div>
              <dt>Provider observed received</dt>
              <dd>
                {item.received_amount
                  ? `${item.received_amount} ${item.currency.toUpperCase()}`
                  : "No matching amount evidence"}
              </dd>
            </div>
            <div>
              <dt>Observed network</dt>
              <dd>{item.network || "Not reported"}</dd>
            </div>
            <div>
              <dt>Provider state</dt>
              <dd>{item.state.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Latest check</dt>
              <dd>
                {item.checked_at ? (
                  <time dateTime={item.checked_at}>
                    {new Date(item.checked_at).toLocaleString()}
                  </time>
                ) : (
                  "No completed check"
                )}
              </dd>
            </div>
            <div>
              <dt>Shown observation</dt>
              <dd>
                {item.observed_at ? (
                  <time dateTime={item.observed_at}>
                    {new Date(item.observed_at).toLocaleString()}
                  </time>
                ) : (
                  "No observation recorded"
                )}
              </dd>
            </div>
          </dl>
          {item.reading && (
            <p role="status">
              A provider read is in progress. Refresh to check its result.
            </p>
          )}
          {item.issue && (
            <p>
              {item.issue === "provider_unavailable"
                ? "The latest provider check failed. Any amounts shown are from the earlier observation above."
                : `Evidence requires review: ${item.issue.replaceAll("_", " ")}.`}
            </p>
          )}
          <Action
            onClick={() => {
              reconcile(item.payment_id);
            }}
          >
            Use payment {item.payment_id} for reconciliation
          </Action>
        </details>
      ))}
      {more && (
        <p>
          Only the latest ten linked provider records are shown here. Additional
          records are not included in this view.
        </p>
      )}
    </div>
  );
}
