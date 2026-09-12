import { useState } from "react";
import { z } from "../validation";
import { Action, Check, ErrorNotice, Select, Text } from "../catalog/controls";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import { transferSchema, transfersSchema, type Transfer } from "./cases-model";
import { historySchema } from "./model";

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
    [reason, setReason] = useState(""),
    [code, setCode] = useState(""),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const seller = record.kind === "seller_payout",
    noun = seller ? "Seller payout" : "Refund",
    endpoint = seller ? "payouts" : "refunds";
  async function recipient() {
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
      setBusy(false);
    }
  }
  async function act(action: string) {
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
      reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="catalog-section">
      <h3>
        {noun} · {record.amount} {record.currency.toUpperCase()} ·{" "}
        {record.network}
      </h3>
      <p role="status">
        Status: {record.state.replaceAll("_", " ")}
        {record.issue ? ` · ${record.issue.replaceAll("_", " ")}` : ""}
      </p>
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
          {["verified", "failed"].includes(record.state) && (
            <Action
              disabled={reason.trim().length < 10}
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
                disabled={reason.trim().length < 10 || !/^\d{6}$/.test(code)}
                onClick={() => void act("verify")}
              >
                Authorize provider transfer
              </Action>
            </>
          )}
        </fieldset>
      )}
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
    [error, setError] = useState<unknown>(null);
  async function propose() {
    setBusy(true);
    setError(null);
    try {
      await post(
        `/admin/cases/${caseID}/refunds`,
        { request_key: key, receipt_id: receipt, amount, terms },
        transferSchema,
      );
      setKey(crypto.randomUUID());
      setAmount("");
      setTerms("");
      reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset disabled={busy}>
      <legend>Propose a refund from received funds</legend>
      <p>
        Enter the exact crypto amount and approved terms, including fees and any
        partial-work deduction. The combined refund reserve cannot exceed the
        confirmed receipt. The customer must confirm a destination before owner
        approval.
      </p>
      <ErrorNotice error={history.error ?? error} />
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
      <Action
        disabled={!receipt || !amount || terms.trim().length < 20}
        onClick={() => void propose()}
      >
        Propose refund
      </Action>
    </fieldset>
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
      <Action onClick={resource.reload}>Refresh refunds</Action>
      {!resource.data ? (
        <p role="status">Loading refunds…</p>
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
