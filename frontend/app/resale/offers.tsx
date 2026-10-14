import {
  PrepareListing,
  type useSellingProgress,
} from "../submissions/selling-progress";
import { Loading } from "../ui/loading";
import { useManualPayoutConfirmation } from "../payments/manual-payout";
import { SellerPriceInput, SellerBreakdown } from "./commission-fields";
import {
  FieldValidation,
  ValidationSummary,
  focusValidationTarget,
  issueField,
} from "../ui/form-validation";
import { SellerRoute, sellerRouteIssue, useSellerRoutes } from "./seller-route";
import { useActionValidation } from "../ui/action-validation";
import { sellerIssues } from "./validation";
import { Button } from "../ui/primitives";
import { useEffect, useRef, useState } from "react";
import { z } from "../validation";
import { Link, useLocation, type Location } from "../portal-router";
import {
  Action,
  Check,
  ErrorNotice,
  NumberInput,
  Select,
  Text,
} from "../catalog/controls";
import { APIError, post, sessionSchema } from "../identity/api";
import { useResource } from "../orders/resource";
import { TransferRecord, useRecipientConfirmation } from "../payments/refunds";
import { transfersSchema } from "../payments/cases-model";
import {
  agreementDefaultsSchema,
  offerSchema,
  offersSchema,
  secretSchema,
  type Offer,
  type SellerTerms,
} from "./model";
import { denied } from "../support/chat-state";
import { SecretReveal, SecretUpload } from "./secret";

