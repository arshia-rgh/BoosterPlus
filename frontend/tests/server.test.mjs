import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
}
async function port() {
  const server = createServer();
  const chosen = await listen(server);
  await new Promise((resolve) => server.close(resolve));
  return chosen;
}
async function started(child, url) {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (child.exitCode !== null) throw new Error("Frontend failed to start");
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(300) });
      if (response.ok) return;
    } catch {
      /* Startup is bounded below. */
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Frontend startup timed out");
}
async function stop(child) {
  if (child.exitCode !== null) return;
  const closed = once(child, "exit");
  child.kill("SIGTERM");
  await closed;
}

test(
  "public server validates terms and proxies only trusted headers",
  { timeout: 20000 },
  async (t) => {
    const secret = randomBytes(32).toString("hex");
    const backend = createServer((req, res) => {
      res.setHeader("Content-Type", "application/json");
      if (req.url === "/api/v1/auth/session") {
        res.end(JSON.stringify({ terms_version: "approved-test-v1" }));
        return;
      }
      res.setHeader(
        "Set-Cookie",
        "__Host-test=opaque; Secure; HttpOnly; SameSite=Lax; Path=/",
      );
      res.end(
        JSON.stringify({
          path: req.url,
          proxyCorrect: req.headers["x-booster-proxy-key"] === secret,
          ip: req.headers["x-booster-client-ip"],
          forwarded: req.headers["x-forwarded-for"] ?? null,
          cookie: req.headers.cookie ?? null,
        }),
      );
    });
    const backendPort = await listen(backend);
    t.after(() => new Promise((resolve) => backend.close(resolve)));
    const frontendPort = await port();
    const url = "http://127.0.0.1:" + frontendPort;
    const child = spawn(process.execPath, ["server.mjs"], {
      env: {
        ...process.env,
        HOST: "127.0.0.1",
        PORT: String(frontendPort),
        APP_ENV: "production",
        API_ORIGIN: "http://127.0.0.1:" + backendPort,
        PROXY_SHARED_KEY: secret,
        TERMS_VERSION: "approved-test-v1",
        ACCOUNT_TERMS_TEXT: "Approved test terms",
        TRUST_PROXY_CIDRS: "",
      },
      stdio: "ignore",
    });
    t.after(() => stop(child));
    await started(child, url);
    const first = await fetch(url + "/login");
    const second = await fetch(url + "/login");
    assert.notEqual(
      first.headers.get("content-security-policy"),
      second.headers.get("content-security-policy"),
    );
    assert.match(
      first.headers.get("content-security-policy"),
      /frame-ancestors 'none'/,
    );
    assert.equal(first.headers.get("x-powered-by"), null);
    const terms = await fetch(url + "/terms");
    assert.match(await terms.text(), /Approved test terms/);
    const response = await fetch(
      url + "/api/v1/test?target=https://evil.example",
      {
        headers: {
          "X-Booster-Proxy-Key": "forged",
          "X-Booster-Client-IP": "203.0.113.5",
          "X-Forwarded-For": "203.0.113.6",
          Cookie: "bp-session=client-cookie",
        },
      },
    );
    const result = await response.json();
    assert.equal(result.proxyCorrect, true);
    assert.equal(result.forwarded, null);
    assert.equal(result.ip, "127.0.0.1");
    assert.equal(result.cookie, "bp-session=client-cookie");
    assert.equal(result.path, "/api/v1/test?target=https://evil.example");
    assert.match(response.headers.get("set-cookie"), /HttpOnly/);
  },
);
test(
  "public startup refuses missing approved terms",
  { timeout: 10000 },
  async () => {
    const child = spawn(process.execPath, ["server.mjs"], {
      env: {
        ...process.env,
        APP_ENV: "production",
        ACCOUNT_TERMS_TEXT: "",
        TERMS_VERSION: "development-preview-v1",
      },
      stdio: "ignore",
    });
    const [code] = await once(child, "exit");
    assert.notEqual(code, 0);
  },
);
