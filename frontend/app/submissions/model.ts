import { z } from "zod";
import { answersSchema, releaseSchema } from "../catalog/model";

export const stateSchema = z.enum([
  "draft",
  "submitted",
  "needs_information",
  "approved_pending_terms",
  "accepted",
  "rejected",
  "withdrawn",
]);
export const summarySchema = z.object({
  id: z.string(),
  version: z.number().int(),
  title: z.string(),
  game: z.string(),
  state: stateSchema,
  created_at: z.string(),
  updated_at: z.string(),
});
export const listingSchema = z.object({
  items: z.array(summarySchema),
  next: z.string(),
});
export const submissionSchema = z.object({
  submission: summarySchema,
  offer: releaseSchema,
  answers: answersSchema,
  ownership_notes: z.string(),
  ownership_declared: z.boolean(),
  note: z.string(),
  conversation_id: z.string(),
});
export const historySchema = z.object({
  events: z.array(
    z.object({
      version: z.number().int(),
      action: z.string(),
      state: stateSchema,
      message: z.string(),
      actor_role: z.string(),
      created_at: z.string(),
    }),
  ),
});
export type Submission = z.infer<typeof submissionSchema>;
export function stateLabel(state: z.infer<typeof stateSchema>) {
  switch (state) {
    case "draft":
      return "Private draft";
    case "submitted":
      return "Awaiting review";
    case "needs_information":
      return "More information requested";
    case "approved_pending_terms":
      return "Review approved · commercial terms pending";
    case "accepted":
      return "Seller agreement accepted";
    case "rejected":
      return "Rejected";
    case "withdrawn":
      return "Withdrawn";
  }
}

export function actionLabel(action: string) {
  switch (action) {
    case "created":
      return "Draft created";
    case "edited":
      return "Information saved";
    case "submit":
      return "Submitted for review";
    case "clarify":
      return "More information requested";
    case "approve_review":
      return "Review approved pending terms";
    case "reject":
      return "Submission rejected";
    case "withdraw":
      return "Submission withdrawn";
    default:
      return "Submission updated";
  }
}