import "./marketplace.css";
function SellerOfferError({
  error,
  hideIssues = false,
  proposal = false,
}: {
  error: unknown;
  hideIssues?: boolean;
  proposal?: boolean;
}) {
  return (
    <ErrorNotice
      error={error}
      hideIssues={hideIssues}
      message={
        error instanceof APIError && error.code === "resale_conflict"
          ? "This seller agreement or submission changed. Refresh seller agreements and review the current offer before deciding again."
          : proposal &&
              error instanceof APIError &&
              error.code === "resale_invalid" &&
              error.issues.length === 0
            ? "The seller offer was not sent. Review the payout route and commercial terms, then try again. Your entries are preserved."
            : undefined
      }
    />
  );
}
export const termFields = [
  ["proceeds_basis", "Seller proceeds basis"],
  ["fees", "Fees and deductions"],
  ["transfer_requirements", "Account handover requirements"],
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
      payout_deadline_hours: 48,
    }),
    [expires, setExpires] = useState(""),
    [key, setKey] = useState(() => crypto.randomUUID()),
    [error, setError] = useState<unknown>(null),
    [arrangementReviewed, setArrangementReviewed] = useState(true),
    [arrangementNeedsReview, setArrangementNeedsReview] = useState(false),
    [busy, setBusy] = useState(false);
  const validation = useActionValidation();
  const routes = useSellerRoutes();
  const feedback = useRef<HTMLDivElement>(null);
  const hasFieldError =
    error instanceof APIError &&
    error.issues.some((issue) =>
      issueField(issue.path, validation.validation.fields),
    );
  useEffect(() => {
    if (!busy && error && !hasFieldError)
      focusValidationTarget(feedback.current);
  }, [busy, error, hasFieldError]);
  const defaults = useResource(
    "/admin/account-agreement-defaults",
    agreementDefaultsSchema,
  );
  function edit<K extends keyof SellerTerms>(field: K, value: SellerTerms[K]) {
    setTerms((v) => ({ ...v, [field]: value }));
    setKey(crypto.randomUUID());
  }
  function changeArrangement(model: SellerTerms["model"]) {
    const previous =
      terms.model === "buy_first"
        ? defaults.data?.seller_buy_first
        : defaults.data?.seller_consignment;
    const next =
      model === "buy_first"
        ? defaults.data?.seller_buy_first
        : defaults.data?.seller_consignment;
    const unchanged =
      previous &&
      next &&
      termFields.every(
        ([field]) => sellerTerm(terms, field) === sellerTerm(previous, field),
      );
    setTerms((value) => ({
      ...value,
      model,
      ...(unchanged
        ? Object.fromEntries(
            termFields.map(([field]) => [field, sellerTerm(next, field)]),
          )
        : {}),
    }));
    const needsReview =
      !unchanged && termFields.some(([field]) => !!sellerTerm(terms, field));
    setArrangementNeedsReview(needsReview);
    setArrangementReviewed(!needsReview);
    setKey(crypto.randomUUID());
  }
  function changeRoute(currency: string, network: string) {
    if (currency === terms.currency && network === terms.network) return;
    setTerms((terms) => ({
      ...terms,
      currency,
      network,
      amount: "",
      commission: terms.commission
        ? {
            ...terms.commission,
            rate: "",
            rate_source: "",
            quoted_at: "",
            net_amount: "",
          }
        : undefined,
    }));
    setKey(crypto.randomUUID());
  }
  async function propose() {
    const issues = sellerIssues(terms, expires).filter(
      (issue) => !["terms.currency", "terms.network"].includes(issue.path),
    );
    const routeIssue = sellerRouteIssue(routes, terms);
    if (routeIssue)
      issues.unshift({ path: "terms.currency", message: routeIssue });
    if (!arrangementReviewed)
      issues.unshift({
        path: "arrangement_reviewed",
        message:
          "Review the edited wording for this arrangement, or apply its approved terms.",
      });
    if (busy || !validation.check(issues)) return;
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
          Choose the arrangement per offer. Enter the account base price and a
          real conversion quote. Review the resulting net crypto obligation and
          commercial terms. The seller must explicitly accept; acceptance does
          not itself move funds.
        </p>
        <ValidationSummary
          issues={validation.validation.issues}
          fields={validation.validation.fields}
        />
        <Select
          name="terms.model"
          label="Seller payment arrangement"
          value={terms.model}
          change={(v) => {
            changeArrangement(v === "buy_first" ? "buy_first" : "consignment");
          }}
          options={[
            ["consignment", "Pay after buyer delivery and initial inspection"],
            ["buy_first", "Pay seller before publishing for resale"],
          ]}
        />
        <SellerRoute resource={routes} terms={terms} change={changeRoute} />
        <SellerPriceInput
          key={`${terms.currency}/${terms.network}`}
          price={terms.commission}
          asset={terms.currency}
          change={(commission) => {
            setTerms((v) => ({
              ...v,
              commission,
              amount: commission.net_amount,
            }));
            setKey(crypto.randomUUID());
          }}
        />
        <Action
          disabled={!defaults.data || !!defaults.error}
          onClick={() => {
            if (!defaults.data) return;
            const standard =
              terms.model === "buy_first"
                ? defaults.data.seller_buy_first
                : defaults.data.seller_consignment;
            setTerms((v) => ({
              ...standard,
              currency: v.currency,
              network: v.network,
              commission: v.commission,
              amount: v.amount,
            }));
            setArrangementReviewed(true);
            setArrangementNeedsReview(false);
            const until = new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000 - 60000,
            );
            until.setMinutes(until.getMinutes() - until.getTimezoneOffset());
            setExpires(until.toISOString().slice(0, 16));
            setKey(crypto.randomUUID());
          }}
        >
          Use approved{" "}
          {terms.model === "buy_first" ? "buy-first" : "consignment"} terms
        </Action>
        <ErrorNotice error={defaults.error} />
        {arrangementNeedsReview && (
          <Check
            name="arrangement_reviewed"
            label="I reviewed the custom wording for the selected payment arrangement"
            value={arrangementReviewed}
            change={setArrangementReviewed}
          />
        )}
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
          label="Payout initiation target (hours after eligibility)"
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
        <p>
          Before offering, confirm the payout route’s current minimum, funding
          and sender-paid network fees. The seller must receive the full
          accepted crypto amount.
        </p>
        <div ref={feedback} tabIndex={-1}>
          <SellerOfferError error={error} hideIssues proposal />
        </div>
        <Action
          disabled={
            busy ||
            routes.loading ||
            !!routes.error ||
            !routes.data?.published?.data.routes.length
          }
          onClick={() => void propose()}
        >
          Propose exact seller terms
        </Action>
      </fieldset>
    </FieldValidation>
  );
}
function SellerBundle({ id, changed }: { id: string; changed: () => void }) {
  const resource = useResource(`/seller-offers/${id}/secret`, secretSchema);
  return (
    <>
      <ErrorNotice error={resource.error} />
      {resource.data && (
        <SecretUpload
          path={`/seller-offers/${id}/secret`}
          version={resource.data.version}
          changed={() => {
            resource.reload();
            changed();
          }}
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
  progress,
  offer,
  admin,
  owner,
  changed,
  view = "all",
  visible = true,
}: {
  progress?: ReturnType<typeof useSellingProgress> | undefined;
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
    [history, setHistory] = useState(false);
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
  return (
    <article className="catalog-section seller-offer">
      <h3>
        {offer.terms.model === "buy_first"
          ? "Buy before resale"
          : "Consignment after buyer delivery"}
      </h3>
      <p role="status">Offer: {offer.state}</p>
      {view !== "handover" && (
        <p className="seller-next-step">
          {offer.state === "offered"
            ? expired
              ? "This offer has expired. Ask the team for updated terms before accepting."
              : "Review the exact amount, fees and timing below before making your decision."
            : offer.state === "accepted"
              ? "Agreement accepted. Follow Overview for the current next step and publication status."
              : "This offer is no longer open for acceptance. Its terms remain available for your records."}
        </p>
      )}
      {view !== "handover" && (
        <>
          <p className="package-price">
            {offer.terms.amount} {offer.terms.currency.toUpperCase()} ·{" "}
            {offer.terms.network}
          </p>
          {offer.terms.commission && (
            <SellerBreakdown
              price={offer.terms.commission}
              asset={offer.terms.currency}
            />
          )}
          <details open={offer.state === "offered" ? true : undefined}>
            <summary>
              {offer.state === "accepted"
                ? "Read the accepted terms"
                : "Read proposal terms"}
            </summary>
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
          </details>
          <p>
            Extra payout delay {offer.terms.payout_delay_hours} hours;
            initiation target {offer.terms.payout_deadline_hours} hours after{" "}
            {offer.terms.model === "buy_first"
              ? offer.control_verified_at
                ? "the previously recorded handover milestone"
                : "receipt of secure account details and satisfaction of the accepted payout conditions"
              : "buyer acknowledgement and the initial inspection period"}
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
      <SellerOfferError error={error} />
      {view !== "handover" &&
        offer.state === "offered" &&
        (!admin || owner) && (
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
            {
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
            }
          </fieldset>
        )}
      {offer.state === "accepted" && view !== "agreement" && (
        <>
          {progress?.error ? (
            <>
              <ErrorNotice error={progress.error} />
              <Action onClick={progress.reload}>Retry handover status</Action>
            </>
          ) : !progress?.data ? (
            <Loading compact label="Loading secure handover status" />
          ) : (
            <>
              <p role="status">
                {progress.data.handover.state === "received"
                  ? "Secure account details received."
                  : progress.data.handover.state === "expired"
                    ? "The protected details expired. Share current details again before publication."
                    : progress.data.handover.state === "refresh_required"
                      ? "This account was returned from a previous sale. Share updated account details before relisting."
                      : admin
                        ? "Waiting for the seller to share account access securely."
                        : "Share the account access included in your agreement using the protected field below."}
              </p>
              {progress.data.handover.locked && (
                <p>
                  These details are locked while the listing or payout is
                  active. Contact the team if access changes.
                </p>
              )}
              {visible &&
                !admin &&
                !progress.data.handover.locked &&
                (progress.data.handover.state === "received" ? (
                  <details>
                    <summary>Update shared account details</summary>
                    <SellerBundle id={offer.id} changed={changed} />
                  </details>
                ) : (
                  <SellerBundle id={offer.id} changed={changed} />
                ))}
              {visible &&
                owner &&
                progress.data.handover.state === "received" && (
                  <SecretReveal
                    path={`/admin/seller-offers/${offer.id}/secret/reveal`}
                  />
                )}
              {admin && !owner && (
                <p>Only the owner can reveal protected account details.</p>
              )}
              {admin &&
                (progress.data.listing_id ? (
                  <Link
                    className="button compact"
                    to={`/admin/accounts/${progress.data.listing_id}?section=details`}
                    state={{
                      submissionID: offer.submission_id,
                      submissionSection: "handover",
                    }}
                  >
                    Continue listing
                  </Link>
                ) : (
                  <PrepareListing
                    offerID={offer.id}
                    submissionID={offer.submission_id}
                  />
                ))}
            </>
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
  const manualConfirmation = useManualPayoutConfirmation(
    `payout:${admin ? "admin" : "customer"}:${id}`,
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
      {manualConfirmation.feedback}
      {resource.data?.transfers.map((row) => (
        <TransferRecord
          key={`${row.id}:${String(row.version)}`}
          record={row}
          admin={admin}
          owner={owner}
          reload={resource.reload}
          refreshing={resource.loading}
          onRecipientSaved={confirmation.recipientSaved}
          onManualSaved={manualConfirmation.manualSaved}
          {...manualConfirmation.controls(row.id)}
        />
      ))}
      {resource.data?.transfers.length === 0 && (
        <p>No seller payout obligation is recorded yet.</p>
      )}
    </section>
  );
}
export default function SellerOffers({
  progress,
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
  progress?: ReturnType<typeof useSellingProgress> | undefined;
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
      {resource.loading && (
        <Loading compact label="Loading seller agreements" />
      )}
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
                progress={progress}
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
                      progress={progress}
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
