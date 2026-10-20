import { supplierFieldSchema } from "./contracts";
import { z } from "../validation";

export const connections = [
  ["nexus-sandbox", "Nexus · Sandbox"],
  ["nexus-production", "Nexus · Production"],
] satisfies [string, string][];
export const connectionSchema = z.object({
  id: z.string(),
  testing: z.boolean(),
  configured: z.boolean(),
  version: z.number().int(),
  markup_bps: z.number().int(),
  current_import: z.string(),
  active_import: z.string(),
  purchases_enabled: z.boolean(),
});
export const connectionsSchema = z.object({ items: z.array(connectionSchema) });
export const importSchema = z.object({
  id: z.string(),
  connection: z.string(),
  state: z.string(),
  product_count: z.number().int(),
  offer_count: z.number().int(),
  issue: z.string(),
  updated_at: z.string(),
});
export const pricingSchema = z.object({
  version: z.number().int(),
  markup_bps: z.number().int().nullable(),
  effective_markup_bps: z.number().int(),
  override_minor: z.string(),
  cost_usd: z.string(),
  preview_quantity: z.string(),
  preview_amount_minor: z.string(),
  game_id: z.string(),
  region: z.string(),
  delivery_method: z.string(),
  shop_product_id: z.string(),
  issues: z.array(z.string()),
});
const offerSchema = z.object({
  id: z.string(),
  name: z.string(),
  available: z.boolean(),
  suggested_delivery: z.string(),
  fields: z.array(supplierFieldSchema),
  quantity: z.object({
    kind: z.string(),
    min: z.string(),
    max: z.string(),
    step: z.string(),
  }),
  pricing: pricingSchema,
  instruction: z.string(),
  code_request: z.boolean(),
  google_prompt: z.boolean(),
  game_exit: z.boolean(),
});
const productSchema = z.object({
  id: z.string(),
  game_id: z.string(),
  category_id: z.string(),
  name: z.string(),
  description: z.string(),
  kind: z.string(),
  platform: z.string(),
  region: z.object({
    global: z.boolean(),
    regions: z.array(z.string()).nullable(),
    countries: z.array(z.string()).nullable(),
    excluded_countries: z.array(z.string()).nullable(),
    policy_kind: z.string(),
    policy_countries: z.array(z.string()).nullable(),
  }),
  review_issues: z.array(z.string()),
  offers: z.array(offerSchema),
});
export const librarySchema = z.object({
  connection: connectionSchema,
  import: importSchema.nullable(),
  games: z.array(
    z.object({ id: z.string(), name: z.string(), closed: z.boolean() }),
  ),
  categories: z.array(
    z.object({ id: z.string(), game_id: z.string(), name: z.string() }),
  ),
  items: z.array(productSchema),
  next: z.string(),
});
export type Connection = z.infer<typeof connectionSchema>;
export type Library = z.infer<typeof librarySchema>;
export type Product = z.infer<typeof productSchema>;
export type Offer = z.infer<typeof offerSchema>;
export type Pricing = z.infer<typeof pricingSchema>;
export type Import = z.infer<typeof importSchema>;
export const deliveryLabels = new Map([
  ["id", "Player ID"],
  ["account", "Account sign-in"],
  ["code", "Digital code"],
  ["review", "Needs method review"],
  ["", "Not reviewed"],
]);
const issueLabels = new Map([
  ["supplier_unavailable", "Currently unavailable from the supplier."],
  ["game_mapping_required", "Choose a PLAYORA game."],
  ["region_review_required", "Review the supported account region."],
  ["delivery_review_required", "Confirm the delivery method."],
  [
    "supplier_category_missing",
    "The supplier category is missing. Keep this product private.",
  ],
  ["unsupported_field_type", "A delivery input is not supported yet."],
  [
    "field_pattern_needs_review",
    "A supplier input rule needs technical review.",
  ],
  ["field_options_need_review", "Supplier input choices need review."],
  ["quantity_needs_review", "The supported quantity needs review."],
  ["price_unavailable", "A selling price could not be calculated."],
  ["product_type_needs_review", "The product type needs review."],
  [
    "delivery_method_needs_review",
    "Confirm the supplier's delivery requirements.",
  ],
]);
export function issueLabel(code: string) {
  return (
    issueLabels.get(code) ??
    "This supplier detail needs review before publication."
  );
}

/** Currency input stays decimal text; no floating-point conversion of money. */
export function decimalCents(value: string): string | null {
  const parts = value.trim().split(".");
  if (
    parts.length > 2 ||
    !/^(0|[1-9][0-9]{0,9})$/.test(parts[0] ?? "") ||
    (parts.length === 2 && !/^[0-9]{1,2}$/.test(parts[1] ?? ""))
  )
    return null;
  return (
    BigInt(parts[0] ?? "0") * 100n +
    BigInt((parts[1] ?? "").padEnd(2, "0"))
  ).toString();
}
export function centsText(value: string): string {
  if (!/^[0-9]{1,24}$/.test(value)) return "";
  const n = BigInt(value);
  return `${String(n / 100n)}.${String(n % 100n).padStart(2, "0")}`;
}
export function markupBPS(value: string): number | null {
  const cents = decimalCents(value);
  return cents !== null && BigInt(cents) <= 100000n ? Number(cents) : null;
}
function fraction(value: string): [bigint, bigint] | null {
  if (value.length > 55) return null;
  const scientific = value.split(/[eE]/);
  if (
    scientific.length > 2 ||
    (scientific.length === 2 && !/^[+-]?[0-9]{1,2}$/.test(scientific[1] ?? ""))
  )
    return null;
  const exponent = Number(scientific[1] ?? "0");
  if (exponent < -18 || exponent > 18) return null;
  const parts = (scientific[0] ?? "").split(".");
  if (
    parts.length > 2 ||
    !/^(0|[1-9][0-9]{0,11})$/.test(parts[0] ?? "") ||
    (parts.length === 2 && !/^[0-9]{1,18}$/.test(parts[1] ?? ""))
  )
    return null;
  const places = parts[1] ?? "";
  const numerator =
    BigInt((parts[0] ?? "0") + places) * 10n ** BigInt(Math.max(0, exponent));
  const denominator = 10n ** BigInt(places.length + Math.max(0, -exponent));
  if (numerator > 999999999999n * denominator) return null;
  return [numerator, denominator];
}
/** Mirror the documented final half-up rule for a preview; the API is authoritative. */
export function previewPrice(
  cost: string,
  quantity: string,
  bps: number | null,
  override: string | null,
): string | null {
  const c = fraction(cost),
    q = fraction(quantity);
  if (
    !c ||
    !q ||
    c[0] <= 0n ||
    q[0] <= 0n ||
    bps === null ||
    !Number.isInteger(bps) ||
    bps < 0 ||
    bps > 100000
  )
    return null;
  if (override !== null && !/^[1-9][0-9]{0,11}$/.test(override)) return null;
  const n =
    override !== null
      ? BigInt(override) * q[0]
      : c[0] * q[0] * BigInt(10000 + bps) * 100n;
  const d = override !== null ? q[1] : c[1] * q[1] * 10000n;
  const total = ((n * 2n + d) / (d * 2n)).toString();
  return /^[1-9][0-9]{0,11}$/.test(total) ? centsText(total) : null;
}
