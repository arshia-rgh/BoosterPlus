import type { Package } from "./model";
import { minorDisplay } from "./dynamic-form";

/** Summarize selectable published options without inventing one fixed price. */
export function PackageTilePrice({ pack }: { pack: Package }) {
  const ready = pack.variants.filter(
    (v) => v.preset_answers !== undefined && v.capacity !== 0,
  );
  const prices = new Map<string, { low: bigint; high: bigint }>();
  for (const v of ready.length ? ready : pack.variants) {
    if (!/^[1-9][0-9]{0,11}$/.test(v.amount_minor)) continue;
    const value = BigInt(v.amount_minor);
    const prior = prices.get(v.currency);
    prices.set(v.currency, {
      low: prior && prior.low < value ? prior.low : value,
      high: prior && prior.high > value ? prior.high : value,
    });
  }
  const deliveries = new Set(
    ready.map(
      (v) =>
        `Estimated ${String(v.delivery_min_hours)}–${String(v.delivery_max_hours)}h`,
    ),
  );
  return (
    <>
      <div className="package-tile-prices">
        {!prices.size && <strong>Price awaiting review</strong>}
        {[...prices].map(([currency, { low, high }]) => (
          <strong key={currency}>
            {currency} {minorDisplay(low.toString())}
            {low !== high && <> – {minorDisplay(high.toString())}</>}
          </strong>
        ))}
      </div>
      {ready.length > 0 && (
        <p className="immersive-meta">
          {deliveries.size === 1
            ? [...deliveries][0]
            : "Delivery varies by option"}
        </p>
      )}
      {ready.length !== 1 && (
        <p className="immersive-meta">
          {!ready.length
            ? pack.variants.some((v) => v.preset_answers !== undefined)
              ? "Currently unavailable"
              : "Being reviewed"
            : `${String(ready.length)} available options`}
        </p>
      )}
    </>
  );
}
