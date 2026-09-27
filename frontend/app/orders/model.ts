import { z } from "../validation";
import {
  releaseSchema,
  estimateSchema,
  answersSchema,
  issueSchema,
} from "../catalog/model";
export const states = [
  "submitted",
  "needs_information",
  "quoted",
  "awaiting_payment",
  "queued",
  "in_progress",
  "on_hold",
  "completed",
  "rejected",
  "cancelled",
  "expired",
] as const;
export const summarySchema = z.object({
  staff: z
    .object({
      customer_id: z.string(),
      assigned_id: z.string(),
      payment_state: z.string(),
    })
    .optional(),
  accepted_price: z
    .object({ currency: z.string(), amount_minor: z.string() })
    .optional(),
  unread: z.boolean().optional(),
  id: z.string(),
  version: z.number().int(),
  kind: z.enum(["custom", "package", "account"]),
  state: z.enum(states),
  slug: z.string(),
  service: z.string(),
  package: z.string(),
  variant: z.string(),
  game_name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export const commercialSchema = z.object({
  quote_id: z.string(),
  revision: z.number().int(),
  currency: z.string(),
  subtotal_minor: z.string(),
  amount_minor: z.string(),
  discount: estimateSchema.shape.discount,
  lines: z.array(
    z.object({ key: z.string(), label: z.string(), amount_minor: z.string() }),
  ),
  scope: z.string(),
  reason: z.string(),
  delivery_min_hours: z.number(),
  delivery_max_hours: z.number(),
  expires_at: z.string(),
  terms_version: z.string(),
});
export const quoteSchema = z.object({
  id: z.string(),
  state: z.string(),
  data: commercialSchema,
});
export const detailSchema = z.object({
  order: summarySchema,
  offer: releaseSchema,
  answers: answersSchema,
  estimate: estimateSchema,
  coupon_code: z.string(),
  quote: quoteSchema.optional(),
  contract: z
    .object({
      id: z.string(),
      payment_state: z.string(),
      data: commercialSchema,
    })
    .optional(),
});
export const listingSchema = z.object({
  orders: z.array(summarySchema),
  next: z.string(),
});
export const eventsSchema = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      version: z.number(),
      action: z.string(),
      message: z.string(),
      actor_role: z.string(),
      created_at: z.string(),
    }),
  ),
});
export const quotesSchema = z.object({ quotes: z.array(quoteSchema) });
export const reorderSchema = z.object({
  offer: releaseSchema,
  service: z.string(),
  package: z.string(),
  variant: z.string(),
  kind: z.string(),
  answers: answersSchema,
  issues: z.array(issueSchema),
});
export const favoriteSchema = z.object({
  id: z.string(),
  kind: z.string(),
  slug: z.string(),
  service: z.string(),
  package: z.string(),
  name: z.string(),
  available: z.boolean(),
});
export const favoritesSchema = z.object({
  favorites: z.array(favoriteSchema),
  next: z.string(),
});
export type Detail = z.infer<typeof detailSchema>;
export type Commercial = z.infer<typeof commercialSchema>;
export type Favorite = z.infer<typeof favoriteSchema>;
export type Reorder = z.infer<typeof reorderSchema>;
export const stateLabel = (state: string) => state.replaceAll("_", " ");
