// Public origins are trusted operator configuration, never derived from a
// forwarding header, request parameter or browser-selected API authority.
export function portalOrigins(env) {
  const admin = env.ADMIN_PUBLIC_ORIGIN ?? "";
  const booster = env.BOOSTER_PUBLIC_ORIGIN ?? "";
  if (!admin && !booster) return null;
  const values = {
    customer: env.PUBLIC_ORIGIN ?? "",
    admin,
    booster,
  };
  const local = ["development", "test"].includes(env.APP_ENV ?? "development");
  for (const value of Object.values(values)) {
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error("Configure all three exact portal origins");
    }
    const loopback =
      url.hostname === "localhost" ||
      url.hostname.endsWith(".localhost") ||
      /^127\.[0-9]+\.[0-9]+\.[0-9]+$/.test(url.hostname) ||
      url.hostname === "[::1]";
    if (
      value !== url.origin ||
      url.username ||
      url.password ||
      (url.protocol !== "https:" &&
        !(local && loopback && url.protocol === "http:"))
    )
      throw new Error("Portal origins must be exact HTTPS origins");
  }
  if (new Set(Object.values(values)).size !== 3)
    throw new Error("Portal origins must be distinct");
  // Host-only cookies cannot separate two services distinguished only by port.
  if (
    new Set(Object.values(values).map((value) => new URL(value).hostname))
      .size !== 3
  )
    throw new Error("Portal origins must use distinct hostnames");
  return Object.freeze(values);
}

export function portalForHost(host, origins, application) {
  if (typeof host !== "string" || !host || /[\s,\\/@]/.test(host)) return null;
  const portal = Object.entries(origins).find(
    ([, origin]) => new URL(origin).host === host.toLowerCase(),
  )?.[0];
  if (
    !portal ||
    (application === "admin" && portal !== "admin") ||
    (application === "storefront" && portal === "admin") ||
    (application === "booster" && portal !== "booster")
  )
    return null;
  return portal;
}

const stateKeys = new Set([
  "section",
  "view",
  "game",
  "state",
  "after",
  "search",
  "kind",
  "customer",
  "assignment",
  "status",
  "from",
  "to",
  "before",
]);

export function legacyPortalTarget(rawURL, currentPortal, origins) {
  const path = rawURL.split("?", 1)[0];
  const ambiguous = /\\|(?:^|\/)\.{1,2}(?:\/|$)|\/\//;
  if (ambiguous.test(path)) return { status: 409 };
  // React Router decodes path segments. Reject encoded staff aliases before
  // they could render the old staff route graph on the customer host.
  if (path.includes("%")) {
    try {
      const decoded = decodeURIComponent(path);
      if (
        ambiguous.test(decoded) ||
        /^\/(admin|booster)(?=\/|$|\.data$)/.test(decoded)
      )
        return { status: 409 };
    } catch {
      return { status: 409 };
    }
  }
  // Build assets deliberately retain their namespace on the new host.
  if (/^\/(?:admin|booster)\/assets(?:\/|$)/.test(path)) return null;
  const match = /^\/(admin|booster)(?=\/|$|\.data$)/.exec(path);
  if (!match) return null;
  // Never move framework data fetches or ambiguous encoded paths across hosts.
  if (path.endsWith(".data") || /[%\\]|(?:^|\/)\.{1,2}(?:\/|$)|\/\//.test(path))
    return { status: 409 };
  const portal = match[1];
  if (currentPortal !== "customer" && portal !== currentPortal)
    return { status: 404 };
  const clean = path.slice(portal.length + 1) || "/";
  const query = rawURL.includes("?")
    ? rawURL.slice(rawURL.indexOf("?") + 1)
    : "";
  const input = new URLSearchParams(query);
  const params = new URLSearchParams();
  for (const [key, value] of input) {
    if (
      stateKeys.has(key) &&
      value.length <= 256 &&
      !/[\u0000-\u001f\u007f]/.test(value)
    )
      params.set(key, value);
    if (
      key === "returnTo" &&
      value.length <= 2048 &&
      new RegExp(`^/${portal}(?:/|$)`).test(value) &&
      !/[%\\?#\u0000-\u0020]|(?:^|\/)\.{1,2}(?:\/|$)|\/\//.test(value)
    )
      params.set(key, value);
  }
  const safeQuery = params.toString();
  return {
    status: 302,
    location: origins[portal] + clean + (safeQuery ? "?" + safeQuery : ""),
  };
}
