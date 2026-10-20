import { supplierMethodNames } from "../suppliers/contracts";
import ShopArtwork from "./artwork";
import { price } from "../catalog/model";
import type { Definition } from "./model";
export function ProductPreview({ value }: { value: Definition }) {
  return (
    <article className="shop-preview" aria-label="Private customer preview">
      <p className="eyebrow">Staff preview · not a live offer</p>
      <ShopArtwork source={value.asset} alt={value.asset_alt} />
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
            {value.supplier ? (
              <>
                {" "}
                indicative total for {value.supplier.quantity.min} ·{" "}
                {variant.region} · {supplierMethodNames[value.supplier.method]}{" "}
                · Quantity {value.supplier.quantity.min}–
                {value.supplier.quantity.max === "0"
                  ? "no maximum"
                  : value.supplier.quantity.max}{" "}
                (
                {value.supplier.quantity.step === "0"
                  ? "continuous quantity"
                  : `step ${value.supplier.quantity.step}`}
                ). A fresh price is confirmed before payment.
              </>
            ) : (
              <>
                per item · {variant.region} / {variant.platform} /{" "}
                {variant.server} · Quantity {variant.min_quantity}–
                {variant.max_quantity}
              </>
            )}
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
        {(value.supplier?.fields.length ?? value.recipient.length)
          ? (value.supplier?.fields ?? value.recipient)
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
