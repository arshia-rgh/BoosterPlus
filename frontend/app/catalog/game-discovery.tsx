import { isPlaceholderGame } from "./placeholder";
import type { ReactNode } from "react";
import { Link } from "../portal-router";
import { useResource } from "../orders/resource";
import { minorDisplay } from "./dynamic-form";
import type { Release } from "./model";
import {
  discoveryViewSchema,
  type ServiceKind,
  serviceNames,
  serviceLabel,
} from "./public-discovery";
import PublicMetrics, { publicTime, useEvidenceClock } from "./public-metrics";

type GameDiscoveryProps = {
  release: Release;
  selected: ServiceKind | null;
  action?: ReactNode;
  children?: ReactNode;
};

export function GameDiscovery(props: GameDiscoveryProps) {
  if (isPlaceholderGame(props.release)) {
    return (
      <div className="game-post-statistics">
        {props.selected && (
          <Link
            className="context-back service-return"
            to={`/games/${props.release.slug}`}
          >
            ← Back to game
          </Link>
        )}
        {props.children}
      </div>
    );
  }
  return <AvailableGameDiscovery {...props} />;
}

function AvailableGameDiscovery({
  release,
  selected,
  action,
  children,
}: GameDiscoveryProps) {
  const resource = useResource(
    `/catalog/games/${encodeURIComponent(release.slug)}/discovery`,
    discoveryViewSchema,
  );
  // The shell and offers must describe the same immutable release.
  const data = resource.data?.release_id === release.id ? resource.data : null;
  const now = useEvidenceClock(
    data?.promotions.map((item) => item.ends_at) ?? [],
  );
  const offers =
    data?.promotions.filter(
      (item) =>
        (!selected || item.service === selected) &&
        Date.parse(item.starts_at) <= now &&
        Date.parse(item.ends_at) > now,
    ) ?? [];
  return (
    <>
      <div className="game-discovery">
        <PublicMetrics
          metrics={data?.metrics ?? []}
          loading={resource.loading}
          failed={!!resource.error || (!!resource.data && !data)}
          retry={resource.reload}
        />
      </div>
      <div className="game-post-statistics">
        {action}
        <div className="game-discovery">
          {selected && (
            <Link
              preventScrollReset
              className="context-back service-return"
              to={`/games/${release.slug}`}
            >
              ← Back to choose a service
            </Link>
          )}
          {resource.loading && (
            <p className="quiet" role="status">
              Checking featured offers…
            </p>
          )}
          {!resource.loading &&
            (!!resource.error || (!!resource.data && !data)) && (
              <p className="quiet">
                Featured offers are temporarily unavailable. Refresh activity to
                check again.
              </p>
            )}
          {offers.length > 0 && (
            <section
              className="featured-offers"
              aria-labelledby="featured-offers-title"
            >
              <p className="eyebrow">WORTH A LOOK</p>
              <h2 id="featured-offers-title">
                {selected
                  ? `${serviceLabel(selected)} highlights`
                  : "Featured for your game"}
              </h2>
              <div className="featured-offer-grid">
                {offers.map((offer) => {
                  const query = new URLSearchParams();
                  if (offer.variant) query.set("variant", offer.variant);
                  if (offer.quantity)
                    query.set("quantity", String(offer.quantity));
                  if (offer.coupon_code) query.set("coupon", offer.coupon_code);
                  const target =
                    offer.target === "package"
                      ? `/games/${release.slug}/packages/${encodeURIComponent(offer.package ?? "")}?${query.toString()}`
                      : offer.target === "news"
                        ? `/games/${release.slug}/news/${encodeURIComponent(offer.article_slug ?? "")}`
                        : offer.target === "shop"
                          ? `/games/${release.slug}/shop/${encodeURIComponent(offer.product_id ?? "")}?${query.toString()}`
                          : `/games/${release.slug}/accounts/${encodeURIComponent(offer.listing_id ?? "")}`;
                  return (
                    <article className="featured-offer" key={offer.key}>
                      <span className="status">
                        {serviceNames[offer.service]} ·{" "}
                        {offer.target === "news"
                          ? "Featured reading"
                          : "Limited offer"}
                      </span>
                      <h3>{offer.title}</h3>
                      <p>{offer.description}</p>
                      {offer.target !== "news" && (
                        <p className="featured-price">
                          {offer.original_minor && (
                            <del>
                              {offer.currency}{" "}
                              {minorDisplay(offer.original_minor)}
                            </del>
                          )}{" "}
                          {offer.currency} {minorDisplay(offer.amount_minor)}
                        </p>
                      )}
                      {offer.target === "shop" && (
                        <p>
                          For {offer.quantity} item
                          {offer.quantity === 1 ? "" : "s"} · Staff delivery
                        </p>
                      )}
                      <p className="quiet">
                        {offer.target === "news" ? "Featured until" : "Ends"}{" "}
                        {publicTime(offer.ends_at)}
                        {offer.remaining != null
                          ? ` · ${String(offer.remaining)} available at last check`
                          : ""}
                      </p>
                      {offer.coupon_code && (
                        <p>
                          Use code <strong>{offer.coupon_code}</strong>.
                          Eligibility is checked before ordering.
                        </p>
                      )}
                      {offer.target !== "news" && (
                        <p className="quiet">
                          Availability and final price are checked when you
                          continue. This does not reserve an offer.
                        </p>
                      )}
                      <Link
                        preventScrollReset
                        className="button compact"
                        to={target}
                      >
                        {offer.target === "news" ? "Read" : "Review"}{" "}
                        {offer.target === "news"
                          ? "article"
                          : offer.target === "shop"
                            ? "shop item"
                            : offer.target === "package"
                              ? "package"
                              : "account"}
                      </Link>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>
        {children}
      </div>
    </>
  );
}
