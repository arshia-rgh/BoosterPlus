import type { FieldIssue } from "../ui/form-validation";
import type { Product, SellerTerms } from "./model";
const text = (value: string, min: number, max: number) =>
  Array.from(value.trim()).length >= min &&
  Array.from(value).length <= max &&
  !value.includes("\0");
const whole = (value: number, min: number, max: number) =>
  Number.isSafeInteger(value) && value >= min && value <= max;
function positiveDecimal(value: string) {
  const [mantissa = "", exponent, ...extra] = value.split(/[eE]/);
  const [integer = "", fraction, ...extraDecimal] = mantissa.split(".");
  return (
    extra.length === 0 &&
    extraDecimal.length === 0 &&
    /^(0|[1-9][0-9]{0,39})$/.test(integer) &&
    (fraction === undefined || /^[0-9]{1,40}$/.test(fraction)) &&
    (exponent === undefined || /^[+-]?[0-9]{1,2}$/.test(exponent)) &&
    Number(value) > 0
  );
}
export function sellerIssues(
  terms: SellerTerms,
  expires: string,
  now = Date.now(),
): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const add = (field: string, message: string) => {
    issues.push({ path: `terms.${field}`, message });
  };
  if (!/^[a-z0-9]{1,32}$/.test(terms.currency))
    add(
      "currency",
      "Enter the provider’s lowercase asset code, up to 32 letters or digits.",
    );
  if (!text(terms.network, 1, 64))
    add("network", "Enter the payout network, up to 64 characters.");
  if (!positiveDecimal(terms.amount))
    add(
      "amount",
      "Enter an exact positive crypto amount using the provider’s supported decimal format.",
    );
  for (const [field, value] of [
    ["proceeds_basis", terms.proceeds_basis],
    ["fees", terms.fees],
    ["transfer_requirements", terms.transfer_requirements],
    ["dispute_terms", terms.dispute_terms],
    ["withdrawal_terms", terms.withdrawal_terms],
  ] as const)
    if (!text(value, 20, 2000))
      add(field, "Enter 20–2,000 characters describing this term.");
  if (!whole(terms.payout_delay_hours, 0, 8759))
    add("payout_delay_hours", "Enter a whole number from 0 to 8,759 hours.");
  if (
    !whole(terms.payout_deadline_hours, 1, 8760) ||
    terms.payout_deadline_hours <= terms.payout_delay_hours
  )
    add(
      "payout_deadline_hours",
      "Enter 1–8,760 hours, later than the payout delay.",
    );
  const expiry = Date.parse(expires);
  if (
    !Number.isFinite(expiry) ||
    expiry <= now ||
    expiry > now + 30 * 24 * 60 * 60 * 1000
  )
    issues.push({
      path: "expires_at",
      message: "Choose a future expiry within 30 days.",
    });
  return issues;
}
export function productIssues(product: Product, publish = false): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const add = (path: string, message: string) => {
    issues.push({ path: `product.${path}`, message });
  };
  for (const [field, value, min, max] of [
    ["title", product.title, 1, 120],
    ["description", product.description, 20, 4000],
    ["region", product.region, 1, 80],
    ["rank", product.rank, 1, 80],
    ["sale_terms", product.sale_terms, 20, 2000],
    ["transfer_requirements", product.transfer_requirements, 20, 2000],
    ["dispute_terms", product.dispute_terms, 20, 2000],
    ["acknowledgement_terms", product.acknowledgement_terms, 20, 2000],
  ] as const)
    if (!text(value, min, max))
      add(field, `Enter ${String(min)}–${String(max)} characters.`);
  if (!/^[A-Z]{3}$/.test(product.currency))
    add("currency", "Enter a three-letter uppercase currency code.");
  if (!/^[1-9]\d{0,11}$/.test(product.amount_minor))
    add(
      "amount_minor",
      "Enter a positive whole amount in minor units, up to 12 digits.",
    );
  if (!whole(product.dispute_hours, 1, 720))
    add("dispute_hours", "Enter 1–720 whole hours.");
  if (!whole(product.delivery_min_hours, 1, 720))
    add("delivery_min_hours", "Enter 1–720 whole hours.");
  if (
    !whole(product.delivery_max_hours, 1, 720) ||
    product.delivery_max_hours < product.delivery_min_hours
  )
    add(
      "delivery_max_hours",
      "Enter 1–720 whole hours, at least the earliest delivery time.",
    );
  const labels = new Set<string>();
  product.attributes.forEach((item, index) => {
    if (!text(item.label, 1, 80) || labels.has(item.label))
      add(
        `attributes.${String(index)}.label`,
        "Enter a unique label of 1–80 characters.",
      );
    labels.add(item.label);
    if (!text(item.value, 1, 300))
      add(`attributes.${String(index)}.value`, "Enter 1–300 characters.");
  });
  if (product.attributes.length > 30)
    add("attributes", "Keep at most 30 characteristics.");
  if (
    product.media_ids.length > 8 ||
    new Set(product.media_ids).size !== product.media_ids.length
  )
    add("media_ids", "Choose at most eight different reviewed images.");
  if (
    (product.cover_media_id &&
      !product.media_ids.includes(product.cover_media_id)) ||
    (publish && product.media_ids.length > 0 && !product.cover_media_id)
  )
    add(
      "cover_media_id",
      "Choose a title image from the reviewed public images before publishing.",
    );
  return issues;
}
