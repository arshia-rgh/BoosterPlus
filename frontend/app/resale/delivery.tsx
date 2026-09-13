import { useRef, useState } from "react";
import { Action, Check, ErrorNotice, Text } from "../catalog/controls";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import { deliverySchema } from "./model";
import { ProductTerms } from "./market";
import { SecretReveal, SecretUpload } from "./secret";

export default function AccountDelivery({
  id,
  admin,
  owner = false,
  paid,
  changed,
}: {
  id: string;
  admin: boolean;
  owner?: boolean;
  paid: boolean;
  changed: () => void;
}) {
  const base = `${admin ? "/admin" : ""}/account-orders/${id}`,
    resource = useResource(`${base}/delivery`, deliverySchema);
  const [note, setNote] = useState(""),
    [accept, setAccept] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const lock = useRef(false);
  async function act(action = admin ? "deliver" : "acknowledge") {
    if (
      !resource.data ||
      resource.loading ||
      lock.current ||
      !paid ||
      !accept ||
      note.trim().length < 10
    )
      return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await post(
        `${base}/delivery/${action}`,
        {
          version: resource.data.version,
          secret_version: resource.data.secret.version,
          instructions: note,
          accept,
        },
        deliverySchema,
      );
      setAccept(false);
      setNote("");
      resource.reload();
      changed();
    } catch (cause) {
      setError(cause);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const row = resource.error ? null : resource.data;
  return (
    <section aria-label="Account ownership delivery">
      <h2>Account ownership delivery</h2>
      <ErrorNotice error={resource.error ?? error} />
      <Action disabled={resource.loading} onClick={resource.reload}>
        Refresh account delivery
      </Action>
      {resource.loading && <p role="status">Checking account handoff…</p>}
      {row && (
        <>
          <p role="status">Handoff: {row.state}</p>
          <p className="seller-next-step">
            {!paid
              ? "Payment must be verified and holds resolved before access is available."
              : row.state === "pending"
                ? "The team is preparing protected account access. You can return here when it is ready."
                : row.state === "delivered"
                  ? "Access is ready. Follow the ownership checklist, test access, then confirm receipt."
                  : row.state === "acknowledged"
                    ? "You confirmed receipt. Keep your account secure; the agreed dispute terms remain available."
                    : "Contact support for the current ownership status."}
          </p>
          <details>
            <summary>Accepted account and sale terms</summary>
            <ProductTerms listing={row.listing} />
          </details>
          {!paid && (
            <p>
              Verified payment and an order without an active hold are required
              for protected handoff.
            </p>
          )}
          <p className="payment-policy">{row.instructions}</p>
          {row.dispute_until && (
            <p>
              Dispute deadline: {new Date(row.dispute_until).toLocaleString()}
            </p>
          )}
          {admin && paid && row.state === "pending" && (
            <SecretUpload
              key={`${String(row.version)}:${String(row.secret.version)}`}
              path={`/admin/account-orders/${id}/secret`}
              version={row.secret.version}
              changed={resource.reload}
            />
          )}
          {!admin &&
            paid &&
            ["delivered", "acknowledged"].includes(row.state) && (
              <SecretReveal path={`/account-orders/${id}/secret/reveal`} />
            )}
          {paid &&
            ((admin && row.state === "pending") ||
              (!admin && row.state === "delivered")) && (
              <fieldset disabled={busy || resource.loading}>
                <legend>
                  {admin
                    ? "Confirm protected handoff"
                    : "Confirm you received ownership"}
                </legend>
                <Text
                  label={
                    admin
                      ? "Buyer ownership checklist"
                      : "Your acknowledgement note"
                  }
                  value={note}
                  change={setNote}
                  multiline
                  help="Ordinary instructions only. Never include credentials here."
                />
                <Check
                  label={
                    admin
                      ? "I verified the buyer bundle and ownership checklist"
                      : "I received and tested account access and accept the acknowledgement terms"
                  }
                  value={accept}
                  change={setAccept}
                />
                <Action
                  disabled={
                    !accept ||
                    note.trim().length < 10 ||
                    (admin && row.secret.state !== "active")
                  }
                  onClick={() => void act()}
                >
                  {admin
                    ? "Deliver account access"
                    : "Acknowledge account received"}
                </Action>
                {owner && row.state === "pending" && row.version > 0 && (
                  <Action
                    disabled={!accept || note.trim().length < 10}
                    onClick={() => void act("takeover")}
                  >
                    Take over pending handoff and revoke prior bundle
                  </Action>
                )}
              </fieldset>
            )}
        </>
      )}
    </section>
  );
}
