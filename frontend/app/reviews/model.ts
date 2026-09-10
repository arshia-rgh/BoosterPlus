import { z } from "zod";
import {
  answersSchema,
  referenceSchema,
  releaseSchema,
  reviewPolicySchema,
  answerSchema,
} from "../catalog/model";
export const stateSchema = z.enum([
  "pending",
  "published",
  "hidden",
  "rejected",
  "withdrawn",
]);
export const policySchema = z.object({
  release_id: z.string(),
  policy: reviewPolicySchema,
  references: z.array(referenceSchema),
});
export const summarySchema = z.object({
  id: z.string(),
  order_id: z.string(),
  version: z.number().int(),
  game: z.string(),
  slug: z.string(),
  state: stateSchema,
  rating: z.number().int().min(1).max(5),
  created_at: z.string(),
  updated_at: z.string(),
});
export const reviewSchema = z.object({
  review: summarySchema,
  body: z.string(),
  answers: answersSchema,
  policy: policySchema,
  response: z.string(),
  reason_code: z.string().optional(),
  internal_reason: z.string().optional(),
});
export const orderReviewSchema = z.object({
  order_id: z.string(),
  eligible: z.boolean(),
  policy: policySchema.nullable(),
  review: reviewSchema.nullable(),
});
export const listingSchema = z.object({
  items: z.array(summarySchema),
  next: z.string(),
});
export const historySchema = z.object({
  revisions: z.array(
    z.object({
      version: z.number().int(),
      action: z.string(),
      state: stateSchema,
      rating: z.number().int(),
      body: z.string(),
      answers: answersSchema,
      policy: policySchema,
      response: z.string(),
      actor_role: z.string(),
      created_at: z.string(),
      reason_code: z.string().optional(),
      internal_reason: z.string().optional(),
    }),
  ),
});
export const publicReviewSchema = z.object({
  id: z.string(),
  rating: z.number().int().min(1).max(5),
  body: z.string(),
  feedback: z.array(z.object({ label: z.string(), value: answerSchema })),
  response: z.string(),
  policy_content: z.string(),
  purchase_status: z.enum([
    "verified_purchase",
    "purchase_status_updated",
    "fulfillment_status_updated",
  ]),
  published_at: z.string(),
  updated_at: z.string(),
});
export const feedSchema = z.object({
  game: releaseSchema,
  items: z.array(publicReviewSchema),
  next: z.string(),
  count: z.number().int().nonnegative(),
  rating_sum: z.number().int().nonnegative(),
  histogram: z.array(
    z.object({
      rating: z.number().int(),
      count: z.number().int().nonnegative(),
    }),
  ),
});
export type Review = z.infer<typeof reviewSchema>;
export type OrderReview = z.infer<typeof orderReviewSchema>;
export type Policy = z.infer<typeof policySchema>;
export type Feed = z.infer<typeof feedSchema>;
export function stateLabel(state: z.infer<typeof stateSchema>) {
  switch (state) {
    case "pending":
      return "Pending moderation";
    case "published":
      return "Published";
    case "hidden":
      return "Hidden after moderation";
    case "rejected":
      return "Rejected after moderation";
    case "withdrawn":
      return "Withdrawn";
  }
}
export function actionLabel(action: string) {
  switch (action) {
    case "submitted":
      return "Feedback submitted";
    case "edited":
      return "Feedback edited";
    case "publish":
      return "Review published";
    case "hide":
      return "Review hidden";
    case "reject":
      return "Review rejected";
    case "respond":
      return "Staff response updated";
    case "withdrawn":
      return "Review withdrawn";
    default:
      return "Review updated";
  }
}
