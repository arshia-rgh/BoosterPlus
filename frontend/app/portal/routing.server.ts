import type { PortalRouting } from "./routing";

export function routingContext(request: Request): PortalRouting | null {
  const admin = process.env.ADMIN_PUBLIC_ORIGIN;
  const booster = process.env.BOOSTER_PUBLIC_ORIGIN;
  if (!admin && !booster) return null;
  const customer = process.env.PUBLIC_ORIGIN;
  const portal = request.headers.get("X-Playora-Frontend-Portal");
  if (
    !customer ||
    !admin ||
    !booster ||
    !["customer", "admin", "booster"].includes(portal ?? "")
  )
    throw new Error("Portal routing context is unavailable");
  // The Node entrypoint validates the three configured origins and overwrites
  // this header after exact host routing. None of these values are credentials.
  return {
    portal: portal as PortalRouting["portal"],
    origins: { customer, admin, booster },
  };
}

/** Anonymous SSR reads use the configured storefront authority, without user cookies. */
export function publicAPIHeaders(): Record<string, string> {
  if (!process.env.ADMIN_PUBLIC_ORIGIN && !process.env.BOOSTER_PUBLIC_ORIGIN)
    return {};
  const origin = process.env.PUBLIC_ORIGIN;
  const key = process.env.PROXY_SHARED_KEY;
  if (!origin || !key || key.length < 32)
    throw new Error("Public API authority is unavailable");
  return { "X-Booster-Proxy-Key": key, "X-Playora-Request-Origin": origin };
}
