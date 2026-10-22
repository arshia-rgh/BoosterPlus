import type { PriceReview } from "./model";

// Automatic supplier price check formatting. Amounts are never rounded: supplier
// totals keep every supplied decimal and our prices are exact cents.
function exactDecimal(value: string): boolean {
  const [whole = "", fraction, extra] = value.split(".");
  return (
    extra === undefined &&
    /^[0-9]{1,12}$/.test(whole) &&
    (whole === "0" || !whole.startsWith("0")) &&
    (fraction === undefined || /^[0-9]{1,18}$/.test(fraction))
  );
}

export function usdCents(minor: string): string {
  if (!/^[0-9]{1,12}$/.test(minor)) return "Not available";
  const n = BigInt(minor);
  return `USD ${String(n / 100n)}.${String(n % 100n).padStart(2, "0")}`;
}

export function usdDecimal(value: string): string {
  if (!exactDecimal(value)) return "Not available";
  const [whole, fraction = ""] = value.split(".");
  return `USD ${whole ?? "0"}.${fraction.padEnd(2, "0")}`;
}

// Exact comparison: our cents against the supplier's exact decimal total.
export function belowCost(sellingMinor: string, supplierTotal: string) {
  if (!/^[0-9]{1,12}$/.test(sellingMinor) || !exactDecimal(supplierTotal))
    return false;
  const [whole = "0", fraction = ""] = supplierTotal.split(".");
  const digits = Math.max(fraction.length, 2);
  const supplier =
    BigInt(whole) * 10n ** BigInt(digits) +
    BigInt(fraction.padEnd(digits, "0"));
  const ours = BigInt(sellingMinor) * 10n ** BigInt(digits - 2);
  return ours < supplier;
}

export function intervalLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60),
    rest = minutes % 60;
  const hourText = hours === 1 ? "1 hour" : `${String(hours)} hours`;
  const minuteText = rest === 1 ? "1 minute" : `${String(rest)} minutes`;
  if (hours === 0) return minuteText;
  if (rest === 0) return hourText;
  // "90 minutes" reads more naturally than "1 hour 30 minutes".
  if (minutes < 120) return `${String(minutes)} minutes`;
  return `${hourText} ${minuteText}`;
}

export function shortTime(iso: string, now = new Date()): string {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "";
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  if (value.getFullYear() !== now.getFullYear()) options.year = "numeric";
  return new Intl.DateTimeFormat("en-GB", options).format(value);
}

export function shortDate(iso: string, now = new Date()): string {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "";
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
  };
  if (value.getFullYear() !== now.getFullYear()) options.year = "numeric";
  return new Intl.DateTimeFormat("en-GB", options).format(value);
}

export function clockTime(iso: string): string {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

type Tone = "warning" | "danger" | "neutral";
export function priceBadge(
  status: PriceReview["status"],
): { label: string; tone: Tone } | null {
  switch (status) {
    case "override_changed":
      return { label: "Supplier price changed", tone: "warning" };
    case "requirements_changed":
      return { label: "Delivery changed", tone: "danger" };
    case "needs_refresh":
      return { label: "Needs refresh", tone: "warning" };
    case "unavailable":
      return { label: "Supplier offer unavailable", tone: "warning" };
    case "check_failed":
      return { label: "Price check failed", tone: "neutral" };
    default:
      return null;
  }
}

export function alertBody(review: PriceReview): string {
  switch (review.status) {
    case "override_changed":
      return "Your fixed price was not changed.";
    case "requirements_changed":
      return "The supplier changed the details customers must provide. This product can't be sold until you refresh it from the supplier catalog and publish it again.";
    case "needs_refresh":
      return "The new supplier price couldn't be applied because this product no longer meets current publication rules. Refresh it from the supplier catalog and publish it again.";
    case "unavailable":
      return `The supplier didn't list this offer in the last ${String(review.failures)} checks. Your price was not changed.`;
    case "check_failed":
      return `The last ${String(review.failures)} checks couldn't read this offer. Your price was not changed.`;
    default:
      return "";
  }
}

const severity: PriceReview["status"][] = [
  "requirements_changed",
  "needs_refresh",
  "override_changed",
  "unavailable",
  "check_failed",
];
export function bySeverity(items: PriceReview[]): PriceReview[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        severity.indexOf(a.item.status) - severity.indexOf(b.item.status) ||
        a.index - b.index,
    )
    .map(({ item }) => item);
}

export function showAmounts(review: PriceReview): boolean {
  return (
    review.status === "override_changed" ||
    (review.status === "needs_refresh" &&
      !!review.baseline_total &&
      !!review.supplier_total &&
      review.baseline_total !== review.supplier_total)
  );
}

export function costLabel(quantity: string): string {
  return quantity === "1" || quantity === ""
    ? "Supplier cost"
    : `Supplier cost for ${quantity} units`;
}

export function supplierLink(review: PriceReview): string {
  return review.supplier_product_id
    ? `/admin/shop/suppliers?${new URLSearchParams({ q: review.supplier_product_id }).toString()}`
    : "/admin/shop/suppliers";
}
