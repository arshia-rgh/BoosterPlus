import { z } from "../validation";

export const metricPolicySchema = z.object({
  window_days: z.number().int().min(1).max(366),
  minimum_sample: z.number().int().min(5).max(1000000),
  maximum_age_seconds: z.number().int().min(30).max(86400),
});
export type MetricPolicy = z.infer<typeof metricPolicySchema>;
export const capabilitySchema = z.object({
  service: z.enum(["boost", "accounts", "shop", "news"]),
  state: z.enum(["off", "active", "paused"]),
  description: z.string().max(600),
  reason: z.string().max(300),
});
export const promotionSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,47}$/),
  title: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  target: z.enum(["package", "account", "shop"]),
  package: z.string(),
  variant: z.string(),
  listing_id: z.string(),
  product_id: z.string().optional(),
  release_id: z.string(),
  coupon_code: z.string(),
  coupon_version: z.number().int(),
  starts_at: z.string(),
  ends_at: z.string(),
  priority: z.number().int(),
  show_quantity: z.boolean(),
});
export type Promotion = z.infer<typeof promotionSchema>;
export const discoverySchema = z.object({
  capabilities: z.array(capabilitySchema).length(4),
  metrics: metricPolicySchema.optional(),
  promotions: z.array(promotionSchema).max(12).optional(),
});
export type Discovery = z.infer<typeof discoverySchema>;
