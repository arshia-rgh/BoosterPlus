import { price } from "../catalog/model";
import type { Definition } from "./model";
export function ProductPreview({ value }: { value: Definition }) {
  return (
    <article className="shop-preview" aria-label="Private customer preview">
      <p className="eyebrow">Staff preview · not a live offer</p>
      {/^\/catalog-assets\/[a-z0-9][a-z0-9_-]{0,79}\.(png|jpg|webp|avif|svg)$/.test(
        value.asset,
      ) && (
        <img src={value.asset} alt={value.asset_alt} width="400" height="240" />
      )}
      <h3>{value.title || "Untitled product"}</h3>
      <p>{value.description}</p>
      <p>{value.category}</p>
      <ul>
        {value.variants.map((variant) => (
          <li key={variant.key}>
            <strong>{variant.label || variant.key}</strong> ·{" "}
            {price({
              currency: variant.currency,
              amount_minor: variant.unit_amount_minor,
            })}{" "}
            per item · {variant.region} / {variant.platform} / {variant.server}{" "}
            · Quantity {variant.min_quantity}–{variant.max_quantity}
            {!variant.enabled && " · Not offered"}
          </li>
        ))}
      </ul>
      <dl>
        <dt>Estimated delivery</dt>
        <dd>
          {value.policy.delivery_min_hours}–{value.policy.delivery_max_hours}{" "}
          hours
        </dd>
        <dt>Delivery</dt>
        <dd>{value.policy.delivery_terms || "Not specified"}</dd>
        <dt>Cancellation</dt>
        <dd>{value.policy.cancellation_terms || "Not specified"}</dd>
        <dt>Refunds</dt>
        <dd>{value.policy.refund_terms || "Not specified"}</dd>
        <dt>Fees</dt>
        <dd>{value.policy.fees || "Not specified"}</dd>
      </dl>
      <p>
        Delivery information:{" "}
        {value.recipient.length
          ? value.recipient
              .map(
                (field) =>
                  field.label +
                  (field.required ? " (required)" : " (optional)"),
              )
              .join(", ")
          : "None requested"}
        .
      </p>
    </article>
  );
}
