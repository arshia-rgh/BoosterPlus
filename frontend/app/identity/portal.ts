/** Portal names are routing context; the server decides membership and authority. */
export type Portal = "customer" | "booster" | "admin";
export function portalFromPath(path: string): Portal {
  if (/^\/admin(?:\/|$)/.test(path)) return "admin";
  if (/^\/booster(?:\/|$)/.test(path)) return "booster";
  return "customer";
}
export function portalHome(portal: Portal): string {
  return portal === "customer" ? "/account" : `/${portal}`;
}
export function portalLogin(portal: Portal): string {
  return portal === "customer" ? "/login" : `/${portal}/login`;
}
export function portalSecurity(portal: Portal): string {
  return portal === "customer"
    ? "/account/security"
    : `/${portal}/account/security`;
}
export function authPath(portal: Portal, action: string): string {
  return `/auth/portals/${portal}/${action}`;
}

// Exact bounded navigation shape, never an arbitrary origin, raw credential or
// third-party path. Query values carry only public selection/local section state.
const id = "[a-zA-Z0-9_-]{1,128}";
const customerRoutes = new RegExp(
  `^/(?:account(?:/(?:settings|security|preferences))?|accounts(?:/${id})?|orders(?:/${id})?|games(?:/${id}(?:/(?:services|packages)/${id}|/reviews|/(?:boost|accounts|shop|news)(?:/${id})?)?)?|support(?:/${id})?|sell(?:/${id})?|privacy|favorites|availability|notifications|reviews(?:/${id})?)$`,
);
const adminRoutes = new RegExp(
  `^/admin(?:/(?:account(?:/(?:settings|security|preferences))?|customers(?:/${id})?|media|alerts|content|privacy|accounts(?:/${id})?|finance|reports|jobs|reviews(?:/${id})?|catalog(?:/${id})?|shop(?:/${id})?|news(?:/${id})?|coupons|submissions(?:/${id})?|orders(?:/${id})?|support(?:/${id})?|calendar))?$`,
);
const boosterRoutes = new RegExp(
  `^/booster(?:/(?:account(?:/(?:settings|security|preferences))?|orders(?:/${id})?|support/${id}|calendar))?$`,
);
export function portalReturn(
  value: string | null,
  portal: Portal,
): string | null {
  if (
    !value ||
    value.length > 2048 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value)
  )
    return null;
  // Reject encoded path aliases/traversal, instead of accepting URL normalization.
  const path = value.split(/[?#]/, 1)[0] ?? "";
  if (/%|(?:^|\/)\.{1,2}(?:\/|$)/.test(path)) return null;
  try {
    const url = new URL(value, "https://playora.invalid");
    if (url.origin !== "https://playora.invalid" || url.pathname !== path)
      return null;
    const routes =
      portal === "admin"
        ? adminRoutes
        : portal === "booster"
          ? boosterRoutes
          : customerRoutes;
    if (
      !(portal === "customer" && (path === "/" || path === "/terms")) &&
      !routes.test(path)
    )
      return null;
    const params = new URLSearchParams();
    const section = url.searchParams.get("section");
    if (
      /\/orders\/[^/]+$/.test(path) &&
      section &&
      (portal === "admin"
        ? /^(overview|request|quote|fulfillment|messages|payment|history)$/
        : portal === "booster"
          ? /^(overview|progress|messages|sessions|access)$/
          : /^(overview|messages|progress|delivery|payment|help)$/
      ).test(section)
    )
      params.set("section", section);
    if (
      section &&
      /^(overview|details|messages|agreement|handover|payout|activity)$/.test(
        section,
      ) &&
      ((portal === "customer" && /^\/sell\/[^/]+$/.test(path)) ||
        (portal === "admin" && /^\/admin\/submissions\/[^/]+$/.test(path)))
    )
      params.set("section", section);
    const channel = url.searchParams.get("channel");
    if (
      (portal === "customer" || portal === "admin") &&
      /^\/(?:admin\/)?orders\/[^/]+$/.test(path) &&
      params.get("section") === "messages" &&
      (channel === "support" || channel === "coordination")
    )
      params.set("channel", channel);
    const variant = url.searchParams.get("variant");
    if (
      /^\/games\/[^/]+\/(packages|shop)\/[^/]+$/.test(path) &&
      variant &&
      /^[a-zA-Z0-9_-]{1,64}$/.test(variant)
    )
      params.set("variant", variant);
    const quantity = url.searchParams.get("quantity");
    if (
      portal === "customer" &&
      /^\/games\/[^/]+\/shop\/[^/]+$/.test(path) &&
      quantity &&
      /^(?:[1-9][0-9]?|100)$/.test(quantity)
    )
      params.set("quantity", quantity);

    if (
      portal === "customer" &&
      /^\/games\/[^/]+\/(services|packages)\/[^/]+$/.test(path)
    ) {
      const coupon = url.searchParams.get("coupon");
      if (coupon && /^[a-zA-Z0-9_-]{1,40}$/.test(coupon))
        params.set("coupon", coupon);
      if (
        path.includes("/services/") &&
        url.searchParams.get("step") === "review"
      )
        params.set("step", "review");
      const request = url.searchParams.get("request");
      if (
        request &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
          request,
        )
      )
        params.set("request", request);
    }
    if (
      portal === "admin" &&
      path === "/admin" &&
      url.searchParams.get("view") === "audit"
    )
      params.set("view", "audit");
    if (portal === "admin" && path === "/admin/catalog") {
      const game = url.searchParams.get("game");
      if (
        game &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          game,
        )
      ) {
        params.set("game", game);
        if (
          section &&
          /^catalog-(basics|intake|services|pricing|packages|faq|discovery|offers|publish)$/.test(
            section,
          )
        )
          params.set("section", section);
      }
    }
    if (portal === "admin" && path === "/admin/content") {
      const kind = url.searchParams.get("kind");
      if (kind && /^(home|notifications|legal|retention)$/.test(kind))
        params.set("kind", kind);
      if (section && /^(editor|preview|history)$/.test(section))
        params.set("section", section);
    }
    if (portal === "admin" && path === "/admin/finance") {
      const view = url.searchParams.get("view");
      if (view && /^(payments|cases|payouts|policy|reconcile)$/.test(view))
        params.set("view", view);
    }
    if (
      portal === "admin" &&
      /^\/admin\/shop\/[^/]+$/.test(path) &&
      section &&
      /^(basics|variants|recipient|terms|stock|promotion|publication|history)$/.test(
        section,
      )
    )
      params.set("section", section);
    if (
      portal === "admin" &&
      /^\/admin\/news\/[^/]+$/.test(path) &&
      section &&
      /^(editor|preview|publication|history)$/.test(section)
    )
      params.set("section", section);
    if (
      portal === "admin" &&
      /^\/admin\/accounts\/[^/]+$/.test(path) &&
      section &&
      /^(details|images|terms|publication)$/.test(section)
    )
      params.set("section", section);
    if (
      portal === "customer" &&
      (/^\/accounts\/[^/]+$/.test(path) ||
        /^\/games\/[^/]+\/accounts\/[^/]+$/.test(path))
    ) {
      if (url.searchParams.get("step") === "review")
        params.set("step", "review");
      const reference = url.searchParams.get("request");
      if (
        reference &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
          reference,
        )
      )
        params.set("request", reference);
    }
    if (portal === "customer" && path === "/support") {
      const listing = url.searchParams.get("listing");
      if (
        listing &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          listing,
        )
      )
        params.set("listing", listing);
    }
    if (portal === "customer" && path === "/sell/new") {
      const slug = url.searchParams.get("slug");
      if (slug && /^[a-z][a-z0-9-]{0,79}$/.test(slug)) params.set("slug", slug);
    }
    const query = params.toString();
    return path + (query ? `?${query}` : "");
  } catch {
    return null;
  }
}

