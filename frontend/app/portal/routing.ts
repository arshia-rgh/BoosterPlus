import type { To } from "react-router";
import { portalFromPath, type Portal } from "../identity/portal";

/** Public routing context supplied by the validated frontend host, never a role grant. */
export interface PortalRouting {
  portal: Portal;
  origins: Record<Portal, string>;
}

export function canonicalPath(
  path: string,
  routing: PortalRouting | null,
): string {
  if (!routing || routing.portal === "customer") return path;
  const prefix = `/${routing.portal}`;
  if (path === prefix || path.startsWith(`${prefix}/`)) return path;
  return prefix + (path === "/" ? "" : path);
}

/** Components retain canonical paths; only the navigation boundary emits public URLs. */
export function portalDestination(to: To, routing: PortalRouting | null): To {
  if (!routing) return to;
  const path = typeof to === "string" ? to : (to.pathname ?? "");
  if (!path.startsWith("/") || path.startsWith("//")) return to;
  const pathOnly = path.split(/[?#]/, 1)[0] ?? "";
  // Download/reveal endpoints retain this host's session and trusted proxy.
  // API namespaces describe authority, not browser workspace route prefixes.
  if (pathOnly === "/api" || pathOnly.startsWith("/api/")) return to;
  const portal = portalFromPath(pathOnly);
  const prefix = portal === "customer" ? "" : `/${portal}`;
  const pathname = path.slice(prefix.length) || "/";
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const origin =
    portal === "customer"
      ? routing.origins.customer
      : portal === "admin"
        ? routing.origins.admin
        : routing.origins.booster;
  const destination =
    portal === routing.portal ? normalized : origin + normalized;
  if (typeof to === "string") return destination;
  if (portal !== routing.portal)
    return (
      destination +
      (to.search ? `?${to.search.replace(/^\?/, "")}` : "") +
      (to.hash ? `#${to.hash.replace(/^#/, "")}` : "")
    );
  return { ...to, pathname: destination };
}

export function externalDestination(to: To): to is string {
  return (
    typeof to === "string" &&
    (to.startsWith("https://") ||
      to.startsWith("http://") ||
      to.startsWith("//"))
  );
}
