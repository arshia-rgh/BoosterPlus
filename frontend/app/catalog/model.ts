import { discoverySchema, capabilitySchema } from "./discovery-model";
import { z } from "../validation";

const list = <T extends z.ZodType>(item: T) =>
  z
    .array(item)
    .nullable()
    .transform((value) => value ?? []);
export type Condition = {
  op: string;
  field: string;
  values: string[];
  children: Condition[];
};
export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.object({
    op: z.string(),
    field: z.string(),
    values: list(z.string()),
    children: list(conditionSchema),
  }),
);
export const optionSchema = z.object({
  key: z.string(),
  label: z.string(),
  units: z.number().int(),
});
export const cosmeticsSchema = z.object({
  groups: z.array(
    z.object({
      category: z.string(),
      count: z.string(),
      names: z.array(z.string()),
    }),
  ),
});
export type Cosmetics = z.infer<typeof cosmeticsSchema>;
export const answerSchema = z.union([
  z.string(),
  z.boolean(),
  z.array(z.string()),
  cosmeticsSchema,
]);
export const answersSchema = z.record(z.string(), answerSchema);
export type Answers = z.infer<typeof answersSchema>;
/** Text-only fallback for immutable answers without a catalog label map. */
export function answerText(value: Answers[string]): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object")
    return value.groups
      .map(
        (group) =>
          `${group.category} · ${group.count}: ${group.names.join(", ")}`,
      )
      .join("; ");
  return String(value);
}
export const fieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  help: z.string(),
  type: z.enum([
    "select",
    "radio",
    "multiselect",
    "boolean",
    "integer",
    "decimal",
    "win_rate",
    "short_text",
    "long_text",
    "rank",
    "attachment",
    "cosmetics",
  ]),
  stage: z.enum(["estimate", "order", "fulfillment"]),
  required: z.boolean(),
  reference: z.string(),
  options: list(optionSchema),
  min: z.string(),
  max: z.string(),
  step: z.string(),
  unit: z.string(),
  min_length: z.number().int(),
  max_length: z.number().int(),
  min_selections: z.number().int(),
  max_selections: z.number().int(),
  default: answerSchema.optional(),
  visible_when: conditionSchema.optional(),
  required_when: conditionSchema.optional(),
});
export const ruleSchema = z.object({
  key: z.string(),
  kind: z.string(),
  message: z.string(),
  when: conditionSchema.optional(),
  from: z.string(),
  to: z.string(),
  from_units: z.string(),
  to_units: z.string(),
  link_mode: z.enum(["single_parent", "shared_parent"]).optional(),
  links: z
    .array(z.object({ parent: z.string(), children: z.array(z.string()) }))
    .optional(),
});
export const priceRuleSchema = z.object({
  key: z.string(),
  label: z.string(),
  kind: z.string(),
  value: z.string(),
  field: z.string(),
  from: z.string(),
  to: z.string(),
  from_units: z.string(),
  to_units: z.string(),
  intervals: list(z.object({ rank: z.string(), amount_minor: z.string() })),
  when: conditionSchema.optional(),
});
export const priceCaseSchema = z.object({
  key: z.string(),
  answers: answersSchema,
  outcome: z.string(),
  amount_minor: z.string(),
});
export const pricePlanSchema = z.object({
  currency: z.string(),
  base_minor: z.string(),
  minimum_minor: z.string(),
  maximum_minor: z.string(),
  rules: list(priceRuleSchema),
  cases: list(priceCaseSchema),
});
export type PricePlan = z.infer<typeof pricePlanSchema>;
export type PriceRule = z.infer<typeof priceRuleSchema>;
export type PriceCase = z.infer<typeof priceCaseSchema>;
export const fulfillmentPolicySchema = z.object({
  mode: z.enum(["account", "together", "selection"]),
  field: z.string(),
  account_value: z.string(),
  together_value: z.string(),
  secret_hours: z.number().int(),
  share_fields: list(z.string()),
});
export const deliveryRuleSchema = z.object({
  key: z.string(),
  mode: z.enum(["account", "together"]),
  when: conditionSchema.optional(),
  min_minutes: z.number().int(),
  max_minutes: z.number().int(),
  wait_min_minutes: z.number().int(),
  wait_max_minutes: z.number().int(),
  workload_minutes: z.number().int(),
});
export const deliveryPolicySchema = z.object({
  calendar: z.object({
    zone: z.string(),
    windows: list(
      z.object({
        weekday: z.number().int(),
        start: z.string(),
        end: z.string(),
      }),
    ),
    closures: list(z.string()),
  }),
  rules: list(deliveryRuleSchema),
});
export type DeliveryRule = z.infer<typeof deliveryRuleSchema>;
export const serviceSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  evaluator: z.string(),
  fields: list(fieldSchema),
  rules: list(ruleSchema),
  pricing: pricePlanSchema.optional(),
  fulfillment: fulfillmentPolicySchema.optional(),
  delivery: deliveryPolicySchema.optional(),
  delivery_request: z
    .object({
      minimum: z.string(),
      maximum: z.string(),
      basis: z.literal("payment_and_access_v1"),
    })
    .optional(),
});
export const variantSchema = z.object({
  key: z.string(),
  name: z.string(),
  currency: z.string(),
  amount_minor: z.string(),
  capacity: z.number().int().optional(),
  delivery_min_hours: z.number().int(),
  delivery_max_hours: z.number().int(),
  required_fields: list(z.string()),
  preset_answers: answersSchema.optional(),
  excluded_fields: list(z.string()).optional(),
  eligibility: conditionSchema.optional(),
});
export const packageSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  asset: z.string().optional(),
  asset_alt: z.string().optional(),
  asset_source: z.string().optional(),
  service: z.string(),
  variants: list(variantSchema),
});
export const referenceSchema = z.object({
  key: z.string(),
  label: z.string(),
  kind: z.string(),
  options: list(optionSchema),
});
export const intakeSchema = z.object({
  name: z.string(),
  description: z.string(),
  fields: list(fieldSchema),
  rules: list(ruleSchema),
});
export type IntakeForm = z.infer<typeof intakeSchema>;
export const intakeService = (form: IntakeForm): Service => ({
  ...form,
  key: "account_intake",
  evaluator: "manual-review-v1",
});
export const reviewPolicySchema = z.object({
  content: z.string(),
  fields: list(fieldSchema),
  rules: list(ruleSchema),
});
export type ReviewPolicy = z.infer<typeof reviewPolicySchema>;
export function reviewService(policy: ReviewPolicy): Service {
  return intakeService({
    name: "Purchase feedback",
    description: policy.content,
    fields: policy.fields,
    rules: policy.rules,
  });
}
export const heroLayoutSchema = z.object({
  desktop_x: z.number().int().min(0).max(100),
  desktop_y: z.number().int().min(0).max(100),
  mobile_x: z.number().int().min(0).max(100),
  mobile_y: z.number().int().min(0).max(100),
  copy_side: z.enum(["left", "right"]),
});
export type HeroLayout = z.infer<typeof heroLayoutSchema>;
export const defaultHeroLayout: HeroLayout = Object.freeze({
  desktop_x: 50,
  desktop_y: 30,
  mobile_x: 50,
  mobile_y: 20,
  copy_side: "left",
});
export const configurationSchema = z.object({
  discovery: discoverySchema.optional(),
  hero_layout: heroLayoutSchema.optional(),
  review_policy: reviewPolicySchema.optional(),
  intake: intakeSchema.optional(),
  schema_version: z.literal(1),
  name: z.string(),
  description: z.string(),
  asset: z.string(),
  asset_alt: z.string(),
  reviewed: z.boolean(),
  references: list(referenceSchema),
  services: list(serviceSchema),
  packages: list(packageSchema),
  faqs: list(z.object({ question: z.string(), answer: z.string() })),
});
export const issueSchema = z.object({ path: z.string(), message: z.string() });
export const draftSchema = z.object({
  id: z.string(),
  slug: z.string(),
  revision: z.number().int(),
  published: z.boolean(),
  paused: z.boolean(),
  archived: z.boolean(),
  current_release: z.string(),
  configuration: configurationSchema,
});
export const releaseSchema = z.object({
  id: z.string(),
  game_id: z.string(),
  slug: z.string(),
  version: z.number().int(),
  paused: z.boolean(),
  created_at: z.string(),
  configuration: configurationSchema,
});
export const summarySchema = z.object({
  hero_layout: heroLayoutSchema.optional(),
  capabilities: z.array(capabilitySchema).optional(),
  intake_enabled: z.boolean().optional(),
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  asset: z.string(),
  asset_alt: z.string(),
  paused: z.boolean(),
  published: z.boolean(),
  archived: z.boolean(),
  revision: z.number().int(),
});
export const listingSchema = z.object({
  games: list(summarySchema),
  next: z.string(),
});
export const previewSchema = z.object({
  draft: draftSchema,
  issues: list(issueSchema),
});
export const historySchema = z.object({ releases: list(releaseSchema) });
export const validationSchema = z.object({
  answers: answersSchema,
  issues: list(issueSchema),
});
export type Configuration = z.infer<typeof configurationSchema>;
export type Draft = z.infer<typeof draftSchema>;
export type Release = z.infer<typeof releaseSchema>;
export type Field = z.infer<typeof fieldSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type Reference = z.infer<typeof referenceSchema>;
export type Option = z.infer<typeof optionSchema>;
export type Package = z.infer<typeof packageSchema>;
export type Variant = z.infer<typeof variantSchema>;
export type Rule = z.infer<typeof ruleSchema>;
export type Issue = z.infer<typeof issueSchema>;
export type Listing = z.infer<typeof listingSchema>;
export function emptyConfiguration(name: string): Configuration {
  return {
    schema_version: 1,
    name,
    description: "",
    asset: "/catalog-assets/game-placeholder.svg",
    asset_alt: "Abstract game controller",
    reviewed: false,
    references: [],
    services: [],
    packages: [],
    faqs: [],
  };
}
export function emptyField(key: string): Field {
  return {
    key,
    label: "New field",
    help: "",
    type: "select",
    stage: "estimate",
    required: false,
    reference: "",
    options: [],
    min: "0",
    max: "100",
    step: "1",
    unit: "",
    min_length: 0,
    max_length: 100,
    min_selections: 0,
    max_selections: 10,
  };
}
export function emptyVariant(key: string): Variant {
  return {
    key,
    name: "New variant",
    currency: "",
    amount_minor: "",
    delivery_min_hours: 0,
    delivery_max_hours: 0,
    required_fields: [],
    preset_answers: {},
    excluded_fields: [],
  };
}
export function optionsFor(field: Field, config: Configuration): Option[] {
  return field.reference
    ? (config.references.find((ref) => ref.key === field.reference)?.options ??
        [])
    : field.options;
}
const stages = new Map([
  ["estimate", 0],
  ["order", 1],
  ["fulfillment", 2],
]);
export function stageIndex(stage: string) {
  return stages.get(stage) ?? -1;
}
function numeric(value: unknown): bigint | null {
  if (typeof value !== "string" || value.length > 20) return null;
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const parts = unsigned.split(".");
  const whole = parts[0] ?? "",
    fraction = parts[1] ?? "";
  if (
    parts.length > 2 ||
    !/^[0-9]{1,12}$/.test(whole) ||
    (whole.length > 1 && whole.startsWith("0")) ||
    (parts.length === 2 && !/^[0-9]{1,6}$/.test(fraction))
  )
    return null;
  return BigInt(whole + fraction.padEnd(6, "0")) * (negative ? -1n : 1n);
}
export function matches(
  condition: Condition | undefined,
  answers: Answers,
  fields: Field[],
): boolean {
  if (!condition) return true;
  if (condition.op === "all")
    return condition.children.every((c) => matches(c, answers, fields));
  if (condition.op === "any")
    return condition.children.some((c) => matches(c, answers, fields));
  const value = new Map(Object.entries(answers)).get(condition.field);
  if (value === undefined) return false;
  if (Array.isArray(value))
    return (
      condition.op === "in" &&
      value.some((item) => condition.values.includes(item))
    );
  const field = fields.find((f) => f.key === condition.field);
  if (field?.type === "integer" || field?.type === "decimal") {
    const left = numeric(value);
    if (left === null) return false;
    if (condition.op === "eq" || condition.op === "in")
      return condition.values.some((item) => numeric(item) === left);
    const right = numeric(condition.values[0]);
    if (right === null) return false;
    switch (condition.op) {
      case "gt":
        return left > right;
      case "gte":
        return left >= right;
      case "lt":
        return left < right;
      case "lte":
        return left <= right;
      default:
        return false;
    }
  }
  return (
    typeof value !== "object" &&
    (condition.op === "eq" || condition.op === "in") &&
    condition.values.includes(String(value))
  );
}
// Drop hidden/future answers on every input change so stale values cannot reappear.
export function visibleAnswers(
  service: Service,
  raw: Answers,
  stage: string,
): Answers {
  const result: Answers = Object.create(null) as Answers;
  const done = new Set<string>(),
    visiting = new Set<string>();
  function dependencies(c: Condition | undefined): string[] {
    return !c ? [] : c.field ? [c.field] : c.children.flatMap(dependencies);
  }
  function visit(field: Field) {
    if (
      done.has(field.key) ||
      visiting.has(field.key) ||
      stageIndex(field.stage) > stageIndex(stage)
    )
      return;
    visiting.add(field.key);
    for (const key of [
      ...dependencies(field.visible_when),
      ...dependencies(field.required_when),
    ]) {
      const dep = service.fields.find((f) => f.key === key);
      if (dep) visit(dep);
    }
    done.add(field.key);
    if (matches(field.visible_when, result, service.fields)) {
      const value =
        new Map(Object.entries(raw)).get(field.key) ?? field.default;
      if (value !== undefined) result[field.key] = value;
    }
  }
  service.fields.forEach(visit);
  return result;
}
export function price(
  variant: Pick<Variant, "amount_minor" | "currency">,
): string {
  if (!/^[1-9][0-9]{0,11}$/.test(variant.amount_minor))
    return "Price pending review";
  const amount = BigInt(variant.amount_minor);
  return `${variant.currency} ${String(amount / 100n)}.${(amount % 100n).toString().padStart(2, "0")}`;
}

export const estimateSchema = z.object({
  discount: z
    .object({
      coupon_id: z.string(),
      version: z.number().int(),
      code: z.string(),
      amount_minor: z.string(),
      indicative: z.boolean(),
    })
    .optional(),
  release_id: z.string(),
  version: z.number().int(),
  evaluator: z.string(),
  expires_at: z.string(),
  outcome: z.enum(["estimated", "manual_review", "invalid"]),
  currency: z.string(),
  amount_minor: z.string(),
  answers: answersSchema,
  lines: list(
    z.object({ key: z.string(), label: z.string(), amount_minor: z.string() }),
  ),
  issues: list(issueSchema),
});
export type Estimate = z.infer<typeof estimateSchema>;
