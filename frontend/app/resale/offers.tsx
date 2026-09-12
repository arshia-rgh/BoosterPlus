import { useState } from "react";
import { z } from "../validation";
import { Link, useNavigate } from "react-router";
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
import { TransferRecord } from "../payments/refunds";
import { transfersSchema } from "../payments/cases-model";
import {
  listingSchema,
  offerSchema,
  offersSchema,
  secretSchema,
  type Offer,
  type SellerTerms,
} from "./model";
import { SecretReveal, SecretUpload } from "./secret";

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
  function edit<K extends keyof SellerTerms>(field: K, value: SellerTerms[K]) {
    setTerms((v) => ({ ...v, [field]: value }));
    setKey(crypto.randomUUID());
  }
  async function propose() {
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
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset disabled={busy}>
      <legend>Owner: propose seller agreement</legend>
      <p>
        Choose the arrangement per offer. Enter the exact net crypto obligation
        and all commercial terms. The seller must explicitly accept; acceptance
        does not itself move funds.
      </p>
      <ErrorNotice error={error} />
      <Select
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
        label="Seller payout asset code"
        value={terms.currency}
        change={(v) => {
          edit("currency", v);
        }}
      />
      <Text
        label="Seller payout network"
        value={terms.network}
        change={(v) => {
          edit("network", v);
        }}
      />
      <Text
        label="Exact net seller crypto amount"
        value={terms.amount}
        change={(v) => {
          edit("amount", v);
        }}
      />
      {termFields.map(([key, label]) => (
        <Text
          key={key}
          label={label}
          multiline
          value={sellerTerm(terms, key)}
          change={(v) => {
            edit(key, v);
          }}
        />
      ))}
      <NumberInput
        label="Payout delay hours after eligibility"
        value={terms.payout_delay_hours}
        change={(v) => {
          edit("payout_delay_hours", v);
        }}
      />
      <NumberInput
        label="Payout deadline hours after eligibility"
        value={terms.payout_deadline_hours}
        change={(v) => {
          edit("payout_deadline_hours", v);
        }}
      />
      <Text
        label="Seller offer expires"
        type="datetime-local"
        value={expires}
        change={(v) => {
          setExpires(v);
          setKey(crypto.randomUUID());
        }}
      />
      <Action
        disabled={
          !expires ||
          !terms.amount ||
          termFields.some(([k]) => sellerTerm(terms, k).trim().length < 20)
        }
        onClick={() => void propose()}
      >
        Propose exact seller terms
      </Action>
    </fieldset>
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
}: {
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
  async function act(action: string) {
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
      setBusy(false);
    }
  }
  async function listing() {
    setBusy(true);
    setError(null);
    try {
      const row = await post(
        `/admin/seller-offers/${offer.id}/listing`,
        {},
        listingSchema,
      );
      void navigate(`/admin/accounts/${row.id}`);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="catalog-section">
      <h3>
        {offer.terms.model === "buy_first"
          ? "Buy before resale"
          : "Consignment after buyer delivery"}
      </h3>
      <p role="status">Offer: {offer.state}</p>
      <p className="package-price">
        {offer.terms.amount} {offer.terms.currency.toUpperCase()} ·{" "}
        {offer.terms.network}
      </p>
      <dl>
        {termFields.map(([key, label]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd className="payment-policy">{sellerTerm(offer.terms, key)}</dd>
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
      <p>Offer expires: {new Date(offer.expires_at).toLocaleString()}</p>
      <ErrorNotice error={error} />
      {((offer.state === "offered" && (!admin || owner)) ||
        (offer.state === "accepted" &&
          owner &&
          !offer.control_verified_at)) && (
        <fieldset disabled={busy}>
          <legend>Commercial decision</legend>
          <Text
            label="Seller agreement decision note"
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
            <>
              {!admin && (
                <Action
                  disabled={!accept || note.trim().length < 10}
                  onClick={() => void act("accept")}
                >
                  Accept seller agreement
                </Action>
              )}
              <Action
                disabled={!accept || note.trim().length < 10}
                onClick={() => void act(admin ? "withdraw" : "decline")}
              >
                {admin
                  ? "Withdraw unaccepted offer"
                  : "Decline seller agreement"}
              </Action>
            </>
          ) : (
            <Action
              disabled={!accept || note.trim().length < 10}
              onClick={() => void act("verify_control")}
            >
              Verify ownership control
            </Action>
          )}
        </fieldset>
      )}
      {offer.state === "accepted" && (
        <>
          {!admin && !offer.control_verified_at && (
            <SellerBundle id={offer.id} />
          )}{" "}
          {owner && (
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
  return (
    <section>
      <h3>Direct seller payouts</h3>
      <Action onClick={resource.reload}>Refresh seller payouts</Action>
      <ErrorNotice error={resource.error} />
      {resource.data?.transfers.map((row) => (
        <TransferRecord
          key={`${row.id}:${String(row.version)}`}
          record={row}
          admin={admin}
          owner={owner}
          reload={resource.reload}
          refreshing={resource.loading}
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
}: {
  id: string;
  version: number;
  state: string;
  admin: boolean;
  changed: () => void;
}) {
  const resource = useResource(
      `${admin ? "/admin" : ""}/submissions/${id}/offers`,
      offersSchema,
    ),
    session = useResource("/auth/session", sessionSchema),
    owner = admin && session.data?.user?.role === "owner";
  const reload = () => {
    resource.reload();
    changed();
  };
  return (
    <section aria-label="Seller agreements">
      <h2>Seller agreements</h2>
      <Action onClick={resource.reload}>Refresh seller agreements</Action>
      <ErrorNotice error={resource.error} />
      {resource.data && !resource.error && (
        <fieldset disabled={resource.loading}>
          {resource.data.offers.map((offer) => (
            <OfferRecord
              key={`${offer.id}:${String(offer.version)}`}
              offer={offer}
              admin={admin}
              owner={owner}
              changed={reload}
            />
          ))}
          {owner &&
            state === "approved_pending_terms" &&
            !resource.data.offers.some(
              (v) => v.state === "offered" || v.state === "accepted",
            ) && <Proposal id={id} version={version} changed={reload} />}
        </fieldset>
      )}
      <SellerPayouts id={id} admin={admin} owner={owner} />
      {admin && <Link to="/admin/accounts">Account inventory</Link>}
    </section>
  );
}
