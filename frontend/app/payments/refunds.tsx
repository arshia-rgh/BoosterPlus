import { useRef, useState } from "react";
import { z } from "../validation";
import { Action, Check, ErrorNotice, Select, Text } from "../catalog/controls";
import { APIError, post } from "../identity/api";
import { useResource } from "../orders/resource";
import { transferSchema, transfersSchema, type Transfer } from "./cases-model";
import { historySchema } from "./model";

import TransferHistory from "./transfer-history";
import { transferPresentation } from "./presentation";
import "./workspace.css";
export function TransferRecord({
  record,
  admin,
  owner,
  reload,
  refreshing,
}: {
  record: Transfer;
  admin: boolean;
  owner: boolean;
  reload: () => void;
  refreshing: boolean;
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
  const status = transferPresentation(record.state);
  async function recipient() {
    if (lock.current || refreshing || !accepted || address.length < 8) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await post(
        `/${endpoint}/${record.id}/recipient`,
        { version: record.version, address, memo, accept: accepted },
        transferSchema,
      );
      setAccepted(false);
      reload();
    } catch (cause) {
      setError(cause);
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
      reason.trim().length < 10 ||
      (["approve", "verify"].includes(action) && !reviewed)
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
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
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
      {record.state === "confirmed" && (
        <p>
          The provider confirmed this outgoing transfer. The original agreement
          and payment history remain available separately.
        </p>
      )}
      <ErrorNotice error={error} />
      {!admin && ["recipient_pending", "verified"].includes(record.state) && (
        <fieldset disabled={busy || refreshing}>
          <legend>Confirm your {noun.toLowerCase()} destination</legend>
          <p>
            Use an address for {record.currency.toUpperCase()} on{" "}
            {record.network}. Include the required memo or tag. A recent Google
            or email sign-in is required.
          </p>
          <Text
            label={`${noun} destination address`}
            value={address}
            change={(value) => {
              setAddress(value);
              setAccepted(false);
            }}
          />
          <Text
            label={`${noun} memo or destination tag`}
            value={memo}
            change={(value) => {
              setMemo(value);
              setAccepted(false);
            }}
          />
          <Check
            label={`I accept these ${noun.toLowerCase()} terms and confirm this address, network and memo`}
            value={accepted}
            change={setAccepted}
          />
          <Action
            disabled={!accepted || address.length < 8}
            onClick={() => void recipient()}
          >
            Confirm {noun.toLowerCase()} recipient
          </Action>
        </fieldset>
      )}
      {owner && !["confirmed", "cancelled"].includes(record.state) && (
        <fieldset disabled={busy || refreshing}>
          <legend>Owner transfer authorization</legend>
          <p>
            Recent sign-in and authenticator verification are required. Outgoing
            payments must be enabled. A failed transfer needs fresh provider
            reconciliation before approval of a new attempt.
          </p>
          <Text
            label={`${noun} authorization reason`}
            multiline
            value={reason}
            change={setReason}
          />
          {["verified", "failed", "awaiting_verification"].includes(
            record.state,
          ) && (
            <Check
              label="I reviewed the recipient, exact amount, fees and due conditions"
              value={reviewed}
              change={setReviewed}
            />
          )}
          {["verified", "failed"].includes(record.state) && (
            <Action
              disabled={reason.trim().length < 10 || !reviewed}
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
              <Action
                disabled={reason.trim().length < 10}
                onClick={() => void act("cancel")}
              >
                Cancel unissued refund proposal
              </Action>
            )}
          {record.state === "awaiting_verification" && (
            <>
              <Text
                label="NOWPayments authenticator code"
                type="password"
                value={code}
                change={setCode}
                help="The merchant's current six-digit provider code. It is used once and never stored in the order."
              />
              <Action
                disabled={
                  reason.trim().length < 10 ||
                  !reviewed ||
                  !/^\d{6}$/.test(code)
                }
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
  async function propose() {
    if (
      lock.current ||
      history.loading ||
      !history.data ||
      !receipt ||
      !amount ||
      terms.trim().length < 20
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
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section aria-label="Refund proposal">
      <ErrorNotice error={history.error ?? error} />
      <Action disabled={busy || history.loading} onClick={history.reload}>
        Refresh refund source evidence
      </Action>
      {history.loading && <p role="status">Checking refundable receipts…</p>}
      <fieldset disabled={busy || history.loading || !history.data}>
        <legend>Propose a refund from received funds</legend>
        <p>
          Enter the exact crypto amount and approved terms, including fees and
          any partial-work deduction. The combined refund reserve cannot exceed
          the confirmed receipt. The customer must confirm a destination before
          owner approval.
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
              . This read is a snapshot; the server checks current reservations
              again when saving.
            </p>
          )}
          <Text
            label="Exact refund crypto amount"
            value={amount}
            change={(value) => {
              setAmount(value);
              setKey(crypto.randomUUID());
            }}
          />
          <Text
            label="Refund proposal terms"
            multiline
            value={terms}
            change={(value) => {
              setTerms(value);
              setKey(crypto.randomUUID());
            }}
          />
        </fieldset>
        <Action
          disabled={!receipt || !amount || terms.trim().length < 20}
          onClick={() => void propose()}
        >
          {pending ? "Retry exact refund proposal" : "Propose refund"}
        </Action>
      </fieldset>
    </section>
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
  return (
    <section aria-label="Refund history">
      <h3>Refund history</h3>
      <ErrorNotice error={resource.error} />
      <Action disabled={resource.loading} onClick={resource.reload}>
        Refresh refunds
      </Action>
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
