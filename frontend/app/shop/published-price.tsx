import { minorDisplay } from "../catalog/dynamic-form";
import type { PublicProduct } from "./model";

/** Published offer totals; the accepted quote remains the checkout authority. */
export function PublishedPrice({
  product,
  detail = false,
}: {
  product: PublicProduct;
  detail?: boolean;
}) {
  const variants = product.definition.variants.filter((v) => v.enabled);
  const supplier = product.definition.supplier;
  const prices = new Map<string, { low: bigint; high: bigint }>();
  for (const v of variants) {
    // Supplier publication already prices its minimum quantity, including fractions.
    const amount =
      BigInt(v.unit_amount_minor) * (supplier ? 1n : BigInt(v.min_quantity));
    const prior = prices.get(v.currency);
    prices.set(v.currency, {
      low: prior && prior.low < amount ? prior.low : amount,
      high: prior && prior.high > amount ? prior.high : amount,
    });
  }
  if (!prices.size) return null;
  const quantities = new Set(variants.map((v) => v.min_quantity));
  const minimum = variants[0]?.min_quantity ?? 1;
  const note =
    supplier && supplier.quantity.kind !== "one"
      ? `For quantity ${supplier.quantity.min}`
      : !supplier && quantities.size === 1 && minimum > 1
        ? `For ${String(minimum)} items`
        : !supplier && quantities.size > 1
          ? "At each option’s minimum quantity"
          : [...prices.values()].some(({ low, high }) => low !== high)
            ? "By option"
            : "";
  return (
    <div className="shop-published-price" data-detail={detail}>
      {[...prices].map(([currency, { low, high }]) => (
        <strong key={currency}>
          {currency} {minorDisplay(low.toString())}
          {low !== high && <> – {minorDisplay(high.toString())}</>}
        </strong>
      ))}
      {note && <small>{note}</small>}
    </div>
  );
}
