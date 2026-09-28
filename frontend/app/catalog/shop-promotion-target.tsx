import { useState } from "react";
import { Action, ErrorNotice, Select } from "./controls";
import type { Promotion } from "./discovery-model";
import { minorDisplay } from "./dynamic-form";
import { useResource } from "../orders/resource";
import { publicPageSchema, publicProductSchema } from "../shop/model";

export default function ShopPromotionTarget({
  slug,
  value,
  change,
}: {
  slug: string;
  value: Promotion;
  change: (patch: Partial<Promotion>) => void;
}) {
  const [after, setAfter] = useState("");
  const resource = useResource(
    `/games/${encodeURIComponent(slug)}/shop?after=${encodeURIComponent(after)}`,
    publicPageSchema,
  );
  const items = resource.data?.items ?? [];
  return (
    <>
      <p>
        Publish the game’s Shop service and product first. Featured offers use
        the current published price for the minimum quantity. Editing a product
        release requires reviewing its offer again. Coupon discounts are
        unavailable for shop purchases.
      </p>
      <ErrorNotice error={resource.error} />
      {resource.loading && (
        <p role="status">Loading published shop products…</p>
      )}
      <fieldset
        disabled={resource.loading || !!resource.error}
        className="catalog-item"
      >
        <legend>Reviewed shop selection</legend>
        <Select
          label="Published shop product"
          value={value.product_id ?? ""}
          options={[
            ["", "Choose a published product"],
            ...(value.product_id &&
            !items.some((item) => item.id === value.product_id)
              ? [
                  [
                    value.product_id,
                    "Selected product — details below",
                  ] as const,
                ]
              : []),
            ...items.map((item) => [item.id, item.definition.title] as const),
          ]}
          change={(id) => {
            const item = items.find((candidate) => candidate.id === id);
            if (item)
              change({
                product_id: item.id,
                release_id: item.release_id,
                variant: "",
              });
          }}
        />
      </fieldset>
      {!!value.product_id && (
        <SelectedProduct
          key={value.product_id}
          slug={slug}
          value={value}
          change={change}
        />
      )}
      {resource.data && items.length === 0 && (
        <p>No published shop products on this page.</p>
      )}
      <div className="catalog-actions">
        {after && (
          <Action
            onClick={() => {
              setAfter("");
            }}
          >
            First products
          </Action>
        )}
        {resource.data?.next && (
          <Action
            disabled={resource.loading}
            onClick={() => {
              setAfter(resource.data?.next ?? "");
            }}
          >
            More products
          </Action>
        )}
        {!!resource.error && (
          <Action disabled={resource.loading} onClick={resource.reload}>
            Retry shop products
          </Action>
        )}
      </div>
    </>
  );
}

function SelectedProduct({
  slug,
  value,
  change,
}: {
  slug: string;
  value: Promotion;
  change: (patch: Partial<Promotion>) => void;
}) {
  const current = useResource(
    `/games/${encodeURIComponent(slug)}/shop/${encodeURIComponent(value.product_id ?? "")}`,
    publicProductSchema,
  );
  const product = current.data;
  const revised = !!product && product.release_id !== value.release_id;
  const selected = product?.definition.variants.find(
    (v) => v.key === value.variant && v.enabled,
  );
  const total =
    selected &&
    /^[1-9][0-9]{0,11}$/.test(selected.unit_amount_minor) &&
    selected.min_quantity >= 1 &&
    selected.min_quantity <= 100
      ? (
          BigInt(selected.unit_amount_minor) * BigInt(selected.min_quantity)
        ).toString()
      : null;
  return (
    <section className="catalog-section" aria-label="Selected shop product">
      {current.loading && <p role="status">Checking selected product…</p>}
      <ErrorNotice error={current.error} />
      {!!current.error && (
        <p>
          The selected product cannot currently be verified. Its saved offer
          stays in your draft. Retry or choose another published product above;
          publication rechecks availability.
        </p>
      )}
      <Action disabled={current.loading} onClick={current.reload}>
        Refresh selected product
      </Action>
      {product && (
        <>
          <h4>{product.definition.title}</h4>
          <p>
            Published revision {product.version}. This named selection stays
            visible when browsing other product pages.
          </p>
          {revised && (
            <section role="alert">
              <p>
                The product has a newer publication. Your offer still references
                the earlier revision and will not appear publicly. Review the
                current price and terms before replacing that selection.
              </p>
              <Action
                disabled={current.loading || !!current.error}
                onClick={() => {
                  change({ release_id: product.release_id, variant: "" });
                }}
              >
                Use current published revision
              </Action>
            </section>
          )}
          <fieldset
            disabled={current.loading || !!current.error || revised}
            className="catalog-item"
          >
            <legend>Featured shop variant</legend>
            <Select
              label="Shop variant"
              value={value.variant}
              options={[
                ["", "Choose a variant"],
                ...product.definition.variants
                  .filter((v) => v.enabled)
                  .map(
                    (v) =>
                      [
                        v.key,
                        `${v.label} · ${v.region} · ${v.platform} · ${v.server} · ${String(v.min_quantity)} × ${v.currency} ${minorDisplay(v.unit_amount_minor)}`,
                      ] as const,
                  ),
              ]}
              change={(variant) => {
                change({ variant });
              }}
            />
          </fieldset>
          {selected && (
            <section aria-label="Selected variant details">
              <h4>
                {revised ? "Current published variant" : "Selected variant"}:{" "}
                {selected.label}
              </h4>
              <dl>
                <dt>Region</dt>
                <dd>{selected.region}</dd>
                <dt>Platform</dt>
                <dd>{selected.platform}</dd>
                <dt>Server</dt>
                <dd>{selected.server}</dd>
                <dt>Minimum purchase</dt>
                <dd>
                  {selected.min_quantity} × {selected.currency}{" "}
                  {minorDisplay(selected.unit_amount_minor)}
                </dd>
                <dt>Featured total</dt>
                <dd>
                  {total
                    ? `${selected.currency} ${minorDisplay(total)}`
                    : "Unavailable — review this variant"}
                </dd>
              </dl>
            </section>
          )}
        </>
      )}
    </section>
  );
}
