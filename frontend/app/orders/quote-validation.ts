import { majorToMinor } from "../catalog/money-input";
import type { FieldIssue } from "../ui/form-validation";

export interface QuoteFields {
  amount_minor: string;
  currency: string;
  scope: string;
  reason: string;
  delivery_min_hours: number;
  delivery_max_hours: number;
  expiry_hours: number;
  lines: { key: string; label: string; amount_minor: string }[];
}
/** Preserve exact cents and reject extra precision rather than silently rounding. */
export function quoteAmountMinor(value: string, signed = false): string {
  const negative = signed && value.startsWith("-");
  const minor = majorToMinor(negative ? value.slice(1) : value, 2);
  if (minor === null) return "";
  return negative && minor !== "0" ? "-" + minor : minor;
}
const money = /^[1-9][0-9]{0,11}$/;
const lineMoney = /^-?(0|[1-9][0-9]{0,11})$/;
function text(value: string, max: number) {
  return (
    value.trim().length > 0 &&
    Array.from(value).length <= max &&
    !value.includes("\0")
  );
}
/** Immediate guidance; preview and issuance still require authoritative validation. */
export function quoteIssues(value: QuoteFields): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const add = (path: string, message: string) => {
    issues.push({ path, message });
  };
  if (!money.test(value.amount_minor))
    add(
      "amount_minor",
      "Enter a price greater than zero, up to 9,999,999,999.99, with at most two decimal places.",
    );
  if (!["USD", "EUR", "GBP"].includes(value.currency))
    add("currency", "Choose the quote currency.");
  if (!text(value.scope, 4000))
    add("scope", "Describe the agreed work using 1–4,000 characters.");
  if (!text(value.reason, 2000))
    add("reason", "Explain this quote using 1–2,000 characters.");
  if (
    !Number.isSafeInteger(value.delivery_min_hours) ||
    value.delivery_min_hours < 1 ||
    value.delivery_min_hours > 8760
  )
    add("delivery_min_hours", "Enter 1–8,760 whole hours.");
  if (
    !Number.isSafeInteger(value.delivery_max_hours) ||
    value.delivery_max_hours < value.delivery_min_hours ||
    value.delivery_max_hours > 8760
  )
    add(
      "delivery_max_hours",
      "Enter whole hours at least equal to the minimum, up to 8,760.",
    );
  if (
    !Number.isSafeInteger(value.expiry_hours) ||
    value.expiry_hours < 1 ||
    value.expiry_hours > 168
  )
    add("expires_at", "Choose 1–168 whole hours before this quote expires.");
  let sum = 0n;
  value.lines.forEach((line, index) => {
    const key = "lines." + String(index);
    if (!text(line.label, 120))
      add(key + ".label", "Add a line description of 1–120 characters.");
    if (!lineMoney.test(line.amount_minor)) {
      add(
        key + ".amount_minor",
        "Enter a price with at most two decimal places, for example 12.50 or -2.50.",
      );
    } else sum += BigInt(line.amount_minor);
  });
  if (
    value.lines.length > 0 &&
    value.lines.every((line) => lineMoney.test(line.amount_minor)) &&
    money.test(value.amount_minor) &&
    sum !== BigInt(value.amount_minor)
  )
    add(
      "amount_minor",
      "The quote line amounts must add up exactly to this pre-discount total.",
    );
  return issues;
}
