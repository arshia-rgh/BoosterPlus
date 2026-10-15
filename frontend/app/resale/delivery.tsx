import { Link, useLocation, type Location } from "../portal-router";
import { useEffect, useRef, useState } from "react";
import { Action, Check, ErrorNotice, Issues, Text } from "../catalog/controls";
import { APIError, post } from "../identity/api";
import { FieldValidation, focusValidationTarget } from "../ui/form-validation";
import { boundedTextIssue, useEditorValidation } from "../ui/editor-validation";
import { useResource } from "../orders/resource";
import { deliverySchema } from "./model";
import { denied } from "../support/chat-state";
import { ProductTerms } from "./market";

export default function AccountDelivery({
  id,
  admin,
  owner = false,
  paid,
  changed,
  visible = true,
}: {
  visible?: boolean;
  id: string;
  admin: boolean;
  owner?: boolean;
  paid: boolean;
  changed: () => void;
}) {
  const location: Location<unknown> = useLocation();
  const base = `${admin ? "/admin" : ""}/account-orders/${id}`,
    resource = useResource(`${base}/delivery`, deliverySchema);
  const [note, setNote] = useState(""),
    [accept, setAccept] = useState(false),
    [busy, setBusy] = useState(false),
    [completed, setCompleted] = useState<{ path: string; text: string } | null>(
      null,
    ),
    [error, setError] = useState<unknown>(null);
  const lock = useRef(false);
  const fields = useEditorValidation();
  const resultPanel = useRef<HTMLElement>(null),
    focusResult = useRef(false);
  const completion = completed?.path === base ? completed.text : "";
  const accessDenied = denied(resource.error) || denied(error);
  useEffect(() => {
    if (
      visible &&
      !busy &&
      !resource.loading &&
      !accessDenied &&
      completion &&
      focusResult.current
    ) {
      focusResult.current = false;
      focusValidationTarget(resultPanel.current);
    }
  }, [visible, busy, resource.loading, accessDenied, completion]);
  if (accessDenied && (note || accept || completed)) {
    setNote("");
    setAccept(false);
    setCompleted(null);
  }
  async function act(action = admin ? "deliver" : "acknowledge") {
    if (
      !visible ||
      !resource.data ||
      !!resource.error ||
      denied(error) ||
      resource.loading ||
      lock.current ||
      !paid ||
      !accept
    )
      return;
    if (!fields.check(boundedTextIssue("instructions", note, 10, 4000))) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setCompleted(null);
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
      focusResult.current = true;
      setCompleted({
        path: base,
        text:
          action === "acknowledge"
            ? "Your receipt acknowledgment was saved."
            : action === "takeover"
              ? "The pending handoff takeover was saved."
              : "Account access was marked as delivered.",
      });
      resource.reload();
      changed();
    } catch (cause) {
      setError(cause);
      if (cause instanceof APIError) fields.check(cause.issues);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const row = resource.error || denied(error) ? null : resource.data;
  return (
    <FieldValidation value={fields.validation}>
      <section aria-label="Account ownership delivery">
        <h2>Account ownership delivery</h2>
        {completion && !accessDenied && (
          <section
            aria-label="Account handoff result"
            ref={resultPanel}
            tabIndex={-1}
          >
            <p role="status">{completion}</p>
            <p>
              {resource.loading
                ? "Checking the latest delivery status…"
                : resource.error
                  ? "The refreshed delivery status is unavailable. Refresh account delivery to check it."
                  : "The latest handoff details are shown below. Your agreed support and dispute terms remain available."}
            </p>
          </section>
        )}
        <p>
          <Link
            to="?section=messages&channel=support"
            state={location.state}
            preventScrollReset
          >
            {admin
              ? "Add delivery evidence or message the buyer"
              : "Ask about this delivery"}
          </Link>
          {!admin && (
            <>
              {" "}
              ·{" "}
              <Link
                to="?section=help"
                state={location.state}
                preventScrollReset
              >
                Report a delivery issue
              </Link>
            </>
          )}
        </p>
        <ErrorNotice error={resource.error ?? error} hideIssues />
        <Issues issues={fields.issues} />
        <Action
          disabled={resource.loading}
          onClick={() => {
            setError(null);
            fields.check([]);
            resource.reload();
          }}
        >
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
                Verified payment and an order without an active hold are
                required for protected handoff.
              </p>
            )}
            <p className="payment-policy">{row.instructions}</p>
            {admin && (
              <details>
                <summary>Buyer view preview</summary>
                <section aria-label="Private buyer delivery preview">
                  <h3>Customer view · this order</h3>
                  <p>
                    This preview stays inside the admin workspace. Protected
                    credentials are never included.
                  </p>
                  <p>
                    {row.state === "pending"
                      ? "Your account is being prepared for secure delivery."
                      : row.state === "delivered"
                        ? "Your account access is ready. Verify ownership and acknowledge receipt after testing it."
                        : "Receipt is recorded. Your published support and dispute terms still apply."}
                  </p>
                  <p>{row.instructions}</p>
                </section>
              </details>
            )}
            {row.dispute_until && (
              <>
                <p>
                  {row.listing.product.commission
                    ? "Initial inspection ends"
                    : "Dispute deadline"}
                  : {new Date(row.dispute_until).toLocaleString()}
                </p>
                {row.listing.product.commission && (
                  <p>
                    Your protected refund and support rights continue under your
                    accepted terms after this initial inspection period.
                  </p>
                )}
              </>
            )}
            {paid && (
              <p>
                <Link
                  className="button compact secondary"
                  to="?section=messages&channel=support"
                  state={location.state}
                  preventScrollReset
                >
                  {admin
                    ? "Prepare or view access in chat"
                    : "View account access in chat"}
                </Link>
              </p>
            )}
            {paid &&
              ((admin && row.state === "pending") ||
                (!admin && row.state === "delivered")) && (
                <fieldset disabled={busy || resource.loading || !visible}>
                  <legend>
                    {admin
                      ? "Confirm protected handoff"
                      : "Confirm you received ownership"}
                  </legend>
                  <Text
                    name="instructions"
                    label={
                      admin
                        ? "Buyer ownership checklist"
                        : "Your acknowledgement note"
                    }
                    value={note}
                    change={setNote}
                    multiline
                    help="Use 10–4,000 characters. Ordinary instructions only; never include credentials here."
                  />
                  <Check
                    name="accept"
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
                      !accept || (admin && row.secret.state !== "active")
                    }
                    onClick={() => void act()}
                  >
                    {admin
                      ? "Deliver account access"
                      : "Acknowledge account received"}
                  </Action>
                  {owner && row.state === "pending" && row.version > 0 && (
                    <Action
                      disabled={!accept}
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
    </FieldValidation>
  );
}
