import { randomBytes } from "node:crypto";
import http from "node:http";
import https from "node:https";
import express from "express";
import { createRequestHandler } from "@react-router/express";

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
  const response = await fetch(new URL("/api/v1/auth/session", api), {
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new Error("Identity backend is unavailable at startup");
  const session = await response.json();
  if (session.terms_version !== process.env.TERMS_VERSION)
    throw new Error("Frontend and backend account terms versions must match");
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
  if (req.secure)
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});
app.use("/api", (req, res) => {
  if (proxyKey.length < 32)
    return res.status(503).json({ code: "unavailable" });
  const headers = {};
  for (const name of [
    "accept",
    "content-type",
    "cookie",
    "origin",
    "sec-fetch-site",
    "x-csrf-token",
    "last-event-id",
  ]) {
    if (req.headers[name]) headers[name] = req.headers[name];
  }
  headers["x-booster-proxy-key"] = proxyKey;
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
      timeout: 12000,
    },
    (response) => {
      res.status(response.statusCode ?? 502);
      for (const name of [
        "content-type",
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
      (req.path.startsWith("/v1/conversations") ||
      req.path.startsWith("/v1/admin/conversations") ||
      req.path.startsWith("/v1/orders") ||
      req.path.startsWith("/v1/admin/orders") ||
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
app.use(
  "/assets",
  express.static("build/client/assets", {
    immutable: true,
    maxAge: "1y",
    index: false,
    dotfiles: "deny",
  }),
);
app.use(express.static("build/client", { index: false, dotfiles: "deny" }));
app.use(
  createRequestHandler({ build: await import("./build/server/index.js") }),
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
