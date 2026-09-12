import { z } from "../validation";
import { answerSchema, answersSchema } from "../catalog/model";
export const forecastSchema = z.object({
  calculated_at: z.string(),
  rule: z.string(),
  zone: z.string(),
  start_earliest: z.string(),
  start_latest: z.string(),
  finish_earliest: z.string(),
  finish_latest: z.string(),
});
export const forecastPreviewSchema = z.object({
  status: z.enum(["ready", "needs_review"]),
  reason: z.string(),
  basis: z.string(),
  forecast: forecastSchema.nullable(),
});
export type Forecast = z.infer<typeof forecastSchema>;
export const workSchema = z.object({
  coordination_id: z.string(),
  coordination_shared: z.boolean(),
  order_id: z.string(),
  order_version: z.number().int(),
  access_version: z.number().int(),
  version: z.number().int(),
  game: z.string(),
  service: z.string(),
  state: z.string(),
  mode: z.enum(["account", "together"]),
  secret_hours: z.number().int(),
  assigned_id: z.string().optional(),
  alias: z.string(),
  progress: z.number().int(),
  completion_pending: z.boolean(),
  note: z.string(),
  estimated_start: z.string().nullable(),
  estimated_finish: z.string().nullable(),
  forecast: forecastSchema.optional(),
  forecast_review: z.boolean(),
  handoff: answersSchema.optional(),
  shared: z.array(
    z.object({ key: z.string(), label: z.string(), value: answerSchema }),
  ),
  updated_at: z.string(),
});
export type Work = z.infer<typeof workSchema>;
export const listingSchema = z.object({
  items: z.array(workSchema),
  next: z.string(),
});
export const staffSchema = z.object({
  staff: z.array(
    z.object({ id: z.string(), alias: z.string(), role: z.string() }),
  ),
});
export const secretSchema = z.object({
  version: z.number().int(),
  state: z.string(),
  expires_at: z.string().nullable(),
});
export const revealSchema = z.object({ value: z.string() });
export const active = (work: Work) =>
  ["queued", "in_progress", "on_hold"].includes(work.state);
