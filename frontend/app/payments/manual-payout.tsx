import { useEffect, useRef, useState } from "react";
import { Action, Check, ErrorNotice, Issues, Text } from "../catalog/controls";
import { APIError, post } from "../identity/api";
import { FieldValidation, focusValidationTarget } from "../ui/form-validation";
import { boundedTextIssue, useEditorValidation } from "../ui/editor-validation";
import { denied, uncertain as uncertainSave } from "../support/chat-state";
import { transferSchema, type Transfer } from "./cases-model";

export function ManualPayoutEvidence({
  record,
  summary = false,
}: {
  record: Transfer;
  summary?: boolean;
}) {
  const receipt = record.manual_receipt;
  if (!receipt) return null;
  const Heading = summary ? "h3" : "h4";
  return (
    <section
      aria-label={`Manual payout receipt ${record.id}${summary ? " (saved confirmation)" : ""}`}
      className="manual-payout-receipt"
    >
      <Heading>Payout completion recorded by staff</Heading>
      <p>
        PLAYORA staff confirmed an external crypto transfer. This record was not
        automatically verified by NOWPayments or the blockchain.
      </p>
      <dl>
        <dt>Seller received</dt>
        <dd>
          {record.amount} {record.currency.toUpperCase()} · {record.network}
        </dd>
        <dt>Confirmed destination</dt>
        <dd>
          {record.recipient.address}
          {record.recipient.memo ? ` · Memo: ${record.recipient.memo}` : ""}
        </dd>
        <dt>Transaction hash</dt>
        <dd>{receipt.transaction_hash}</dd>
        <dt>Transfer completed</dt>
        <dd>{new Date(receipt.completed_at).toLocaleString()}</dd>
        <dt>Recorded in PLAYORA</dt>
        <dd>{new Date(receipt.recorded_at).toLocaleString()}</dd>
      </dl>
      <p>
        Keep this receipt. Contact support from your submission if the transfer
        details or received amount do not match.
      </p>
    </section>
  );
}

type ManualPayload = {
  request_key: string;
  version: number;
  amount: string;
  currency: string;
  network: string;
  recipient: Transfer["recipient"];
  transaction_hash: string;
  completed_at: string;
  reason: string;
  confirm: boolean;
};
export type PendingManualPayout = {
  payload: ManualPayload;
  completedLocal: string;
  uncertain: boolean;
};
export type ManualPayoutControls = {
  pendingManual?: PendingManualPayout | undefined;
  onManualPending?:
    ((draft: PendingManualPayout | undefined) => void) | undefined;
};
export function useManualPayoutConfirmation(scope: string, error: unknown) {
  const [saved, setSaved] = useState<{
    scope: string;
    record: Transfer;
  } | null>(null);
  const [drafts, setDrafts] = useState<{
    scope: string;
    values: Map<string, PendingManualPayout>;
  }>({ scope, values: new Map() });
  const panel = useRef<HTMLElement>(null);
  const inaccessible = denied(error);
  if (saved && (saved.scope !== scope || inaccessible)) setSaved(null);
  if (drafts.scope !== scope || (inaccessible && drafts.values.size))
    setDrafts({ scope, values: new Map() });
  useEffect(() => {
    if (saved?.scope === scope && !inaccessible)
      focusValidationTarget(panel.current);
  }, [saved, scope, inaccessible]);
  function pending(recordID: string, draft: PendingManualPayout | undefined) {
    setDrafts((previous) => {
      const values = new Map(previous.scope === scope ? previous.values : []);
      if (draft) values.set(recordID, draft);
      else values.delete(recordID);
      return { scope, values };
    });
  }
  return {
    manualSaved: (record: Transfer) => {
      pending(record.id, undefined);
      setSaved({ scope, record });
    },
    controls: (recordID: string): ManualPayoutControls => ({
      pendingManual:
        drafts.scope === scope && !inaccessible
          ? drafts.values.get(recordID)
          : undefined,
      onManualPending: (draft) => {
        pending(recordID, draft);
      },
    }),
    feedback: !inaccessible && (
      <>
        {saved?.scope === scope && (
          <section
            className="catalog-section"
            aria-label="Manual payout saved"
            ref={panel}
            tabIndex={-1}
          >
            <p role="status">
              Completed payout recorded successfully. This form did not send
              crypto.
            </p>
            <ManualPayoutEvidence record={saved.record} summary />
            {!!error && (
              <p>
                The receipt is saved, but the latest payout list could not load.
                Refresh the list; do not send the payment again.
              </p>
            )}
          </section>
        )}
        {!!error && drafts.scope === scope && drafts.values.size > 0 && (
          <p role="status">
            The payout list could not load. Your entered transaction evidence is
            retained on this page. Refresh the list to check the receipt before
            retrying; do not send the crypto again.
          </p>
        )}
      </>
    ),
  };
}

