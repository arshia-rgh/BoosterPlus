import { randomBytes } from "node:crypto";
import http from "node:http";
import https from "node:https";
import express from "express";
import { createRequestHandler } from "@react-router/express";
import {
  portalOrigins,
  portalForHost,
  legacyPortalTarget,
} from "./portal-hosts.mjs";

const environment = process.env.APP_ENV ?? "development";
if (!["development", "test", "staging", "production"].includes(environment))
  throw new Error("Invalid APP_ENV");
if (["staging", "production"].includes(environment)) {
  if (
    !process.env.ACCOUNT_TERMS_TEXT?.trim() ||
    !process.env.TERMS_VERSION ||
    process.env.TERMS_VERSION.startsWith("development-") ||
    (process.env.PROXY_SHARED_KEY?.length ?? 0) < 32 ||
    !process.env.API_ORIGIN
  )
    throw new Error(
      "Configure approved terms, API origin, and proxy secret before public deployment",
    );
}
const application = process.env.FRONTEND_APP ?? "both";
if (!["both", "storefront", "admin", "booster"].includes(application))
  throw new Error("Invalid FRONTEND_APP");
const origins = portalOrigins(process.env);
if (origins && application === "both" && environment === "production")
  throw new Error("Production portal hosts require an explicit application");
const app = express();
app.disable("x-powered-by");
// Trust only explicitly configured gateway addresses, never arbitrary forwarding headers.
if (process.env.TRUST_PROXY_CIDRS)
  app.set("trust proxy", process.env.TRUST_PROXY_CIDRS.split(","));
const api = new URL(process.env.API_ORIGIN ?? "http://127.0.0.1:8080");
if (
  !["http:", "https:"].includes(api.protocol) ||
  api.username ||
  api.password ||
  api.pathname !== "/" ||
  api.search ||
  api.hash
)
  throw new Error("API_ORIGIN must be a trusted HTTP origin");
