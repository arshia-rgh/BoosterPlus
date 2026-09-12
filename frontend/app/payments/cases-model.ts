import { z } from "zod";
import { remedySchema } from "./model";
import { productSchema } from "../resale/model";
export const caseSchema = z.object({
  account_terms: productSchema.nullable().optional(),
  id: z.string(),
  order_id: z.string(),
  kind: z.string(),
  state: z.string(),
  outcome: z.string(),
  version: z.number().int(),
  appeals: z.number().int(),
  appeal_until: z.string().nullable(),
  policy: remedySchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export const caseListSchema = z.object({ cases: z.array(caseSchema) });
export const caseQueueSchema = caseListSchema.extend({ next: z.string() });
export const caseDetailSchema = z.object({
  case: caseSchema,
  next: z.number().int(),
  events: z.array(
    z.object({
      id: z.string(),
      version: z.number().int(),
      action: z.string(),
      role: z.string(),
      note: z.string(),
      message_id: z.string(),
      created_at: z.string(),
    }),
  ),
});
export const transferSchema = z.object({
  id: z.string(),
  case_id: z.string(),
  receipt_id: z.string(),
  order_id: z.string(),
  kind: z.string(),
  currency: z.string(),
  network: z.string(),
  amount: z.string(),
  terms: z.string(),
  state: z.string(),
  issue: z.string(),
  version: z.number().int(),
  recipient: z.object({ address: z.string(), memo: z.string() }),
  recipient_at: z.string().nullable(),
  approved_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export const transfersSchema = z.object({ transfers: z.array(transferSchema) });
export type Transfer = z.infer<typeof transferSchema>;

export const outgoingQueueSchema = z.object({
  enabled: z.boolean(),
  next: z.string(),
  records: z.array(
    z.object({
      id: z.string(),
      payment_id: z.string(),
      attempt_id: z.string(),
      state: z.string(),
      issue: z.string(),
      checked_at: z.string(),
    }),
  ),
});
