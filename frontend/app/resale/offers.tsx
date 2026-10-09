import { FieldValidation, ValidationSummary } from "../ui/form-validation";
import { useActionValidation } from "../ui/action-validation";
import { sellerIssues } from "./validation";
import { Button } from "../ui/primitives";
import { useEffect, useRef, useState } from "react";
import { z } from "../validation";
import {
  Link,
  useLocation,
  useNavigate,
  type Location,
} from "../portal-router";
import {
  Action,
  Check,
  ErrorNotice,
  NumberInput,
  Select,
  Text,
} from "../catalog/controls";
import { post, sessionSchema } from "../identity/api";
import { useResource } from "../orders/resource";
import { TransferRecord, useRecipientConfirmation } from "../payments/refunds";
import { transfersSchema } from "../payments/cases-model";
import {
  listingSchema,
  offerSchema,
  offersSchema,
  secretSchema,
  type Offer,
  type SellerTerms,
} from "./model";
import { denied } from "../support/chat-state";
import { SecretReveal, SecretUpload } from "./secret";

import "./marketplace.css";
export const termFields = [
  ["proceeds_basis", "Seller proceeds basis"],
  ["fees", "Fees and deductions"],
  ["transfer_requirements", "Seller ownership requirements"],
  ["dispute_terms", "Seller dispute terms"],
  ["withdrawal_terms", "Seller withdrawal terms"],
] as const;
function sellerTerm(terms: SellerTerms, key: (typeof termFields)[number][0]) {
  switch (key) {
    case "proceeds_basis":
      return terms.proceeds_basis;
    case "fees":
      return terms.fees;
    case "transfer_requirements":
      return terms.transfer_requirements;
    case "dispute_terms":
      return terms.dispute_terms;
    case "withdrawal_terms":
      return terms.withdrawal_terms;
  }
}
function Proposal({
  id,
  version,
  changed,
}: {
  id: string;
  version: number;
  changed: () => void;
}) {
  const [terms, setTerms] = useState<SellerTerms>({
      model: "consignment",
      currency: "",
      network: "",
      amount: "",
      proceeds_basis: "",
      fees: "",
      transfer_requirements: "",
      dispute_terms: "",
      withdrawal_terms: "",
      payout_delay_hours: 0,
      payout_deadline_hours: 0,
    }),
    [expires, setExpires] = useState(""),
    [key, setKey] = useState(() => crypto.randomUUID()),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const validation = useActionValidation();
  function edit<K extends keyof SellerTerms>(field: K, value: SellerTerms[K]) {
    setTerms((v) => ({ ...v, [field]: value }));
    setKey(crypto.randomUUID());
  }
  async function propose() {
    if (busy || !validation.check(sellerIssues(terms, expires))) return;
    setBusy(true);
    setError(null);
    try {
      await post(
        `/admin/submissions/${id}/offers`,
        {
          request_key: key,
          submission_version: version,
          terms,
          expires_at: new Date(expires).toISOString(),
        },
        offerSchema,
      );
      changed();
    } catch (cause) {
      validation.server(cause);
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <FieldValidation value={validation.validation}>
      <fieldset disabled={busy}>
        <legend>Owner: propose seller agreement</legend>
        <p>
          Choose the arrangement per offer. Enter the exact net crypto
          obligation and all commercial terms. The seller must explicitly
          accept; acceptance does not itself move funds.
        </p>
        <ErrorNotice error={error} />
        <ValidationSummary
          issues={validation.validation.issues}
          fields={validation.validation.fields}
        />
        <Select
          name="terms.model"
          label="Seller payment arrangement"
          value={terms.model}
          change={(v) => {
            edit("model", v === "buy_first" ? "buy_first" : "consignment");
          }}
          options={[
            ["consignment", "Pay after buyer delivery and dispute window"],
            ["buy_first", "Pay seller before publishing for resale"],
          ]}
        />
        <Text
          name="terms.currency"
          label="Seller payout asset code"
          value={terms.currency}
          change={(v) => {
            edit("currency", v);
          }}
        />
        <Text
          name="terms.network"
          label="Seller payout network"
          value={terms.network}
          change={(v) => {
            edit("network", v);
          }}
        />
        <Text
          name="terms.amount"
          label="Exact net seller crypto amount"
          value={terms.amount}
          change={(v) => {
            edit("amount", v);
          }}
        />
        {termFields.map(([key, label]) => (
          <Text
            key={key}
            name={`terms.${key}`}
            label={label}
            multiline
            value={sellerTerm(terms, key)}
            change={(v) => {
              edit(key, v);
            }}
          />
        ))}
        <NumberInput
          name="terms.payout_delay_hours"
          label="Payout delay hours after eligibility"
          value={terms.payout_delay_hours}
          change={(v) => {
            edit("payout_delay_hours", v);
          }}
        />
        <NumberInput
          name="terms.payout_deadline_hours"
          label="Payout deadline hours after eligibility"
          value={terms.payout_deadline_hours}
          change={(v) => {
            edit("payout_deadline_hours", v);
          }}
        />
        <Text
          name="expires_at"
          label="Seller offer expires"
          type="datetime-local"
          value={expires}
          change={(v) => {
            setExpires(v);
            setKey(crypto.randomUUID());
          }}
        />
        <Action disabled={busy} onClick={() => void propose()}>
          Propose exact seller terms
        </Action>
      </fieldset>
    </FieldValidation>
  );
}
function SellerBundle({ id }: { id: string }) {
  const resource = useResource(`/seller-offers/${id}/secret`, secretSchema);
  return (
    <>
      <ErrorNotice error={resource.error} />
      {resource.data && (
        <SecretUpload
          path={`/seller-offers/${id}/secret`}
          version={resource.data.version}
          changed={resource.reload}
        />
      )}
    </>
  );
}
const offerHistorySchema = z.object({
  events: z.array(
    z.object({
      version: z.number().int(),
      action: z.string(),
      role: z.string(),
      note: z.string(),
      created_at: z.string(),
    }),
  ),
});
function OfferHistory({ id, admin }: { id: string; admin: boolean }) {
  const [after, setAfter] = useState(0),
    resource = useResource(
      `${admin ? "/admin" : ""}/seller-offers/${id}/events?after=${String(after)}`,
      offerHistorySchema,
    );
  return (
    <section>
      <h4>Agreement decision history</h4>
      <ErrorNotice error={resource.error} />
      <ol>
        {resource.data?.events.map((event) => (
          <li key={event.version}>
            <p>
              {event.action.replaceAll("_", " ")} · {event.role} ·{" "}
              {new Date(event.created_at).toLocaleString()}
            </p>
            <p className="payment-policy">{event.note}</p>
          </li>
        ))}
      </ol>
      {resource.data?.events.length === 50 && (
        <Action
          onClick={() => {
            setAfter(resource.data?.events.at(-1)?.version ?? 0);
          }}
        >
          Later agreement decisions
        </Action>
      )}
      {after > 0 && (
        <Action
          onClick={() => {
            setAfter(0);
          }}
        >
          First agreement decisions
        </Action>
      )}
    </section>
  );
}
function OfferRecord({
  offer,
  admin,
  owner,
  changed,
  view = "all",
  visible = true,
}: {
  view?: "all" | "agreement" | "handover";
  visible?: boolean;
  offer: Offer;
  admin: boolean;
  owner: boolean;
  changed: () => void;
}) {
  const [note, setNote] = useState(""),
    [accept, setAccept] = useState(false),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    [history, setHistory] = useState(false),
    navigate = useNavigate();
  const lock = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (offer.state !== "offered") return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [offer.state]);
  const deadline = Date.parse(offer.expires_at),
    expired = !Number.isFinite(deadline) || deadline <= now;
  async function act(action: string) {
    if (
      lock.current ||
      !accept ||
      note.trim().length < 10 ||
      Array.from(note).length > 2000 ||
      (action === "accept" && expired)
    )
      return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await post(
        `${admin ? "/admin" : ""}/seller-offers/${offer.id}/${action}`,
        { version: offer.version, note, accept },
        offerSchema,
      );
      changed();
    } catch (cause) {
      setError(cause);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function listing() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const row = await post(
        `/admin/seller-offers/${offer.id}/listing`,
        {},
        listingSchema,
      );
      void navigate(`/admin/accounts/${row.id}?section=details`, {
        state: { submissionID: offer.submission_id },
      });
    } catch (cause) {
      setError(cause);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <article className="catalog-section seller-offer">
      <h3>
        {offer.terms.model === "buy_first"
          ? "Buy before resale"
          : "Consignment after buyer delivery"}
      </h3>
      <p role="status">Offer: {offer.state}</p>
      <p className="seller-next-step">
        {offer.state === "offered"
          ? expired
            ? "This offer has expired. Ask the team for updated terms before accepting."
            : "Review the exact amount, fees and timing below before making your decision."
          : offer.state === "accepted"
            ? offer.control_verified_at
              ? "Ownership control is verified. Review the accepted payout terms and current eligibility."
              : "Your agreement is accepted. Complete protected ownership transfer; do not send access details in chat."
            : "This offer is no longer open for acceptance. Its terms remain available for your records."}
      </p>
      {view !== "handover" && (
        <>
          <p className="package-price">
            {offer.terms.amount} {offer.terms.currency.toUpperCase()} ·{" "}
            {offer.terms.network}
          </p>
          <dl className="seller-term-list">
            {termFields.map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd className="payment-policy">
                  {sellerTerm(offer.terms, key)}
                </dd>
              </div>
            ))}
          </dl>
          <p>
            Payout delay {offer.terms.payout_delay_hours} hours; deadline{" "}
            {offer.terms.payout_deadline_hours} hours after{" "}
            {offer.terms.model === "buy_first"
              ? "verified ownership control"
              : "buyer acknowledgement and the delivery dispute window"}
            .
          </p>
          <p>
            Offer expires:{" "}
            <time dateTime={offer.expires_at}>
              {new Date(offer.expires_at).toLocaleString()}
            </time>
          </p>
        </>
      )}
      <ErrorNotice error={error} />
      {((view !== "handover" &&
        offer.state === "offered" &&
        (!admin || owner)) ||
        (view !== "agreement" &&
          offer.state === "accepted" &&
          owner &&
          !offer.control_verified_at)) && (
        <fieldset disabled={busy}>
          <legend>Commercial decision</legend>
          <Text
            label="Seller agreement decision note"
            help="Enter 10–2,000 characters explaining this decision, then confirm the terms below."
            error={
              note &&
              (Array.from(note.trim()).length < 10 ||
                Array.from(note).length > 2000)
                ? "Enter a decision note of 10–2,000 characters."
                : undefined
            }
            value={note}
            change={setNote}
            multiline
          />
          <Check
            label="I confirm these exact terms and this decision"
            value={accept}
            change={setAccept}
          />
          {offer.state === "offered" ? (
            <div className="ui-state-actions">
              {!admin && (
                <Action
                  disabled={
                    expired ||
                    !accept ||
                    note.trim().length < 10 ||
                    Array.from(note).length > 2000
                  }
                  onClick={() => void act("accept")}
                >
                  Accept seller agreement
                </Action>
              )}
              <Button
                variant="secondary"
                className="button compact"
                disabled={
                  !accept ||
                  note.trim().length < 10 ||
                  Array.from(note).length > 2000
                }
                onClick={() => void act(admin ? "withdraw" : "decline")}
              >
                {admin
                  ? "Withdraw unaccepted offer"
                  : "Decline seller agreement"}
              </Button>
            </div>
          ) : (
            <Action
              disabled={
                !accept ||
                note.trim().length < 10 ||
                Array.from(note).length > 2000
              }
              onClick={() => void act("verify_control")}
            >
              Verify ownership control
            </Action>
          )}
        </fieldset>
      )}
      {offer.state === "accepted" && view !== "agreement" && (
        <>
          {visible && !admin && !offer.control_verified_at && (
            <SellerBundle id={offer.id} />
          )}{" "}
          {visible && owner && (
            <SecretReveal
              path={`/admin/seller-offers/${offer.id}/secret/reveal`}
            />
          )}{" "}
          {offer.control_verified_at && (
            <p>
              Ownership control verified:{" "}
              {new Date(offer.control_verified_at).toLocaleString()}
            </p>
          )}
          {admin && offer.control_verified_at && (
            <Action disabled={busy} onClick={() => void listing()}>
              Open inventory listing
            </Action>
          )}
        </>
      )}
      <Action
        onClick={() => {
          setHistory((v) => !v);
        }}
      >
        {history ? "Hide" : "Show"} agreement decision history
      </Action>
      {history && <OfferHistory id={offer.id} admin={admin} />}
    </article>
  );
}
export function SellerPayouts({
  id,
  admin,
  owner,
}: {
  id: string;
  admin: boolean;
  owner: boolean;
}) {
  const resource = useResource(
    `${admin ? "/admin" : ""}/submissions/${id}/payouts`,
    transfersSchema,
  );
  const confirmation = useRecipientConfirmation(
    `${admin ? "admin" : "customer"}:${id}`,
    resource.loading,
    resource.error,
  );
  return (
    <section>
      <h3>Direct seller payouts</h3>
      <Action disabled={resource.loading} onClick={resource.reload}>
        Refresh seller payouts
      </Action>
      {resource.loading && <p role="status">Checking seller payouts…</p>}
      <ErrorNotice error={resource.error} />
      {confirmation.feedback}
      {resource.data?.transfers.map((row) => (
        <TransferRecord
          key={`${row.id}:${String(row.version)}`}
          record={row}
          admin={admin}
          owner={owner}
          reload={resource.reload}
          refreshing={resource.loading}
          onRecipientSaved={confirmation.recipientSaved}
        />
      ))}
      {resource.data?.transfers.length === 0 && (
        <p>No seller payout obligation is recorded yet.</p>
      )}
    </section>
  );
}
export default function SellerOffers({
  id,
  version,
  state,
  admin,
  changed,
  view = "all",
  visible = true,
}: {
  view?: "all" | "agreement" | "handover" | "payout";
  visible?: boolean;
  id: string;
  version: number;
  state: string;
  admin: boolean;
  changed: () => void;
}) {
  const location: Location<unknown> = useLocation();
  const resource = useResource(
      `${admin ? "/admin" : ""}/submissions/${id}/offers`,
      offersSchema,
    ),
    session = useResource("/auth/session", sessionSchema),
    owner = admin && session.data?.user?.role === "owner";
  const [saved, setSaved] = useState<z.infer<typeof offersSchema> | null>(null);
  if (denied(resource.error) && saved) setSaved(null);
  else if (!resource.error && resource.data && saved !== resource.data)
    setSaved(resource.data);
  const current = denied(resource.error) ? null : (resource.data ?? saved);
  const refreshOffers = resource.reload;
  useEffect(() => {
    refreshOffers();
  }, [version, refreshOffers]);
  const reload = () => {
    resource.reload();
    changed();
  };
  if (view === "payout")
    return (
      <section aria-label="Seller payout">
        <h3>{admin ? "Seller payout" : "Your direct payout"}</h3>
        <p>
          Payouts follow the accepted arrangement and its eligibility, fees and
          timing. There is no account wallet.
        </p>
        <SellerPayouts id={id} admin={admin} owner={owner} />
      </section>
    );
  if (
    view === "all" &&
    !admin &&
    !resource.loading &&
    !resource.error &&
    resource.data?.offers.length === 0
  )
    return (
      <section aria-label="Seller agreements">
        <p>
          No commercial offer yet. Review approval alone does not create a
          payout.
        </p>
        <details>
          <summary>Agreement and payout history</summary>
          <Action onClick={resource.reload}>Refresh seller agreements</Action>
          <SellerPayouts id={id} admin={admin} owner={owner} />
        </details>
      </section>
    );
  return (
    <section aria-label="Seller agreements">
      <h2>
        {view === "handover" ? "Secure account handover" : "Seller agreements"}
      </h2>
      {view === "handover" && (
        <p>
          Only an accepted agreement allows protected ownership transfer. Login
          and recovery details belong only in the protected field.
        </p>
      )}
      {view !== "all" &&
        current?.offers.some((offer) => offer.state === "accepted") && (
          <p>
            <Link
              to="?section=payout"
              state={location.state}
              preventScrollReset
            >
              Track this agreement’s direct payout
            </Link>
            {view === "agreement" && (
              <>
                {" "}
                ·{" "}
                <Link
                  to="?section=handover"
                  state={location.state}
                  preventScrollReset
                >
                  Continue to secure handover
                </Link>
              </>
            )}
          </p>
        )}
      <Action disabled={resource.loading} onClick={resource.reload}>
        Refresh seller agreements
      </Action>
      {resource.loading && <p role="status">Checking seller agreements…</p>}
      <ErrorNotice error={resource.error} />
      {current && (
        <fieldset
          hidden={!!resource.error}
          disabled={resource.loading || !!resource.error}
        >
          {view === "handover" &&
            !current.offers.some((offer) => offer.state === "accepted") && (
              <p>
                No accepted agreement is ready for handover.{" "}
                <Link
                  to="?section=agreement"
                  state={location.state}
                  preventScrollReset
                >
                  Review Sale agreement
                </Link>{" "}
                for the next step.
              </p>
            )}
          {view !== "handover" && current.offers.length === 0 && (
            <p>
              No offer yet. Review approval does not set a price or create a
              payout obligation.
            </p>
          )}
          {view !== "handover" && current.offers.length > 1 && (
            <details>
              <summary>Compare offer amounts and timing</summary>
              {/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Focus permits native keyboard scrolling of this bounded comparison table. */}
              <div
                className="offer-comparison"
                role="region"
                aria-label="Seller offer comparison"
                tabIndex={0}
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Arrangement</th>
                      <th scope="col">Net payout</th>
                      <th scope="col">Network</th>
                      <th scope="col">Delay / deadline</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.offers.map((offer) => (
                      <tr key={offer.id}>
                        <td>
                          {offer.terms.model === "buy_first"
                            ? "Buy before resale"
                            : "After buyer delivery"}
                        </td>
                        <td>
                          {offer.terms.amount}{" "}
                          {offer.terms.currency.toUpperCase()}
                        </td>
                        <td>{offer.terms.network}</td>
                        <td>
                          {offer.terms.payout_delay_hours} /{" "}
                          {offer.terms.payout_deadline_hours} hours after
                          eligibility
                        </td>
                        <td>{offer.state.replaceAll("_", " ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
            </details>
          )}
          {current.offers
            .filter((offer) =>
              view === "handover"
                ? offer.state === "accepted"
                : ["offered", "accepted"].includes(offer.state),
            )
            .map((offer) => (
              <OfferRecord
                key={`${offer.id}:${String(offer.version)}`}
                offer={offer}
                view={view}
                visible={visible && !resource.loading && !resource.error}
                admin={admin}
                owner={owner}
                changed={reload}
              />
            ))}
          {view !== "handover" &&
            current.offers.some(
              (offer) => !["offered", "accepted"].includes(offer.state),
            ) && (
              <details>
                <summary>Previous offers</summary>
                {current.offers
                  .filter(
                    (offer) => !["offered", "accepted"].includes(offer.state),
                  )
                  .map((offer) => (
                    <OfferRecord
                      key={`${offer.id}:${String(offer.version)}`}
                      offer={offer}
                      admin={admin}
                      owner={owner}
                      changed={reload}
                    />
                  ))}
              </details>
            )}
          {view !== "handover" &&
            owner &&
            state === "approved_pending_terms" &&
            !current.offers.some(
              (v) => v.state === "offered" || v.state === "accepted",
            ) && <Proposal id={id} version={version} changed={reload} />}
        </fieldset>
      )}
      {view === "all" &&
        (admin ||
        resource.data?.offers.some((offer) => offer.state === "accepted") ? (
          <SellerPayouts id={id} admin={admin} owner={owner} />
        ) : (
          <details>
            <summary>Payout history</summary>
            <SellerPayouts id={id} admin={admin} owner={owner} />
          </details>
        ))}
      {admin && <Link to="/admin/accounts">Account inventory</Link>}
    </section>
  );
}