const blocked = new Map([
  [
    "recipient_required",
    "The seller must first confirm the receiving address and accepted payout terms.",
  ],
  [
    "provider_attempt",
    "A provider attempt already exists. Review and resolve that attempt before considering any external payment; manual recording is unavailable.",
  ],
  [
    "eligibility_hold",
    "The accepted payout conditions are not met yet. Check account control, buyer handover, the inspection period and any open dispute or refund.",
  ],
  [
    "unsupported_network",
    "Manual recording is not available for this network. Contact the owner before sending any funds.",
  ],
  [
    "automatic_enabled",
    "Automatic payouts are enabled. Manual recording is unavailable to prevent competing payment methods.",
  ],
]);

export function manualPayoutIssues(
  network: string,
  hash: string,
  completedAt: string,
  reason: string,
  now = Date.now(),
) {
  const issues = boundedTextIssue("reason", reason, 10, 2000);
  const validHash =
    network === "bsc" || network === "eth"
      ? /^0x[0-9a-fA-F]{64}$/.test(hash)
      : network === "trx"
        ? /^[0-9a-fA-F]{64}$/.test(hash)
        : network === "sol" && /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(hash);
  if (!validHash)
    issues.unshift({
      path: "transaction_hash",
      message:
        "Enter the complete transaction hash for the displayed network, without an explorer URL or spaces.",
    });
  const at = Date.parse(completedAt);
  if (!Number.isFinite(at) || at > now)
    issues.push({
      path: "completed_at",
      message:
        "Enter when the transfer completed, using your local time. The time cannot be in the future.",
    });
  return issues;
}

