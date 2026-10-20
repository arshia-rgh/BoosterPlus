import { z } from "../validation";

export const supplierFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.string(),
  required: z.boolean(),
  secret: z.boolean(),
  transient: z.boolean(),
  min: z.string().nullish(),
  max: z.string().nullish(),
  step: z.string().nullish(),
  options: z
    .array(z.object({ id: z.string(), label: z.string() }))
    .nullable()
    .default([]),
});
export const supplierQuantitySchema = z.object({
  kind: z.string(),
  min: z.string(),
  max: z.string(),
  step: z.string(),
});
export const supplierEligibilitySchema = z.object({
  global: z.boolean(),
  regions: z.array(z.string()).nullable(),
  countries: z.array(z.string()).nullable(),
  excluded_countries: z.array(z.string()).nullable(),
  policy_kind: z.string(),
  policy_countries: z.array(z.string()).nullable(),
});
export const supplierProductSchema = z.object({
  method: z.enum(["id", "account", "code"]),
  quantity: supplierQuantitySchema,
  fields: z.array(supplierFieldSchema),
  eligibility: supplierEligibilitySchema,
  testing: z.boolean(),
});
export const supplierQuoteSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  release_id: z.string(),
  quantity: z.string(),
  amount_minor: z.string(),
  currency: z.literal("USD"),
  expires_at: z.string(),
  testing: z.boolean(),
});
export const supplierStatusSchema = z.object({
  state: z.string(),
  requested: z.string().optional(),
  delivered: z.string().optional(),
  needs_review: z.boolean(),
  codes_available: z.boolean(),
  testing: z.boolean(),
});
export const supplierCodesSchema = z.object({
  keys: z.array(
    z.object({
      code: z.string(),
      cardNo: z.string().optional(),
      url: z.string().optional(),
      expireAt: z.string().optional(),
    }),
  ),
});
export const supplierActionSchema = z.object({
  kind: z.string(),
  url: z.string(),
  employee: z.string(),
  profile_url: z.string(),
});
export type SupplierField = z.infer<typeof supplierFieldSchema>;
export type SupplierQuote = z.infer<typeof supplierQuoteSchema>;
export const supplierMethodNames = {
  id: "Player ID · automatic delivery",
  account: "Account sign-in · 24–72 hours",
  code: "Digital code",
};
