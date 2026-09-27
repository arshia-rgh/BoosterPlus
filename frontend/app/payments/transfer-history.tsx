import { useState } from "react";
import { Link } from "react-router";
import { Action, ErrorNotice } from "../catalog/controls";
import { useResource } from "../orders/resource";
import { transferHistorySchema, type Transfer } from "./cases-model";

export default function TransferHistory({
  record,
  admin,
}: {
  record: Transfer;
  admin: boolean;
}) {
  const [after, setAfter] = useState(0);
  const noun = record.kind === "seller_payout" ? "payouts" : "refunds";
  const resource = useResource(
    `${admin ? "/admin" : ""}/${noun}/${record.id}/history?after=${String(after)}`,
    transferHistorySchema,
  );
  return (
    <section aria-label="Transfer evidence and history">
      <h4>Transfer evidence and history</h4>
      <p>
        Transfer {record.id}. Earlier events without a saved destination
        snapshot remain explicitly unavailable.
      </p>
      <ErrorNotice error={resource.error} />
      <Action onClick={resource.reload} disabled={resource.loading}>
        Refresh transfer evidence
      </Action>
      {resource.loading && <p role="status">Checking transfer evidence…</p>}
      {resource.data && (
        <>
          <ol className="case-timeline">
            {resource.data.events.map((event) => (
              <li key={event.version}>
                <strong>
                  Revision {event.version} · {event.action.replaceAll("_", " ")}
                </strong>
                <time dateTime={event.created_at}>
                  {new Date(event.created_at).toLocaleString()}
                </time>
                {event.snapshot ? (
                  <>
                    <p>
                      {event.snapshot.amount}{" "}
                      {event.snapshot.currency.toUpperCase()} ·{" "}
                      {event.snapshot.network} ·{" "}
                      {event.snapshot.state.replaceAll("_", " ")}
                    </p>
                    <p className="payment-policy">
                      {event.snapshot.recipient.address
                        ? `Destination at this revision: ${event.snapshot.recipient.address}`
                        : "No destination confirmed at this revision."}
                      {event.snapshot.recipient.memo
                        ? ` · Memo: ${event.snapshot.recipient.memo}`
                        : ""}
                    </p>
                  </>
                ) : (
                  <p>
                    No destination snapshot was recorded for this historical
                    event.
                  </p>
                )}
              </li>
            ))}
          </ol>
          {after > 0 && (
            <Action
              onClick={() => {
                setAfter(0);
              }}
            >
              First transfer events
            </Action>
          )}
          {resource.data.next > 0 && (
            <Action
              onClick={() => {
                setAfter(resource.data?.next ?? 0);
              }}
            >
              More transfer events
            </Action>
          )}
          <h4>Provider attempts</h4>
          {!resource.data.attempts.length && (
            <p>No outgoing attempt recorded.</p>
          )}
          {resource.data.attempts.map((attempt) => (
            <article key={attempt.id}>
              <p>
                Attempt {attempt.id} · {attempt.state.replaceAll("_", " ")}
              </p>
              <p>
                {attempt.provider_id
                  ? `Provider reference ${attempt.provider_id}`
                  : "No provider reference confirmed."}
              </p>
              <p>
                Last matched provider check:{" "}
                {attempt.checked_at
                  ? new Date(attempt.checked_at).toLocaleString()
                  : "Not recorded"}
              </p>
              {attempt.issue && (
                <p>
                  Evidence requires review: {attempt.issue.replaceAll("_", " ")}
                  .
                </p>
              )}
              {admin && attempt.provider_id && (
                <Link
                  to={`/admin/finance?view=reconcile&direction=outgoing&reference=${encodeURIComponent(attempt.provider_id)}`}
                >
                  Inspect outgoing reference {attempt.provider_id}
                </Link>
              )}
            </article>
          ))}
          {resource.data.more_attempts && (
            <p>
              Only the latest ten attempts are shown; earlier attempts remain in
              retained records.
            </p>
          )}
        </>
      )}
    </section>
  );
}
