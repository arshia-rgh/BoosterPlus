import { useState } from "react";
import { Action, ErrorNotice, Text } from "../catalog/controls";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import {
  historySchema,
  submissionSchema,
  actionLabel,
  type Submission,
} from "./model";
export function History({ id, admin }: { id: string; admin: boolean }) {
  const [after, setAfter] = useState(0),
    resource = useResource(
      `${admin ? "/admin" : ""}/submissions/${id}/history?after=${String(after)}`,
      historySchema,
    );
  return (
    <section className="catalog-section">
      <h3>Submission history</h3>
      <ErrorNotice error={resource.error} />
      {!resource.error && resource.data && (
        <>
          <ol>
            {resource.data.events.map((event) => (
              <li key={event.version}>
                <p>
                  {actionLabel(event.action)} · {event.actor_role} ·{" "}
                  {new Date(event.created_at).toLocaleString()}
                </p>
                <p>{event.message}</p>
              </li>
            ))}
          </ol>
          {resource.data.events.length === 50 && (
            <Action
              onClick={() => {
                setAfter(resource.data?.events.at(-1)?.version ?? 0);
              }}
            >
              Later history
            </Action>
          )}
        </>
      )}
      {after > 0 && (
        <Action
          onClick={() => {
            setAfter(0);
          }}
        >
          First history
        </Action>
      )}
    </section>
  );
}
export function ReviewActions({
  value,
  admin,
  reload,
}: {
  value: Submission;
  admin: boolean;
  reload: () => void;
}) {
  const [note, setNote] = useState(""),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    [withdrawing, setWithdrawing] = useState(false),
    row = value.submission;
  async function change(action: string) {
    setBusy(true);
    setError(null);
    try {
      await post(
        `${admin ? "/admin" : ""}/submissions/${row.id}/${action}`,
        { version: row.version, note },
        submissionSchema,
      );
      reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  if (
    row.state === "accepted" ||
    row.state === "withdrawn" ||
    row.state === "rejected" ||
    (admin && row.state === "draft")
  )
    return null;
  return (
    <section className="catalog-section">
      <h3>{admin ? "Review decision" : "Before commercial acceptance"}</h3>
      <ErrorNotice error={error} />
      {admin ? (
        <>
          <Text
            label="Seller-visible review reason"
            value={note}
            change={setNote}
            multiline
          />
          <fieldset disabled={busy || !note.trim()}>
            <legend>Review actions</legend>
            {row.state !== "needs_information" && (
              <Action
                onClick={() => {
                  void change("clarify");
                }}
              >
                Request account information
              </Action>
            )}
            <Action
              onClick={() => {
                void change("reject");
              }}
            >
              Reject account submission
            </Action>
            {row.state === "submitted" && (
              <Action
                onClick={() => {
                  void change("approve_review");
                }}
              >
                Approve review pending terms
              </Action>
            )}
          </fieldset>
          <p>
            This decision does not verify a transfer, publish a listing, accept
            commercial terms or create a payout.
          </p>
        </>
      ) : (
        <details>
          <summary>Submission options</summary>
          <p>
            You may withdraw this submission before accepting any commercial
            agreement.
          </p>
          <Action
            disabled={busy}
            onClick={() => {
              setWithdrawing(true);
            }}
          >
            Withdraw account submission
          </Action>
          {withdrawing && (
            <fieldset disabled={busy}>
              <legend>Confirm withdrawal of {row.title}</legend>
              <p>
                This removes the account from review before commercial
                acceptance. Its history remains available. This does not cancel
                an accepted agreement.
              </p>
              <Action
                onClick={() => {
                  void change("withdraw");
                }}
              >
                Confirm account withdrawal
              </Action>
              <Action
                onClick={() => {
                  setWithdrawing(false);
                }}
              >
                Keep this submission
              </Action>
            </fieldset>
          )}
        </details>
      )}
    </section>
  );
}
