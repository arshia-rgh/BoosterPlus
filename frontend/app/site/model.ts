import { z } from "../validation";
export const contentSchema = z.object({
  kind: z.string(),
  version: z.number().int(),
  release_id: z.string(),
  label: z.string(),
  data: z.record(z.string(), z.unknown()),
  updated_at: z.string(),
});
export type Content = z.infer<typeof contentSchema>;
export const homeSchema = z.object({
  headline: z.string(),
  accent: z.string(),
  description: z.string(),
  notice: z.string(),
  start_rank: z.string(),
  end_rank: z.string(),
  scene_description: z.string(),
  artwork: z.enum(["ascension", "none"]),
  show_scene: z.boolean(),
  show_pathways: z.boolean(),
  show_steps: z.boolean(),
  contact_email: z.string(),
  support_hours: z.string(),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })).max(20),
  featured: z.array(z.object({ label: z.string(), href: z.string() })).max(8),
});
export type HomeContent = z.infer<typeof homeSchema>;
export { defaultHome } from "./content";
export const retentionSchema = z.object({
  enabled: z.boolean(),
  financial_days: z.number().int().min(0).max(36500),
  dispute_days: z.number().int().min(0).max(36500),
  audit_days: z.number().int().min(0).max(36500),
  support_days: z.number().int().min(0).max(36500),
  grace_days: z.number().int().min(0).max(36500),
  policy_text: z.string(),
  backup_policy: z.string(),
  preserve_evidence: z.literal(true),
});
