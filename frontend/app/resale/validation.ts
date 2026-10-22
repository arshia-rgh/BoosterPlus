import {
  buyerCommission,
  sellerCommission,
  validConversionRate,
} from "./commissions";
import type { FieldIssue } from "../ui/form-validation";
import type { Product, SellerTerms } from "./model";
const text = (value: string, min: number, max: number) =>
  Array.from(value.trim()).length >= min &&
  Array.from(value).length <= max &&
  !value.includes("\0");
const whole = (value: number, min: number, max: number) =>
  Number.isSafeInteger(value) && value >= min && value <= max;
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
      "Choose an available payout asset and network from the list.",
    );
  if (!text(terms.network, 1, 64))
    add(
      "currency",
      "Choose an available payout asset and network from the list.",
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
  const quote = terms.commission;
  if (!quote || !/^[1-9][0-9]{0,11}$/.test(quote.base_minor))
    add(
      "commission.base_minor",
      "Enter a positive USD base price with at most two decimal places.",
    );
  if (!quote || !validConversionRate(quote.rate) || Number(quote.rate) <= 0)
    add(
      "commission.rate",
      "Enter a positive quoted number of crypto units per USD.",
    );
  if (
    !quote ||
    !text(quote.rate_source, 3, 200) ||
    quote.rate_source.trim() !== quote.rate_source
  )
    add(
      "commission.rate_source",
      "Enter the actual conversion source, 3–200 characters.",
    );
  const quotedAt = Date.parse(quote?.quoted_at ?? "");
  if (
    !Number.isFinite(quotedAt) ||
    quotedAt > now + 60000 ||
    quotedAt < now - 86400000
  )
    add(
      "commission.quoted_at",
      "Use a conversion quote from the past 24 hours.",
    );
  if (quote) {
    const expected = sellerCommission(
      quote.base_minor,
      quote.rate,
      quote.rate_source,
      quote.quoted_at,
    );
    if (
      /^[1-9][0-9]{0,11}$/.test(quote.base_minor) &&
      terms.model === "consignment" &&
      !buyerCommission(quote.base_minor)
    )
      add(
        "commission.base_minor",
        "Use a lower base price within the supported buyer-total limit.",
      );
    if (
      expected &&
      (expected.net_amount !== terms.amount ||
        expected.fee_minor !== quote.fee_minor ||
        expected.net_minor !== quote.net_minor ||
        expected.net_amount !== quote.net_amount)
    )
      add(
        "commission.base_minor",
        "Recalculate the price and conversion quote before proposing this agreement.",
      );
  }
  if (terms.payout_delay_hours !== 0)
    add(
      "payout_delay_hours",
      "The approved terms have no extra delay after eligibility.",
    );
  if (terms.payout_deadline_hours !== 48)
    add("payout_deadline_hours", "Use the approved 48-hour initiation target.");
  const expiry = Date.parse(expires);
  if (
    !Number.isFinite(expiry) ||
    expiry <= now ||
    expiry > now + 7 * 24 * 60 * 60 * 1000
  )
    issues.push({
      path: "expires_at",
      message: "Choose a future expiry within seven days.",
    });
  return issues;
}
export function productIssues(product: Product, publish = false): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const add = (path: string, message: string) => {
    issues.push({ path: `product.${path}`, message });
  };
  if (product.hero_count !== undefined && !whole(product.hero_count, 0, 10000))
    add("hero_count", "Enter a whole hero count from 0 to 10,000.");
  if (product.selling_point && !text(product.selling_point, 1, 180))
    add("selling_point", "Use a short selling point of 1–180 characters.");
  if (product.skin_collection) {
    const groups = product.skin_collection.groups,
      categories = new Set<string>();
    if (groups.length > 60) add("skin_collection", "Use up to 60 skin groups.");
    let total = 0;
    groups.forEach((group, i) => {
      const p = `skin_collection.groups.${String(i)}`;
      if (!text(group.category, 1, 120) || categories.has(group.category))
        add(`${p}.category`, "Use a unique category of 1–120 characters.");
      categories.add(group.category);
      if (
        !/^[1-9]\d{0,2}$/.test(group.count) ||
        Number(group.count) > 500 ||
        Number(group.count) !== group.names.length
      )
        add(
          `${p}.count`,
          "Enter 1–500; the quantity must match the number of names.",
        );
      if (
        !group.names.length ||
        group.names.length > 500 ||
        new Set(group.names).size !== group.names.length ||
        group.names.some((n) => !text(n, 1, 120) || n !== n.trim())
      )
        add(
          `${p}.names`,
          "Use unique names, one per line, up to 120 characters each.",
        );
      total += group.names.length;
    });
    if (total > 1000)
      add("skin_collection", "Keep the collection within 1,000 named items.");
  }
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
  const commission = product.commission;
  const expected = buyerCommission(commission?.base_minor ?? "");
  if (
    !commission ||
    !expected ||
    product.currency !== "USD" ||
    commission.total_minor !== expected.total_minor ||
    commission.fee_minor !== expected.fee_minor ||
    product.amount_minor !== expected.total_minor
  )
    add(
      "commission.base_minor",
      "Enter the USD base price to calculate the 5% buyer commission and total.",
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
