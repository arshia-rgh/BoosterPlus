import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Action, Check, ErrorNotice, Text } from "../catalog/controls";
import { minorDisplay } from "../catalog/dynamic-form";
import { post, sessionSchema } from "../identity/api";
import { detailSchema } from "../orders/model";
import { useResource } from "../orders/resource";
import {
  publicListingSchema,
  publicListingsSchema,
  type PublicListing,
} from "./model";

export function ProductTerms({ listing }: { listing: PublicListing }) {
  const p = listing.product;
  return (
    <section className="catalog-section">
      <h2>{p.title}</h2>
      <p>
        {listing.game} · {p.region} · {p.rank}
      </p>
      <p className="package-price">
        {/^[1-9][0-9]{0,11}$/.test(p.amount_minor)
          ? `${p.currency} ${minorDisplay(p.amount_minor)}`
          : "Price awaiting review"}
      </p>
      <p className="payment-policy">{p.description}</p>
      <div className="package-grid">
        {listing.images.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`${p.title} — reviewed view ${String(i + 1)}`}
            loading="lazy"
            width={480}
            height={320}
          />
        ))}
      </div>
      <dl>
        {p.attributes.map((a) => (
          <div key={a.label}>
            <dt>{a.label}</dt>
            <dd>{a.value}</dd>
          </div>
        ))}
      </dl>
      <h3>Sale agreement</h3>
      <p className="payment-policy">{p.sale_terms}</p>
      <h3>Ownership transfer</h3>
      <p className="payment-policy">{p.transfer_requirements}</p>
      <p>
        Delivery estimate: {p.delivery_min_hours}–{p.delivery_max_hours} hours
        after verified payment.
      </p>
      <h3>Disputes and acknowledgement</h3>
      <p className="payment-policy">{p.dispute_terms}</p>
      <p>Dispute window: {p.dispute_hours} hours from delivery.</p>
      <p className="payment-policy">{p.acknowledgement_terms}</p>
    </section>
  );
}
export function AccountMarket() {
  const [search, setSearch] = useState(""),
    [region, setRegion] = useState(""),
    [rank, setRank] = useState(""),
    [query, setQuery] = useState(""),
    [after, setAfter] = useState("");
  const resource = useResource(
    `/accounts?${query}&after=${encodeURIComponent(after)}`,
    publicListingsSchema,
  );
  return (
    <main id="main" className="page catalog-page">
      <p className="eyebrow">Booster Plus marketplace</p>
      <h1>Find your next account</h1>
      <p>
        Reviewed listings with clear ownership terms, direct crypto checkout and
        protected delivery.
      </p>
      <Link to="/sell">Sell an account</Link>
      <fieldset>
        <legend>Find an account</legend>
        <Text label="Search accounts" value={search} change={setSearch} />
        <Text label="Account region" value={region} change={setRegion} />
        <Text label="Account rank" value={rank} change={setRank} />
        <Action
          onClick={() => {
            setAfter("");
            setQuery(new URLSearchParams({ search, region, rank }).toString());
          }}
        >
          Apply account filters
        </Action>
      </fieldset>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Loading available accounts…</p>}
      {resource.data && !resource.error && (
        <>
          <div className="package-grid">
            {resource.data.items.map((row) => (
              <article className="catalog-section" key={row.id}>
                <p>
                  {row.game} · {row.product.region}
                </p>
                <h2>
                  <Link to={`/accounts/${row.id}`}>{row.product.title}</Link>
                </h2>
                <p>{row.product.rank}</p>
                <p className="package-price">
                  {row.product.currency}{" "}
                  {minorDisplay(row.product.amount_minor)}
                </p>
                <Link className="button compact" to={`/accounts/${row.id}`}>
                  Review account
                </Link>
              </article>
            ))}
          </div>
          {!resource.data.items.length && (
            <p>No available accounts match these filters.</p>
          )}
          {resource.data.next && (
            <Action
              onClick={() => {
                setAfter(resource.data?.next ?? "");
              }}
            >
              More accounts
            </Action>
          )}
        </>
      )}
      {after && (
        <Action
          onClick={() => {
            setAfter("");
          }}
        >
          First accounts
        </Action>
      )}
    </main>
  );
}
function Purchase({ listing }: { listing: PublicListing }) {
  const session = useResource("/auth/session", sessionSchema),
    [accept, setAccept] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [key] = useState(() => crypto.randomUUID()),
    navigate = useNavigate();
  async function reserve() {
    if (!session.data) return;
    setBusy(true);
    setError(null);
    try {
      const result = await post(
        `/accounts/${listing.id}/reserve`,
        {
          request_key: key,
          release_id: listing.release_id,
          expected_amount: listing.product.amount_minor,
          currency: listing.product.currency,
          accept_terms: accept,
          terms_version: session.data.terms_version,
        },
        detailSchema,
      );
      void navigate(`/orders/${result.order.id}`);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  if (listing.state !== "published")
    return (
      <p role="status">
        This account is {listing.state}.{" "}
        <Link to="/accounts">Browse available accounts</Link>.
      </p>
    );
  return (
    <section className="catalog-section">
      <ErrorNotice error={error ?? session.error} />
      {!session.data?.user ? (
        <Link to="/login">Sign in to reserve this account</Link>
      ) : (
        <fieldset disabled={busy || session.loading}>
          <legend>Reserve this exact account</legend>
          <p>
            Payment is required before delivery. Your reservation has a limited
            checkout window; the order page shows its expiry.
          </p>
          <Link to="/terms">Read site terms</Link>
          <Check
            label="I accept this account's price, sale, transfer, dispute and acknowledgement terms and the site terms"
            value={accept}
            change={setAccept}
          />
          <Action disabled={!accept} onClick={() => void reserve()}>
            Reserve and continue to payment
          </Action>
        </fieldset>
      )}
    </section>
  );
}
export function AccountProduct() {
  const { id = "" } = useParams(),
    resource = useResource(
      `/accounts/${encodeURIComponent(id)}`,
      publicListingSchema,
    );
  return (
    <main id="main" className="page catalog-page">
      <Link to="/accounts">← Account marketplace</Link>
      <h1>Account details</h1>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Loading account…</p>}
      {resource.data && !resource.error && (
        <>
          <ProductTerms listing={resource.data} />
          <Purchase key={resource.data.release_id} listing={resource.data} />
        </>
      )}
    </main>
  );
}
