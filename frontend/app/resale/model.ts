import { z } from "../validation";
import { buyerCommissionSchema, sellerCommissionSchema } from "./commissions";

export const sellerTermsSchema = z.object({
  commission: sellerCommissionSchema.optional(),
  model: z.enum(["consignment", "buy_first"]),
  currency: z.string(),
  network: z.string(),
  amount: z.string(),
  proceeds_basis: z.string(),
  fees: z.string(),
  transfer_requirements: z.string(),
  dispute_terms: z.string(),
  withdrawal_terms: z.string(),
  payout_delay_hours: z.number().int(),
  payout_deadline_hours: z.number().int(),
});
export const offerSchema = z.object({
  id: z.string(),
  submission_id: z.string(),
  version: z.number().int(),
  terms: sellerTermsSchema,
  state: z.string(),
  expires_at: z.string(),
  accepted_at: z.string().nullable(),
  control_verified_at: z.string().nullable(),
  created_at: z.string(),
});
export const offersSchema = z.object({ offers: z.array(offerSchema) });
export const productSchema = z.object({
  commission: buyerCommissionSchema.optional(),
  title: z.string(),
  description: z.string(),
  region: z.string(),
  rank: z.string(),
  attributes: z.array(z.object({ label: z.string(), value: z.string() })),
  media_ids: z.array(z.string()),
  cover_media_id: z.string().optional(),
  currency: z.string(),
  amount_minor: z.string(),
  sale_terms: z.string(),
  transfer_requirements: z.string(),
  dispute_terms: z.string(),
  acknowledgement_terms: z.string(),
  dispute_hours: z.number().int(),
  delivery_min_hours: z.number().int(),
  delivery_max_hours: z.number().int(),
});
export const publicListingSchema = z.object({
  id: z.string(),
  release_id: z.string(),
  game: z.string(),
  slug: z.string(),
  state: z.string(),
  product: productSchema,
  images: z.array(
    z
      .string()
      .regex(
        /^\/api\/v1\/accounts\/[a-f0-9-]+\/images\/[0-7]\?release=[a-f0-9-]{36}$/,
      ),
  ),
});
export const publicListingsSchema = z.object({
  items: z.array(publicListingSchema),
  next: z.string(),
});
export const listingSchema = z.object({
  id: z.string(),
  submission_id: z.string(),
  offer_id: z.string(),
  version: z.number().int(),
  state: z.string(),
  game: z.string(),
  slug: z.string(),
  draft: productSchema,
  release_id: z.string(),
});
export const inventorySchema = z.object({
  items: z.array(listingSchema),
  next: z.string(),
});
export const secretSchema = z.object({
  version: z.number().int(),
  state: z.string(),
  expires_at: z.string().nullable(),
});
export const deliverySchema = z.object({
  active_case: z.boolean().optional(),
  order_id: z.string(),
  listing: publicListingSchema,
  version: z.number().int(),
  state: z.string(),
  instructions: z.string(),
  secret: secretSchema,
  delivered_at: z.string().nullable(),
  acknowledged_at: z.string().nullable(),
  dispute_until: z.string().nullable(),
});
export type SellerTerms = z.infer<typeof sellerTermsSchema>;
export type Offer = z.infer<typeof offerSchema>;
export type Product = z.infer<typeof productSchema>;
export type Listing = z.infer<typeof listingSchema>;
export type PublicListing = z.infer<typeof publicListingSchema>;

export const agreementDefaultsSchema = z.object({
  seller_consignment: sellerTermsSchema,
  seller_buy_first: sellerTermsSchema,
  buyer: productSchema,
  shop: z.record(z.string(), z.string()),
  review_policy: z.string(),
  boost_terms: z.string(),
});