export function ManualPayoutForm({
  record,
  refreshing,
  reload,
  onSaved,
  pendingManual,
  onManualPending,
}: ManualPayoutControls & {
  record: Transfer;
  refreshing: boolean;
  reload: () => void;
  onSaved?: (record: Transfer) => void;
}) {
  const [hash, setHash] = useState(
    pendingManual?.payload.transaction_hash ?? "",
  );
  const [completedAt, setCompletedAt] = useState(
    pendingManual?.completedLocal ?? "",
  );
  const [reason, setReason] = useState(pendingManual?.payload.reason ?? "");
  const [confirmed, setConfirmed] = useState(pendingManual?.uncertain ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [uncertain, setUncertain] = useState(pendingManual?.uncertain ?? false);
  const [key] = useState(
    () => pendingManual?.payload.request_key ?? crypto.randomUUID(),
  );
  const fields = useEditorValidation();
  const lock = useRef(false);
  const submitted = useRef<ManualPayload | null>(
    pendingManual?.payload ?? null,
  );
  const feedback = useRef<HTMLElement>(null);
  useEffect(() => {
    if (error && !busy) focusValidationTarget(feedback.current);
  }, [error, busy]);
  async function save() {
    if (
      lock.current ||
      refreshing ||
      !confirmed ||
      !record.manual_recording?.available
    )
      return;
    if (
      !uncertain &&
      !fields.check(
        manualPayoutIssues(record.network, hash, completedAt, reason),
      )
    )
      return;
    lock.current = true;
    setBusy(true);
    setError(null);
    const payload: ManualPayload =
      uncertain && submitted.current
        ? submitted.current
        : {
            request_key: key,
            version: record.version,
            amount: record.amount,
            currency: record.currency,
            network: record.network,
            recipient: record.recipient,
            transaction_hash: hash,
            completed_at: new Date(completedAt).toISOString(),
            reason,
            confirm: true,
          };
    submitted.current = payload;
    onManualPending?.({
      payload,
      completedLocal: completedAt,
      uncertain: true,
    });
    try {
      const saved = await post(
        `/admin/payouts/${record.id}/manual`,
        payload,
        transferSchema,
      );
      onManualPending?.(undefined);
      onSaved?.(saved);
      setUncertain(false);
      reload();
    } catch (cause) {
      setError(cause);
      setUncertain(uncertainSave(cause));
      onManualPending?.({
        payload,
        completedLocal: completedAt,
        uncertain: uncertainSave(cause),
      });
      if (cause instanceof APIError) fields.check(cause.issues);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!record.manual_recording?.available)
    return (
      <section aria-label="Manual payout status">
        <h4>Manual seller payout</h4>
        <p>
          {blocked.get(record.manual_recording?.reason ?? "") ??
            "Refresh the payout record to check whether it is ready for manual recording."}
        </p>
        <Action onClick={reload} disabled={refreshing}>
          Refresh payout record
        </Action>
      </section>
    );
  return (
    <FieldValidation value={fields.validation}>
      <section
        aria-label="Record completed manual payout"
        className="manual-payout-form"
      >
        <h4>Record a completed crypto payout</h4>
        <p>
          Send the agreed net amount from your own wallet, pay the sending fees
          separately, and check that the transfer completed at the
          seller-confirmed destination shown above. This form only records that
          completed payment.
        </p>
        <p>
          Only one completed transfer can be recorded per payout. Batch
          transfers, partial payments and earlier provider attempts need
          separate review.
        </p>
        {!!error && (
          <section
            ref={feedback}
            tabIndex={-1}
            aria-label="Manual payout feedback"
          >
            <ErrorNotice error={error} hideIssues />
            {error instanceof APIError && error.status === 409 && (
              <>
                <p>
                  This record conflicts with the current payout or an existing
                  transaction receipt. Refresh and review the accepted amount,
                  destination, eligibility and completion time. Do not send
                  another payment.
                </p>
                <Action onClick={reload} disabled={busy || refreshing}>
                  Refresh payout record
                </Action>
              </>
            )}
          </section>
        )}
        <Issues issues={fields.issues} />
        {uncertain && (
          <p role="status">
            We could not confirm whether this record was saved. Refresh the
            payout history first. You may retry saving the same record safely;
            do not send the crypto again.
          </p>
        )}
        <fieldset disabled={busy || refreshing || uncertain}>
          <legend>Evidence of the external transfer</legend>
          <Text
            name="transaction_hash"
            label="Transaction hash"
            value={hash}
            change={(value) => {
              setHash(value);
              setConfirmed(false);
            }}
            help="Copy the transaction hash, not an explorer link. Staff must verify its amount, asset, network and destination."
          />
          <Text
            name="completed_at"
            label="Transfer completion time"
            type="datetime-local"
            step={1}
            value={completedAt}
            change={(value) => {
              setCompletedAt(value);
              setConfirmed(false);
            }}
            help="Use your local time, after the seller confirmed the destination and the payout became eligible."
          />
          <Text
            name="reason"
            label="Verification note"
            multiline
            value={reason}
            change={(value) => {
              setReason(value);
              setConfirmed(false);
            }}
            help="Describe how you checked completion (at least 10 characters). This note is for authorized staff; never enter wallet keys or passwords."
          />
          <Check
            name="confirm"
            label="I checked that this transfer completed to the seller-confirmed destination for the exact agreed asset, network and net amount, with no fee deducted"
            value={confirmed}
            change={setConfirmed}
          />
        </fieldset>
        <Action
          disabled={!confirmed || busy || refreshing}
          onClick={() => void save()}
        >
          {busy
            ? "Saving payout record…"
            : uncertain
              ? "Retry saving the same record"
              : "Record completed payout"}
        </Action>
        {uncertain && (
          <Action onClick={reload} disabled={busy || refreshing}>
            Refresh payout record
          </Action>
        )}
        <p>
          Your normal authenticator or email verification may be requested. No
          NOWPayments code or wallet connection is needed.
        </p>
      </section>
    </FieldValidation>
  );
}