const proxyKey = process.env.PROXY_SHARED_KEY ?? "";
if (["staging", "production"].includes(environment)) {
  const startupPortal =
    application === "admin"
      ? "admin"
      : application === "booster"
        ? "booster"
        : "customer";
  const startupHeaders = origins
    ? {
        "X-Booster-Proxy-Key": proxyKey,
        "X-Playora-Request-Origin": origins[startupPortal],
        "X-Playora-Portal": startupPortal,
      }
    : {};
  const response = await fetch(
    new URL(
      origins
        ? `/api/v1/auth/portals/${startupPortal}/session`
        : "/api/v1/auth/session",
      api,
    ),
    {
      headers: startupHeaders,
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok)
    throw new Error("Identity backend is unavailable at startup");
  const session = await response.json();
  if (session.terms_version !== process.env.TERMS_VERSION) {
    const policyResponse = await fetch(new URL("/api/v1/site/legal", api), {
      // Public reads have no staff portal selector. They carry only the
      // authenticated proxy authority and this server's validated origin.
      headers: origins
        ? {
            "X-Booster-Proxy-Key": proxyKey,
            "X-Playora-Request-Origin": origins[startupPortal],
          }
        : {},
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    if (!policyResponse.ok)
      throw new Error("Published legal terms are unavailable");
    const policy = await policyResponse.json();
    if (
      !policy.release_id ||
      policy.kind !== "legal" ||
      policy.label !== session.terms_version ||
      typeof policy.data?.text !== "string" ||
      !policy.data.text.trim()
    )
      throw new Error("Frontend and backend account terms versions must match");
  }
}

app.use((req, res, next) => {
  const nonce = randomBytes(24).toString("base64");
  req.headers["x-csp-nonce"] = nonce;
  res.set({
    "Content-Security-Policy": `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  });
  // Discovery pages may be indexed. Every workspace, identity/API endpoint and
  // unknown path is excluded; this is crawl guidance, never authorization.
  const publicPath =
    /^\/(?:$|games(?:\/|$)|accounts(?:\/|$)|terms$|policies\/|how-it-works$|sitemap\.xml$|robots\.txt$)/.test(
      req.path,
    );
  if (!publicPath || req.path.startsWith("/availability/unsubscribe"))
    res.set("X-Robots-Tag", "noindex, nofollow");
  if (req.secure)
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});
app.use((req, res, next) => {
  // The SSR routing context is internal. A client cannot choose a portal through
  // this header, and forwarded host headers never select the application.
  delete req.headers["x-playora-frontend-portal"];
  if (req.path === "/healthz" && ["GET", "HEAD"].includes(req.method))
    return res.status(200).type("text/plain").send("OK");
  if (!origins) return next();
  const portal = portalForHost(req.headers.host, origins, application);
  if (!portal)
    return res.status(421).type("text/plain").send("Unknown portal host");
  req.headers["x-playora-frontend-portal"] = portal;
  if (portal !== "customer") res.set("X-Robots-Tag", "noindex, nofollow");
  const target = legacyPortalTarget(req.originalUrl, portal, origins);
  if (target) {
    if (!["GET", "HEAD"].includes(req.method))
      return res
        .status(405)
        .set("Allow", "GET, HEAD")
        .type("text/plain")
        .send("Open the new portal address");
    if (target.location) return res.redirect(target.status, target.location);
    return res
      .status(target.status)
      .type("text/plain")
      .send("Reload the portal at its new address");
  }
  next();
});
app.use("/api", (req, res) => {
  if (proxyKey.length < 32)
    return res.status(503).json({ code: "unavailable" });
  const nexusCallback =
    /^\/v1\/webhooks\/suppliers\/nexus-(sandbox|production)$/.test(req.path);
  if (nexusCallback) {
    if (
      ["admin", "booster"].includes(application) ||
      (origins && req.headers["x-playora-frontend-portal"] !== "customer")
    )
      return res.status(403).json({ code: "forbidden" });
    if (req.method !== "POST")
      return res.status(405).set("Allow", "POST").end();
    // Do not merge duplicate signatures into one apparently valid credential.
    const signatures = req.rawHeaders.filter(
      (value, index) => index % 2 === 0 && value.toLowerCase() === "sign",
    );
    if (signatures.length !== 1)
      return res.status(403).json({ code: "forbidden" });
    if (Number(req.headers["content-length"]) > 262144)
      return res.status(413).end();
  }
  const headers = {};
  const forwardedHeaders = nexusCallback
    ? ["accept", "content-type", "content-encoding", "sign"]
    : [
        "accept",
        "content-type",
        "cookie",
        "origin",
        "sec-fetch-site",
        "x-csrf-token",
        "x-playora-portal",
        "last-event-id",
        "if-none-match",
        "x-nowpayments-sig",
      ];
  for (const name of forwardedHeaders) {
    if (req.headers[name]) headers[name] = req.headers[name];
  }
  headers["x-booster-proxy-key"] = proxyKey;
  if (origins) {
    const portal = req.headers["x-playora-frontend-portal"];
    headers["x-playora-request-origin"] = origins[portal];
  }
  headers["x-booster-client-ip"] = req.ip;
  // Authority and headers are selected by the server. The request path cannot replace API_ORIGIN.
  const upstream = (api.protocol === "https:" ? https : http).request(
    {
      hostname: api.hostname,
      port: api.port,
      protocol: api.protocol,
      method: req.method,
      path: "/api" + req.url,
      headers,
      timeout:
        req.method === "PUT" &&
        /^\/v1\/admin\/artwork\/[a-f0-9-]{36}\/bytes$/.test(req.path)
          ? 65000
          : 12000,
    },
    (response) => {
      res.status(response.statusCode ?? 502);
      for (const name of [
        "content-type",
        "content-disposition",
        "etag",
        "set-cookie",
        "location",
        "retry-after",
        "cache-control",
        "vary",
        "x-request-id",
      ]) {
        if (response.headers[name]) res.setHeader(name, response.headers[name]);
      }
      response.on("error", () => res.destroy());
      response.pipe(res);
    },
  );
  upstream.on("timeout", () => upstream.destroy());
  upstream.on("error", () => {
    if (!res.headersSent) res.status(502).json({ code: "unavailable" });
    else res.destroy();
  });
  let bytes = 0;
  req.on("data", (chunk) => {
    bytes += chunk.length;
    if (
      bytes >
      (req.method === "PUT" &&
      (req.path.startsWith("/v1/media/") ||
        req.path.startsWith("/v1/admin/media/") ||
        req.path.startsWith("/v1/admin/artwork/")) &&
      req.path.endsWith("/bytes")
        ? 4194304
        : req.path.startsWith("/v1/media") ||
            req.path.startsWith("/v1/admin/media")
          ? 16384
          : req.path === "/v1/admin/finance/policy" ||
              nexusCallback ||
              req.path === "/v1/webhooks/payments/nowpayments" ||
              req.path.startsWith("/v1/conversations") ||
              req.path.startsWith("/v1/admin/conversations") ||
              req.path.startsWith("/v1/orders") ||
              req.path.startsWith("/v1/admin/orders") ||
              req.path.startsWith("/v1/admin/site/") ||
              req.path.startsWith("/v1/admin/news") ||
              req.path.startsWith("/v1/admin/shop") ||
              req.path.startsWith("/v1/shop/") ||
              req.path.startsWith("/v1/admin/catalog/") ||
              req.path.startsWith("/v1/catalog/")
            ? 262144
            : 16384)
    ) {
      upstream.destroy();
      if (!res.headersSent) res.status(413).end();
      req.destroy();
    }
  });
  req.on("aborted", () => upstream.destroy());
  req.pipe(upstream);
});
const staticOptions = {
  setHeaders(res) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  },
  immutable: true,
  maxAge: "1y",
  index: false,
  dotfiles: "deny",
};
const handlers = {};
if (application !== "storefront" && application !== "booster") {
  app.use(
    "/admin/assets",
    express.static("build/admin/client/assets", staticOptions),
  );
  handlers.admin = createRequestHandler({
    build: await import("./build/admin/server/index.js"),
  });
}
if (application !== "admin") {
  app.use(
    "/assets",
    express.static("build/storefront/client/assets", staticOptions),
  );
  app.use(
    "/booster/assets",
    express.static("build/booster/client/assets", staticOptions),
  );
  handlers.customer = createRequestHandler({
    build: await import("./build/storefront/server/index.js"),
  });
  if (origins || application === "booster") {
    handlers.booster = createRequestHandler({
      build: await import("./build/booster/server/index.js"),
    });
  }
}
// Public media is served locally on each portal; no credentialed cross-origin
// asset requests are necessary. Hashed application code uses isolated namespaces.
app.use(
  express.static(
    application === "admin" ? "build/admin/client" : "build/storefront/client",
    {
      index: false,
      dotfiles: "deny",
    },
  ),
);
app.use((req, res, next) => {
  if (origins) {
    const handler = handlers[req.headers["x-playora-frontend-portal"]];
    return handler ? handler(req, res, next) : next();
  }
  // Legacy path-mode development remains available without public staff origins.
  if (
    req.path === "/admin" ||
    req.path === "/admin.data" ||
    req.path.startsWith("/admin/")
  )
    return handlers.admin ? handlers.admin(req, res, next) : next();
  if (application === "booster") return handlers.booster(req, res, next);
  return handlers.customer ? handlers.customer(req, res, next) : next();
});
app.use((_req, res) =>
  res.status(404).type("text/plain").send("Page not found"),
);
const server = app.listen(
  Number(process.env.PORT ?? 3000),
  process.env.HOST ?? "127.0.0.1",
);
server.requestTimeout = 20000;
server.headersTimeout = 15000;
server.keepAliveTimeout = 5000;
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close());
