import { z } from "../validation";
import { summarySchema } from "../orders/model";

export const overviewSchema = z.object({
  progress: z
    .array(
      z.object({
        order_id: z.string(),
        reported_percent: z.number().int().min(0).max(100),
        updated_at: z.string(),
      }),
    )
    .default([]),
  attention: z.array(summarySchema),
  active: z.array(summarySchema),
  upcoming: z.array(
    z.object({
      id: z.string(),
      order_id: z.string(),
      state: z.enum(["proposed", "confirmed"]),
      starts_at: z.string(),
      ends_at: z.string(),
      timezone: z.string(),
    }),
  ),
  messages: z.array(
    z.object({
      id: z.string(),
      subject: z.string(),
      unread: z.number().int().positive(),
    }),
  ),
  more_messages: z.boolean(),
  more_attention: z.boolean(),
  more_active: z.boolean(),
  more_upcoming: z.boolean(),
});
