import { useId, type ReactNode } from "react";
import { Link } from "../portal-router";
import { minorDisplay } from "../catalog/dynamic-form";
import { BuyerBreakdown } from "./commission-fields";
import AccountGallery, {
  AccountImage,
  AccountImagePlaceholder,
} from "./gallery";
import type { PublicListing } from "./model";
import "./account-presentation.css";
import {
  accountCount,
  isCountAttribute,
  supersededCount,
} from "./account-summary";

export function AccountFacts({ listing }: { listing: PublicListing }) {
  return (
    <dl className="account-key-facts">
      <div>
        <dt>Rank</dt>
        <dd>{listing.product.rank || "Not specified"}</dd>
      </div>
      <div>
        <dt>Region</dt>
        <dd>{listing.product.region || "Not specified"}</dd>
      </div>
      <div>
        <dt>Heroes</dt>
        <dd>{accountCount(listing.product, "heroes") ?? "Not specified"}</dd>
      </div>
      <div>
        <dt>Skins</dt>
        <dd>{accountCount(listing.product, "skins") ?? "Not specified"}</dd>
      </div>
    </dl>
  );
}

export function AccountPrice({ listing }: { listing: PublicListing }) {
  const p = listing.product;
  return (
    <div className="account-total">
      <span>Total price</span>
      <strong>
        {/^[1-9][0-9]{0,11}$/.test(p.amount_minor)
          ? `${p.currency} ${minorDisplay(p.amount_minor)}`
          : "Price awaiting review"}
      </strong>
      {p.commission && <small>Includes 5% buyer commission</small>}
    </div>
  );
}

/** One presentation for the marketplace and the private staff card preview. */
export function AccountCard({
  listing,
  heading: Heading = "h3",
  market,
  globalMarket,
  preview = false,
  previewImage,
}: {
  listing: PublicListing;
  heading?: "h2" | "h3" | "h4";
  market?: string;
  globalMarket?: boolean;
  preview?: boolean;
  previewImage?: string | undefined;
}) {
  const titleID = useId();
  const image = preview ? previewImage : listing.images[0];
  return (
    <article className="account-card" aria-labelledby={titleID}>
      <div className="account-card-media">
        {image ? (
          <AccountImage
            key={image}
            src={image}
            title={`${listing.product.title} — ${preview ? "title image" : "listing preview"}`}
          />
        ) : (
          <AccountImagePlaceholder
            game={listing.game}
            message={
              preview && listing.product.media_ids.length
                ? "Preview image not loaded"
                : "No account screenshot"
            }
          />
        )}
      </div>
      <div className="account-card-body">
        <p className="account-game-label">{listing.game}</p>
        <Heading id={titleID}>{listing.product.title}</Heading>
        <AccountFacts listing={listing} />
        <div className="account-selling-point">
          <span>Why choose this account?</span>
          <p>
            {listing.product.selling_point || "Selling point not provided yet."}
          </p>
        </div>
        {!!listing.product.attributes
          .filter((a) => !isCountAttribute(a.label))
          .slice(0, 2).length && (
          <dl className="account-card-highlights">
            {listing.product.attributes
              .filter((a) => !isCountAttribute(a.label))
              .slice(0, 2)
              .map((a) => (
                <div key={a.label}>
                  <dt>{a.label}</dt>
                  <dd>{a.value}</dd>
                </div>
              ))}
          </dl>
        )}
        <div className="account-card-footer">
          <AccountPrice listing={listing} />
          {preview ? (
            <span className="account-preview-label">
              Account card preview · private
            </span>
          ) : (
            <Link
              className="button compact"
              preventScrollReset
              to={`/games/${encodeURIComponent(listing.slug)}/accounts/${listing.id}`}
              state={{ market, globalMarket }}
              aria-describedby={titleID}
            >
              Review account <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function AccountDescription({ listing }: { listing: PublicListing }) {
  const attributes = listing.product.attributes.filter(
    (a) => !supersededCount(listing.product, a.label),
  );
  return (
    <section className="account-description" aria-label="About this account">
      <h3>About this account</h3>
      {listing.product.selling_point && (
        <div className="account-selling-point">
          <span>Why choose this account?</span>
          <p>{listing.product.selling_point}</p>
        </div>
      )}
      <p className="payment-policy">{listing.product.description}</p>
      {listing.product.skin_collection && (
        <section
          className="account-skin-collection"
          aria-label="Skin collection"
        >
          <h4>Skin collection</h4>
          {listing.product.skin_collection.groups.length === 0 ? (
            <p>This account has no skins.</p>
          ) : (
            listing.product.skin_collection.groups.map((g) => (
              <details key={g.category}>
                <summary>
                  {g.category}{" "}
                  <span>
                    · {g.count} {g.count === "1" ? "skin" : "skins"}
                  </span>
                </summary>
                <ul>
                  {g.names.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </details>
            ))
          )}
        </section>
      )}
      {!!attributes.length && (
        <dl className="account-detail-facts">
          {attributes.map((a) => (
            <div key={a.label}>
              <dt>{a.label}</dt>
              <dd>{a.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/** Complete published/accepted terms; disclosures change presentation, never content. */
export function AccountConditions({ listing }: { listing: PublicListing }) {
  const p = listing.product;
  return (
    <section className="account-conditions" aria-label="Sale terms">
      <h3>Delivery & buyer terms</h3>
      <dl className="account-delivery-facts">
        <div>
          <dt>Estimated delivery</dt>
          <dd>
            {p.delivery_min_hours}–{p.delivery_max_hours} hours after verified
            payment
          </dd>
        </div>
        <div>
          <dt>Initial inspection</dt>
          <dd>{p.dispute_hours} hours after you acknowledge delivery</dd>
        </div>
      </dl>
      <p className="account-rights-note">
        The inspection period does not end your protected refund or support
        rights.
      </p>
      <details>
        <summary>Sale agreement</summary>
        <p className="payment-policy">{p.sale_terms}</p>
      </details>
      <details>
        <summary>Ownership transfer</summary>
        <p className="payment-policy">{p.transfer_requirements}</p>
      </details>
      <details>
        <summary>Disputes & acknowledgement</summary>
        <p className="payment-policy">{p.dispute_terms}</p>
        <p className="payment-policy">{p.acknowledgement_terms}</p>
      </details>
    </section>
  );
}

export function AccountTitle({ listing }: { listing: PublicListing }) {
  return (
    <header className="account-detail-title">
      <p className="account-game-label">{listing.game}</p>
      <h3>{listing.product.title}</h3>
    </header>
  );
}

/** Shared read-only presentation for staff preview and the accepted order record. */
export function ProductTerms({
  listing,
  gallery,
}: {
  listing: PublicListing;
  gallery?: ReactNode;
}) {
  return (
    <section className="account-detail-record">
      <AccountTitle listing={listing} />
      <div className="account-detail-layout">
        <div className="account-detail-summary">
          <AccountFacts listing={listing} />
          <AccountPrice listing={listing} />
          {listing.product.commission && (
            <BuyerBreakdown price={listing.product.commission} />
          )}
        </div>
        <div className="account-detail-media">
          {gallery ?? (
            <AccountGallery
              images={listing.images}
              title={listing.product.title}
            />
          )}
          <AccountDescription listing={listing} />
        </div>
      </div>
      <AccountConditions listing={listing} />
    </section>
  );
}
