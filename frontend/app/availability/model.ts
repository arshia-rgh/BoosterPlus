import { z } from "zod";
export const consentVersion = "availability-v1";
export const subscriptionSchema = z.object({
  id: z.string(),
  version: z.number().int(),
  state: z.enum(["active", "unsubscribed", "suppressed"]),
  slug: z.string(),
  package: z.string(),
  variant: z.string(),
  label: z.string(),
  available: z.boolean(),
  updated_at: z.string(),
});
export type Subscription = z.infer<typeof subscriptionSchema>;
export const listingSchema = z.object({
  subscriptions: z.array(subscriptionSchema),
  next: z.string(),
});
export const linkSchema = z.object({ current: z.boolean() });
export const linkInputSchema = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().min(1).max(2147483645),
  token: z.string().regex(/^[a-f0-9]{64}$/),
});
export function parseLink(fragment: string) {
  const [id, version, token, ...extra] = fragment.replace(/^#/, "").split("/");
  if (extra.length > 0) return null;
  const parsed = linkInputSchema.safeParse({ id, version, token });
  return parsed.success ? parsed.data : null;
}
export function destination(
  item: Pick<Subscription, "slug" | "package" | "variant">,
) {
  return `/games/${encodeURIComponent(item.slug)}/packages/${encodeURIComponent(item.package)}?variant=${encodeURIComponent(item.variant)}`;
}
