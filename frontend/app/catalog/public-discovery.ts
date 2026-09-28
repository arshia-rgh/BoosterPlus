import { z } from "../validation";
import { capabilitySchema } from "./discovery-model";
import type { Release } from "./model";

export const serviceNames = {
  boost: "Boosting",
  accounts: "Accounts",
  shop: "Shop",
  news: "News",
} as const;
export type ServiceKind = keyof typeof serviceNames;
export function serviceLabel(kind: ServiceKind) {
  // eslint-disable-next-line security/detect-object-injection -- Only the closed ServiceKind union can index this static label map.
  return serviceNames[kind];
}
export const metricSchema = z.object({
  key: z.string(),
  label: z.string(),
  definition: z.string(),
  state: z.enum([
    "available",
    "insufficient_sample",
    "unconfigured",
    "unavailable",
    "stale",
  ]),
  value: z.number().int().nonnegative().optional(),
  sample_size: z.number().int().nonnegative().optional(),
  period_start: z.string().optional(),
  period_end: z.string(),
  refreshed_at: z.string(),
  stale_at: z.string().optional(),
});
export const metricsSchema = z.object({
  metrics: z.array(metricSchema).max(12),
});
export type PublicMetric = z.infer<typeof metricSchema>;
export const promotionViewSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  service: z.enum(["boost", "accounts"]),
  target: z.enum(["package", "account"]),
  package: z.string().optional(),
  variant: z.string().optional(),
  listing_id: z.string().optional(),
  release_id: z.string(),
  currency: z.string(),
  amount_minor: z.string(),
  original_minor: z.string().optional(),
  coupon_code: z.string().optional(),
  coupon_version: z.number().int().optional(),
  starts_at: z.string(),
  ends_at: z.string(),
  priority: z.number().int(),
  remaining: z.number().int().nonnegative().optional(),
  indicative: z.boolean(),
});
export const discoveryViewSchema = z.object({
  game_id: z.string(),
  release_id: z.string(),
  capabilities: z.array(capabilitySchema).length(4),
  promotions: z.array(promotionViewSchema).max(12),
  metrics: z.array(metricSchema).max(12),
});
export type DiscoveryView = z.infer<typeof discoveryViewSchema>;
export function capabilitiesFor(release: Release) {
  return (Object.keys(serviceNames) as ServiceKind[]).map((service) => {
    const policy = release.configuration.discovery?.capabilities.find(
      (p) => p.service === service,
    ) ?? {
      service,
      state:
        !release.configuration.discovery &&
        ((service === "boost" &&
          (release.configuration.services.length > 0 ||
            release.configuration.packages.length > 0)) ||
          service === "accounts")
          ? ("active" as const)
          : ("off" as const),
      description: "",
      reason: "",
    };
    // A configured future service cannot become an entry point before its routes exist.
    if (service === "news") return { ...policy, state: "off" as const };
    return release.paused && policy.state !== "off"
      ? {
          ...policy,
          state: "paused" as const,
          reason: "Services for this game are temporarily unavailable.",
        }
      : policy;
  });
}
export function serviceAvailable(release: Release, kind: ServiceKind) {
  return capabilitiesFor(release).some(
    (policy) => policy.service === kind && policy.state === "active",
  );
}
export function selectedService(
  pathname: string,
  params: URLSearchParams,
): ServiceKind | null {
  if (pathname.includes("/services/") || pathname.includes("/packages/"))
    return "boost";
  if (/\/games\/[^/]+\/accounts(?:\/|$)/.test(pathname)) return "accounts";
  if (/\/games\/[^/]+\/shop(?:\/|$)/.test(pathname)) return "shop";
  const value = params.get("service");
  if (
    value === "boost" ||
    value === "accounts" ||
    value === "shop" ||
    value === "news"
  )
    return value;
  return params.get("path") === "custom" || params.get("path") === "packages"
    ? "boost"
    : null;
}
