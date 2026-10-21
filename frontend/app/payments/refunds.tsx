import { useEffect, useRef, useState } from "react";
import { z } from "../validation";
import {
  Action,
  Check,
  ErrorNotice,
  Issues,
  Select,
  Text,
} from "../catalog/controls";
import { APIError, post } from "../identity/api";
import { useResource } from "../orders/resource";
import { transferSchema, transfersSchema, type Transfer } from "./cases-model";
import { historySchema } from "./model";

import TransferHistory from "./transfer-history";
import {
  ManualPayoutEvidence,
  ManualPayoutForm,
  type ManualPayoutControls,
} from "./manual-payout";
import { manualPayoutPresentation, transferPresentation } from "./presentation";
import "./workspace.css";
import { FieldValidation, focusValidationTarget } from "../ui/form-validation";
import { boundedTextIssue, useEditorValidation } from "../ui/editor-validation";
import { recipientIssues, refundProposalIssues } from "./transfer-validation";
import { denied } from "../support/chat-state";

// Keep this user-action receipt outside version-keyed records. A successful
// save remains understood even when the subsequent status read is unavailable.
export function useRecipientConfirmation(
  scope: string,
  refreshing: boolean,
  error: unknown,
) {
  const [saved, setSaved] = useState<{
    scope: string;
    noun: string;
    address: string;
    memo: string;
    currency: string;
    network: string;
  } | null>(null);
  const inaccessible = denied(error);
  if (saved && (saved.scope !== scope || inaccessible)) setSaved(null);
  const feedback = useRef<HTMLElement>(null);
  useEffect(() => {
    if (saved?.scope === scope && !inaccessible)
      focusValidationTarget(feedback.current);
  }, [saved, scope, inaccessible]);
  return {
    recipientSaved: (record: Transfer) => {
      setSaved({
        scope,
        noun: record.kind === "seller_payout" ? "Seller payout" : "Refund",
        address: record.recipient.address,
        memo: record.recipient.memo,
        currency: record.currency,
        network: record.network,
      });
    },
    feedback: saved?.scope === scope && !inaccessible && (
      <section
        className="catalog-section"
        aria-label={`${saved.noun} destination saved`}
        ref={feedback}
        tabIndex={-1}
      >
        <h4>{saved.noun} destination details saved</h4>
        <p role="status">
          Your destination details were saved. This does not mean the transfer
          is complete; transfer processing and confirmation are separate.
        </p>
        <p className="payment-policy">
          Saved destination: {saved.address}
          {saved.memo ? ` · Memo: ${saved.memo}` : ""}
        </p>
        <p>
          {saved.currency.toUpperCase()} · {saved.network}
        </p>
        {error ? (
          <p>
            The saved details are confirmed, but the latest transfer status is
            unavailable. Refresh the history to check its progress.
          </p>
        ) : refreshing ? (
          <p>Refreshing transfer status…</p>
        ) : null}
      </section>
    ),
  };
}
export function TransferRecord({
  record,
  admin,
  owner,
  reload,
  refreshing,
  onRecipientSaved,
  onManualSaved,
  pendingManual,
  onManualPending,
}: ManualPayoutControls & {
  record: Transfer;
  admin: boolean;
  owner: boolean;
  reload: () => void;
  refreshing: boolean;
  onRecipientSaved?: (record: Transfer) => void;
  onManualSaved?: (record: Transfer) => void;
}) {
  const [address, setAddress] = useState(record.recipient.address),
    [memo, setMemo] = useState(record.recipient.memo),
    [accepted, setAccepted] = useState(false),
    [reviewed, setReviewed] = useState(false),
    [showHistory, setShowHistory] = useState(false),
    [reason, setReason] = useState(""),
    [code, setCode] = useState(""),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const seller = record.kind === "seller_payout",
    noun = seller ? "Seller payout" : "Refund",
    endpoint = seller ? "payouts" : "refunds";
  const lock = useRef(false);
  const fields = useEditorValidation();
  const failurePanel = useRef<HTMLElement>(null);
  const focusFailure = useRef(false);
  useEffect(() => {
    if (!busy && error && focusFailure.current) {
      focusFailure.current = false;
      focusValidationTarget(failurePanel.current);
    }
  }, [busy, error]);
  const candidateDate = record.manual_recording?.eligible_after;
  const waitingUntil =
    seller &&
    record.state === "verified" &&
    !record.manual_recording?.available &&
    record.manual_recording?.reason === "eligibility_hold" &&
    candidateDate &&
    Number.isFinite(Date.parse(candidateDate))
      ? candidateDate
      : null;
  const status = record.manual_receipt
    ? {
        title: "Completed payout recorded by staff",
        description:
          "An external transfer was recorded. It was not automatically verified by the provider or blockchain.",
      }
    : seller &&
        record.manual_recording &&
        record.manual_recording.reason !== "automatic_enabled" &&
        record.state === "verified"
      ? manualPayoutPresentation(
          record.manual_recording,
          !!waitingUntil,
          record.seller_agreement?.terms.model === "consignment" &&
            record.seller_agreement.terms.payout_delay_hours === 0,
        )
      : transferPresentation(
          record.state,
          admin ? (seller ? "seller" : "customer") : "you",
        );
  async function recipient() {
    if (lock.current || refreshing || !accepted) return;
    if (!fields.check(recipientIssues(address, memo))) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const saved = await post(
        `/${endpoint}/${record.id}/recipient`,
        { version: record.version, address, memo, accept: accepted },
        transferSchema,
      );
      setAddress("");
      setMemo("");
      setAccepted(false);
      onRecipientSaved?.(saved);
      reload();
    } catch (cause) {
      setError(cause);
      if (cause instanceof APIError) fields.check(cause.issues);
      focusFailure.current = !(
        cause instanceof APIError && cause.issues.length
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function act(action: string) {
    if (
      lock.current ||
      refreshing ||
      !owner ||
      (["approve", "verify"].includes(action) && !reviewed)
    )
      return;
    if (
      !fields.check([
        ...boundedTextIssue("reason", reason, 10, 2000),
        ...(action === "verify" && !/^\d{6}$/.test(code)
          ? [
              {
                path: "code",
                message:
                  "Enter the current six-digit NOWPayments authenticator code.",
              },
            ]
          : []),
      ])
    )
      return;
    lock.current = true;
    setBusy(true);
    setError(null);
    const ephemeral = code;
    setCode("");
    try {
      const input = {
        version: record.version,
        reason,
        code: action === "verify" ? ephemeral : "",
      };
      if (action === "verify")
        await post(
          `/admin/${endpoint}/${record.id}/verify`,
          input,
          z.object({ queued: z.boolean() }),
        );
      else
        await post(
          `/admin/${endpoint}/${record.id}/${action}`,
          input,
          transferSchema,
        );
      setReason("");
      setReviewed(false);
      reload();
    } catch (cause) {
      setError(cause);
      if (cause instanceof APIError) fields.check(cause.issues);
      focusFailure.current = !(
        cause instanceof APIError && cause.issues.length
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <FieldValidation value={fields.validation}>
      <article className="catalog-section transfer-record">
        <h3>
          {noun} · {record.amount} {record.currency.toUpperCase()} ·{" "}
          {record.network}
        </h3>
        <p role="status">
          <strong>{status.title}</strong> — {status.description}
          {record.issue
            ? " Staff are reviewing an issue with this transfer."
            : ""}
        </p>
        {waitingUntil && !record.manual_receipt && (
          <p>
            Agreed waiting period ends:{" "}
            <time dateTime={waitingUntil}>
              {new Date(waitingUntil).toLocaleString()}
            </time>
            . An open case or another unmet condition can keep the payout on
            hold after this time.
          </p>
        )}
        {record.seller_agreement && (
          <section>
            <h4>Accepted seller agreement</h4>
            <p>
              Offer {record.seller_agreement.id} ·{" "}
              {record.seller_agreement.terms.model === "buy_first"
                ? "Buy-first acquisition"
                : "Consignment"}
            </p>
            <p>{record.seller_agreement.terms.proceeds_basis}</p>
            <p className="payment-policy">
              Fees: {record.seller_agreement.terms.fees}
            </p>
            <p className="payment-policy">
              Ownership obligations:{" "}
              {record.seller_agreement.terms.transfer_requirements}
            </p>
            <p className="payment-policy">
              Dispute conditions: {record.seller_agreement.terms.dispute_terms}
            </p>
            <p>
              Agreed delay after eligibility:{" "}
              {record.seller_agreement.terms.payout_delay_hours} hours. Agreed
              deadline after eligibility:{" "}
              {record.seller_agreement.terms.payout_deadline_hours} hours.
            </p>
          </section>
        )}
        <h4>Agreed transfer terms</h4>
        <p className="payment-policy">{record.terms}</p>
        {record.recipient.address && (
          <p className="payment-policy">
            Confirmed destination: {record.recipient.address}
            {record.recipient.memo ? ` · Memo: ${record.recipient.memo}` : ""}
          </p>
        )}
        {record.state === "confirmed" && !record.manual_receipt && (
          <p>
            The provider confirmed this outgoing transfer. The original
            agreement and payment history remain available separately.
          </p>
        )}
        {!!error && (
          <section
            aria-label={`${noun} action feedback`}
            ref={failurePanel}
            tabIndex={-1}
          >
            <ErrorNotice error={error} hideIssues />
          </section>
        )}
        <Issues issues={fields.issues} />
        {!admin && ["recipient_pending", "verified"].includes(record.state) && (
          <fieldset disabled={busy || refreshing}>
            <legend>Confirm your {noun.toLowerCase()} destination</legend>
            <p>
              Use an address for {record.currency.toUpperCase()} on{" "}
              {record.network}. Include the required memo or tag.
            </p>
            <Text
              name="address"
              label={`${noun} destination address`}
              value={address}
              change={(value) => {
                setAddress(value);
                setAccepted(false);
              }}
            />
            <Text
              name="memo"
              label={`${noun} memo or destination tag (if your wallet needs one)`}
              value={memo}
              change={(value) => {
                setMemo(value);
                setAccepted(false);
              }}
            />
            <Check
              name="accept"
              label={`I accept these ${noun.toLowerCase()} terms and confirm this address, network and memo`}
              value={accepted}
              change={setAccepted}
            />
            <div className="form-actions">
              <Action disabled={!accepted} onClick={() => void recipient()}>
                Confirm {noun.toLowerCase()} recipient
              </Action>
            </div>
          </fieldset>
        )}
        {record.manual_receipt && <ManualPayoutEvidence record={record} />}
        {owner &&
          seller &&
          record.manual_recording &&
          !["confirmed", "cancelled"].includes(record.state) && (
            <ManualPayoutForm
              pendingManual={pendingManual}
              onManualPending={onManualPending}
              record={record}
              refreshing={refreshing}
              reload={reload}
              {...(onManualSaved ? { onSaved: onManualSaved } : {})}
            />
          )}
        {owner &&
          !(
            seller &&
            record.manual_recording &&
            record.manual_recording.reason !== "automatic_enabled"
          ) &&
          !["confirmed", "cancelled"].includes(record.state) && (
            <fieldset disabled={busy || refreshing}>
              <legend>Owner transfer authorization</legend>
              <p>
                Confirm with an authenticator or email code when requested.
                Outgoing payments must be enabled. A failed transfer needs fresh
                provider reconciliation before approval of a new attempt.
              </p>
              <Text
                name="reason"
                label={`${noun} authorization reason`}
                multiline
                value={reason}
                change={setReason}
              />
              {["verified", "failed", "awaiting_verification"].includes(
                record.state,
              ) && (
                <Check
                  name="reviewed"
                  label="I reviewed the recipient, exact amount, fees and due conditions"
                  value={reviewed}
                  change={setReviewed}
                />
              )}
              {["verified", "failed"].includes(record.state) && (
                <Action
                  disabled={!reviewed}
                  onClick={() => void act("approve")}
                >
                  {record.state === "failed"
                    ? "Approve new attempt after failure"
                    : `Approve exact ${noun.toLowerCase()}`}
                </Action>
              )}
              {!seller &&
                ["recipient_pending", "verified", "approved"].includes(
                  record.state,
                ) && (
                  <Action onClick={() => void act("cancel")}>
                    Cancel unissued refund proposal
                  </Action>
                )}
              {record.state === "awaiting_verification" && (
                <>
                  <Text
                    name="code"
                    label="NOWPayments authenticator code"
                    type="password"
                    value={code}
                    change={setCode}
                    help="The merchant's current six-digit provider code. It is used once and never stored in the order."
                  />
                  <Action
                    disabled={!reviewed}
                    onClick={() => void act("verify")}
                  >
                    Authorize provider transfer
                  </Action>
                </>
              )}
            </fieldset>
          )}
        <Action
          onClick={() => {
            setShowHistory((value) => !value);
          }}
        >
          {showHistory ? "Hide transfer history" : "Review transfer history"}
        </Action>
        {showHistory && <TransferHistory record={record} admin={admin} />}
      </article>
    </FieldValidation>
  );
}
function Proposal({
  orderID,
  caseID,
  reload,
}: {
  orderID: string;
  caseID: string;
  reload: () => void;
}) {
  const history = useResource(
    `/admin/orders/${orderID}/payments`,
    historySchema,
  );
  const [receipt, setReceipt] = useState(""),
    [amount, setAmount] = useState(""),
    [terms, setTerms] = useState(""),
    [key, setKey] = useState(() => crypto.randomUUID()),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>(null);
  const lock = useRef(false);
  const fields = useEditorValidation();
  async function propose() {
    if (lock.current || history.loading || !history.data) return;
    if (
      !fields.check(
        refundProposalIssues(
          history.data.receipts.some(
            (value) => value.id === receipt && value.state === "confirmed",
          ),
          amount,
          terms,
        ),
      )
    )
      return;
    lock.current = true;
    setBusy(true);
    setPending(true);
    setError(null);
    try {
      await post(
        `/admin/cases/${caseID}/refunds`,
        { request_key: key, receipt_id: receipt, amount, terms },
        transferSchema,
      );
      setKey(crypto.randomUUID());
      setPending(false);
      setAmount("");
      setTerms("");
      history.reload();
      reload();
    } catch (cause) {
      if (cause instanceof APIError && cause.status === 422) setPending(false);
      setError(cause);
      if (cause instanceof APIError) fields.check(cause.issues);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <FieldValidation value={fields.validation}>
      <section aria-label="Refund proposal">
        <ErrorNotice error={history.error ?? error} hideIssues />
        <Issues issues={fields.issues} />
        <Action disabled={busy || history.loading} onClick={history.reload}>
          Refresh refund source evidence
        </Action>
        {history.loading && <p role="status">Checking refundable receipts…</p>}
        <fieldset disabled={busy || history.loading || !history.data}>
          <legend>Propose a refund from received funds</legend>
          <p>
            Enter the exact crypto amount and approved terms, including fees and
            any partial-work deduction. The combined refund reserve cannot
            exceed the confirmed receipt. The customer must confirm a
            destination before owner approval.
          </p>
          {pending && (
            <p role="status">
              Checking this exact refund proposal. Its amount, receipt and terms
              stay locked while the response is uncertain. Retry sends the same
              request; refresh refund history to inspect a recorded proposal.
            </p>
          )}
          <fieldset disabled={pending}>
            <legend>Exact proposal details</legend>
            <Select
              name="receipt_id"
              label="Refund source receipt"
              value={receipt}
              change={(value) => {
                setReceipt(value);
                setKey(crypto.randomUUID());
              }}
              options={[
                ["", "Choose a confirmed receipt"],
                ...(history.data?.receipts
                  .filter((value) => value.state === "confirmed")
                  .map(
                    (value) =>
                      [
                        value.id,
                        `${value.amount} ${value.currency.toUpperCase()} · ${value.network}`,
                      ] as const,
                  ) ?? []),
              ]}
            />
            {receipt && (
              <p role="status">
                Remaining refundable amount:{" "}
                {history.data?.receipts.find((value) => value.id === receipt)
                  ?.refundable_amount ??
                  "Unavailable; refresh payment evidence before proceeding"}
                . This read is a snapshot; the server checks current
                reservations again when saving.
              </p>
            )}
            <Text
              name="amount"
              label="Exact refund crypto amount"
              value={amount}
              change={(value) => {
                setAmount(value);
                setKey(crypto.randomUUID());
              }}
            />
            <Text
              name="terms"
              label="Refund proposal terms"
              multiline
              value={terms}
              change={(value) => {
                setTerms(value);
                setKey(crypto.randomUUID());
              }}
            />
          </fieldset>
          <Action onClick={() => void propose()}>
            {pending ? "Retry exact refund proposal" : "Propose refund"}
          </Action>
        </fieldset>
      </section>
    </FieldValidation>
  );
}
export default function Refunds({
  orderID,
  caseID,
  admin,
  owner,
}: {
  orderID: string;
  caseID: string;
  admin: boolean;
  owner: boolean;
}) {
  const resource = useResource(
    `${admin ? "/admin" : ""}/orders/${orderID}/refunds`,
    transfersSchema,
  );
  const confirmation = useRecipientConfirmation(
    `${admin ? "admin" : "customer"}:${orderID}`,
    resource.loading,
    resource.error,
  );
  return (
    <section aria-label="Refund history">
      <h3>Refund history</h3>
      <ErrorNotice error={resource.error} />
      <Action disabled={resource.loading} onClick={resource.reload}>
        Refresh refunds
      </Action>
      {confirmation.feedback}
      {!resource.data ? (
        resource.loading ? (
          <p role="status">Loading refunds…</p>
        ) : null
      ) : (
        <>
          {resource.data.transfers.length === 0 && (
            <p>No refund proposals or outgoing payments recorded.</p>
          )}
          {resource.data.transfers.map((record) => (
            <TransferRecord
              key={`${record.id}:${String(record.version)}`}
              record={record}
              refreshing={resource.loading}
              admin={admin}
              owner={owner}
              reload={resource.reload}
              onRecipientSaved={confirmation.recipientSaved}
            />
          ))}
          {admin && caseID && (
            <Proposal
              orderID={orderID}
              caseID={caseID}
              reload={resource.reload}
            />
          )}
        </>
      )}
    </section>
  );
}
