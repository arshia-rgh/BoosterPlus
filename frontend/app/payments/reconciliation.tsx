import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { z } from "../validation";
import { Action, ErrorNotice, Select, Text } from "../catalog/controls";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
const reviewSchema = z.object({
  direction: z.string(),
  payment_id: z.string(),
  found: z.boolean(),
  state: z.string(),
  issue: z.string(),
  order_id: z.string(),
  case_id: z.string(),
  transfer_id: z.string(),
  submission_id: z.string(),
  checked_at: z.string().nullable(),
  observed_at: z.string().nullable(),
  reading: z.boolean(),
  job: z
    .object({ id: z.string(), state: z.string(), attempts: z.number().int() })
    .nullable(),
});
export default function Reconciliation({
  paymentID,
  change,
  done,
  direction,
  setDirection,
  request,
}: {
  paymentID: string;
  change: (value: string) => void;
  done: () => void;
  direction: string;
  setDirection: (value: string) => void;
  request: number;
}) {
  const [selected, setSelected] = useState<{
    direction: string;
    id: string;
  } | null>(() =>
    /^[1-9][0-9]{0,31}$/.test(paymentID) ? { direction, id: paymentID } : null,
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const [seenRequest, setSeenRequest] = useState(request);
  const [revision, setRevision] = useState(0);
  if (seenRequest !== request) {
    setSeenRequest(request);
    setSelected(
      /^[1-9][0-9]{0,31}$/.test(paymentID)
        ? { direction, id: paymentID }
        : null,
    );
    setReason("");
    setNotice("");
    setError(null);
  }
  const valid = /^[1-9][0-9]{0,31}$/.test(paymentID);
  function inspect() {
    if (valid) {
      setSelected({ direction, id: paymentID });
      setError(null);
      setNotice("");
    }
  }
  async function queue() {
    if (
      lock.current ||
      !selected ||
      selected.id !== paymentID ||
      selected.direction !== direction ||
      reason.trim().length < 10
    )
      return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      await post(
        `/admin/finance/${direction === "outgoing" ? "outgoing/" : ""}reconcile`,
        { payment_id: paymentID, reason },
        z.object({ queued: z.boolean() }),
      );
      setNotice(
        "Provider check requested. Pending checks are reused; inspect its status before requesting another.",
      );
      done();
      setRevision((value) => value + 1);
    } catch (cause) {
      setError(cause);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <h2>Inspect and reconcile provider evidence</h2>
      <p>
        A fresh check reads authoritative provider evidence. It cannot approve a
        transfer or manually settle an order. Recent staff verification is
        required to queue a check.
      </p>
      <ErrorNotice error={error} />
      <fieldset disabled={busy}>
        <legend>Find provider record</legend>
        <Select
          label="Transfer direction"
          value={direction}
          change={(value) => {
            setDirection(value);
            setReason("");
            setSelected(null);
            setNotice("");
          }}
          options={[
            ["incoming", "Incoming customer payment"],
            ["outgoing", "Outgoing refund or seller payout"],
          ]}
        />
        <Text
          label="Provider payment ID"
          value={paymentID}
          change={(value) => {
            change(value);
            setReason("");
            setSelected(null);
            setNotice("");
          }}
          help="Use the provider payment or payout ID, not an invoice ID."
        />
        <Action disabled={!valid} onClick={inspect}>
          Inspect provider reference
        </Action>
      </fieldset>
      {selected && (
        <Inspection
          key={`${selected.direction}:${selected.id}`}
          selected={selected}
          revision={revision}
          busy={busy}
          reason={reason}
          setReason={setReason}
          queue={() => void queue()}
        />
      )}
      {notice && <p role="status">{notice}</p>}
    </>
  );
}
function Inspection({
  selected,
  revision,
  busy,
  reason,
  setReason,
  queue,
}: {
  selected: { direction: string; id: string };
  revision: number;
  busy: boolean;
  reason: string;
  setReason: (value: string) => void;
  queue: () => void;
}) {
  const [params] = useSearchParams();
  const financeSearch = new URLSearchParams({
    ...Object.fromEntries(params),
    view: "reconcile",
    direction: selected.direction,
    reference: selected.id,
  }).toString();
  const resource = useResource(
    `/admin/finance/reconciliation?direction=${selected.direction}&payment_id=${encodeURIComponent(selected.id)}`,
    reviewSchema,
  );
  const [lastRevision, setLastRevision] = useState(revision);
  if (lastRevision !== revision) {
    setLastRevision(revision);
    resource.reload();
  }
  const value = resource.data;
  const pending =
    value?.reading ||
    value?.job?.state === "pending" ||
    value?.job?.state === "running";
  return (
    <section aria-label="Provider check inspection">
      <h3>
        {selected.direction === "outgoing" ? "Outgoing" : "Incoming"} reference{" "}
        {selected.id}
      </h3>
      <ErrorNotice error={resource.error} />
      <Action disabled={resource.loading || busy} onClick={resource.reload}>
        Refresh provider check
      </Action>
      {resource.loading && <p role="status">Checking retained evidence…</p>}
      {value && (
        <>
          {!value.found ? (
            <p>
              No accessible record matches this reference yet. An authorized
              check can look it up with the provider; it cannot assign funds to
              a guessed order.
            </p>
          ) : (
            <>
              <p>
                Provider state: {value.state.replaceAll("_", " ")}
                {value.issue
                  ? ` · Requires review: ${value.issue.replaceAll("_", " ")}`
                  : ""}
              </p>
              <p>
                Latest check:{" "}
                {value.checked_at
                  ? new Date(value.checked_at).toLocaleString()
                  : "No completed check"}
                . Last recorded observation:{" "}
                {value.observed_at
                  ? new Date(value.observed_at).toLocaleString()
                  : "No observation"}
                .
              </p>
              <div className="catalog-actions">
                {value.order_id && (
                  <Link
                    to={`/admin/orders/${value.order_id}?section=payment`}
                    state={{ financeSearch }}
                  >
                    Review linked order {value.order_id.slice(0, 8)}
                  </Link>
                )}
                {value.submission_id && (
                  <Link
                    to={`/admin/submissions/${value.submission_id}?section=payout`}
                    state={{ financeSearch }}
                  >
                    Review linked seller agreement
                  </Link>
                )}
              </div>
              {value.case_id && <p>Linked case {value.case_id}</p>}
              {value.transfer_id && <p>Linked transfer {value.transfer_id}</p>}
            </>
          )}
          {value.job ? (
            <p role="status">
              Manual check {value.job.id}:{" "}
              {value.job.state.replaceAll("_", " ")} · {value.job.attempts}{" "}
              worker attempts.{" "}
              {value.job.state === "done"
                ? "A completed job is not proof of settlement; inspect the matched evidence above."
                : ""}
            </p>
          ) : (
            <p>No retained manual check is available.</p>
          )}
          {pending && (
            <p role="status">
              A check is pending or running. Refresh its status before
              requesting another.
            </p>
          )}
          <fieldset
            disabled={busy || resource.loading || !!resource.error || pending}
          >
            <legend>Request a provider read</legend>
            <Text
              label="Reason for reconciliation"
              multiline
              value={reason}
              change={setReason}
            />
            <Action disabled={reason.trim().length < 10} onClick={queue}>
              Reconcile payment
            </Action>
          </fieldset>
        </>
      )}
    </section>
  );
}
