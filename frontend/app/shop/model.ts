import { z } from "../validation";
import {
  supplierProductSchema,
  supplierStatusSchema,
} from "../suppliers/contracts";

export const variantSchema = z.object({
  key: z.string(),
  label: z.string(),
  region: z.string(),
  platform: z.string(),
  server: z.string(),
  currency: z.string(),
  unit_amount_minor: z.string(),
  min_quantity: z.number().int(),
  max_quantity: z.number().int(),
  enabled: z.boolean(),
});
export const recipientFieldSchema = z.object({
  key: z.enum(["player_id", "server_id", "character_name", "delivery_note"]),
  label: z.string(),
  help: z.string(),
  required: z.boolean(),
  max_length: z.number().int(),
});
export const policySchema = z.object({
  delivery_min_hours: z.number().int(),
  delivery_max_hours: z.number().int(),
  reservation_minutes: z.number().int(),
  delivery_terms: z.string(),
  cancellation_terms: z.string(),
  refund_terms: z.string(),
  fees: z.string(),
  evidence_required: z.boolean(),
  review_enabled: z.boolean(),
  review_terms: z.string(),
});
export const definitionSchema = z.object({
  supplier: supplierProductSchema.optional(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  asset: z.string(),
  asset_alt: z.string(),
  asset_source: z.string(),
  reviewed: z.boolean(),
  variants: z.array(variantSchema),
  recipient: z.array(recipientFieldSchema),
  policy: policySchema,
});
export const stockSchema = z.object({
  variant_key: z.string(),
  version: z.number().int(),
  total: z.number().int(),
  reserved: z.number().int(),
  committed: z.number().int(),
  available: z.number().int(),
});
export const draftSchema = z.object({
  id: z.string(),
  game_id: z.string(),
  slug: z.string(),
  game: z.string(),
  version: z.number().int(),
  state: z.enum(["draft", "published", "paused", "archived"]),
  draft: definitionSchema,
  current_release: z.string(),
  stocks: z.array(stockSchema),
  updated_at: z.string(),
});
export const productsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      supplier: z.boolean().optional(),
      game_id: z.string(),
      game: z.string(),
      slug: z.string(),
      title: z.string(),
      version: z.number().int(),
      state: z.string(),
      updated_at: z.string(),
    }),
  ),
  next: z.string(),
});
export const previewSchema = z.object({
  draft: draftSchema,
  issues: z.array(z.object({ path: z.string(), message: z.string() })),
});
export const historySchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      product_id: z.string(),
      version: z.number().int(),
      definition: definitionSchema,
      created_at: z.string(),
    }),
  ),
  next: z.number().int(),
});
export type Definition = z.infer<typeof definitionSchema>;
export type Variant = z.infer<typeof variantSchema>;
export type RecipientField = z.infer<typeof recipientFieldSchema>;
export type Draft = z.infer<typeof draftSchema>;
export type Stock = z.infer<typeof stockSchema>;
export type Preview = z.infer<typeof previewSchema>;
export function emptyDefinition(): Definition {
  return {
    title: "",
    description: "",
    category: "",
    asset: "",
    asset_alt: "",
    asset_source: "",
    reviewed: false,
    variants: [],
    recipient: [],
    policy: {
      delivery_min_hours: 0,
      delivery_max_hours: 0,
      reservation_minutes: 0,
      delivery_terms: "",
      cancellation_terms: "",
      refund_terms: "",
      fees: "",
      evidence_required: true,
      review_enabled: false,
      review_terms: "",
    },
  };
}
export const productStates = [
  ["", "All states"],
  ["draft", "Draft"],
  ["published", "Published"],
  ["paused", "Paused"],
  ["archived", "Archived"],
] satisfies [string, string][];

export const publicProductSchema = z.object({
  supplier_available: z.boolean().default(false),
  id: z.string(),
  game_id: z.string(),
  game_slug: z.string(),
  release_id: z.string(),
  version: z.number().int(),
  definition: definitionSchema,
  available: z.record(z.string(), z.number().int().nonnegative()),
});
export const publicPageSchema = z.object({
  items: z.array(publicProductSchema),
  next: z.string(),
});
export const purchaseSchema = z.object({
  supplier_quantity: z.string().optional(),
  product_id: z.string(),
  release_id: z.string(),
  product: definitionSchema,
  variant: variantSchema,
  quantity: z.number().int(),
  amount_minor: z.string(),
});
export const deliverySchema = z.object({
  supplier: supplierStatusSchema.optional(),
  order_id: z.string(),
  order_state: z.string(),
  order_version: z.number().int(),
  version: z.number().int(),
  state: z.string(),
  assigned_id: z.string().optional(),
  note: z.string(),
  proof_message_id: z.string(),
  updated_at: z.string(),
  recipient_provided: z.boolean(),
  purchase: purchaseSchema,
});
export const recipientSchema = z.object({
  order_id: z.string(),
  version: z.number().int(),
  values: z.record(z.string(), z.string()),
});
export type PublicProduct = z.infer<typeof publicProductSchema>;
export type ShopDelivery = z.infer<typeof deliverySchema>;