export function activePortal(): Portal {
  return typeof window === "undefined"
    ? "customer"
    : portalFromPath(window.location.pathname);
}
export const sessionEvent = "boosterplus:session-changed";
export function notifySession(portal: Portal) {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent(sessionEvent, { detail: { portal } }));
}
export function sessionEventMatches(event: Event, portal: Portal): boolean {
  if (!(event instanceof CustomEvent)) return false;
  const detail: unknown = event.detail;
  return (
    typeof detail === "object" &&
    detail !== null &&
    "portal" in detail &&
    detail.portal === portal
  );
}
// Only shared endpoints accept a selectable audience. Fixed business routes and
// auth aliases retain their declared audience; the server rejects mismatches.
export function portalHeaders(
  path: string,
  portal: Portal,
): Record<string, string> {
  const route = path.split("?", 1)[0] ?? "";
  if (
    /^\/(?:auth|admin|booster)(?:\/|$)/.test(route) ||
    /^\/portal\/(?:admin|booster)$/.test(route) ||
    ["/me", "/me/profile", "/me/sessions", "/me/google/unlink"].includes(
      route,
    ) ||
    /^\/(?:me\/notifications|media|conversations)(?:\/|$)/.test(route)
  )
    return { "X-Playora-Portal": portal };
  return {};
}
export function portalAPIPath(path: string, portal: Portal): string {
  return path.startsWith("/auth/") && !path.startsWith("/auth/portals/")
    ? authPath(portal, path.slice(6))
    : path;
}
export function streamURL(base: string, after: number, portal: Portal): string {
  const params = new URLSearchParams({ after: String(after) });
  if (!base.startsWith("/admin/")) params.set("portal", portal);
  return "/api/v1" + base + "/stream?" + params.toString();
}
