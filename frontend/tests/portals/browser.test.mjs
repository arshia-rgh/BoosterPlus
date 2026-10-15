import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import { chromium, webkit, expect } from "@playwright/test";
import {
  cookieName,
  orderID,
  privateRecord,
  publicRecord,
  session,
} from "./fixtures.mjs";

const engine = process.env.PLAYWRIGHT_ENGINE ?? "chromium";
if (!["chromium", "webkit"].includes(engine))
  throw new Error("Unsupported portal test engine");
const evidenceDirectory = `.cache/portal-browser/${engine}`;
async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
}
async function port() {
  const socket = createServer();
  const value = await listen(socket);
  await new Promise((resolve) => socket.close(resolve));
  return value;
}
async function stop(child) {
  if (child.exitCode !== null) return;
  const closed = once(child, "exit");
  child.kill("SIGTERM");
  await closed;
}
async function startCheck(frontendPort, host) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        hostname: "127.0.0.1",
        port: frontendPort,
        path: "/login",
        headers: { Host: host },
        timeout: 500,
      },
      (response) => {
        response.resume();
        response.on("end", () => resolve(response.statusCode === 200));
      },
    );
    request.on("timeout", () => request.destroy(new Error("Startup timeout")));
    request.on("error", reject);
    request.end();
  });
}
async function started(child, frontendPort, host) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error("Frontend exited at startup");
    try {
      if (await startCheck(frontendPort, host)) return;
    } catch {
      // Only retry bounded local process startup, never application mutations.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Built portal frontend did not become ready");
}
async function healthySignInScene(page) {
  await expect(page.locator(".site-footer")).toHaveCount(0);
  await expect(page.locator(".site-ambient")).toHaveCount(0);
  await expect(page.locator(".sign-in-art img")).toHaveAttribute(
    "src",
    "/artwork/sign-in-gate-carved-1672.jpg",
  );
  const scene = page.locator(".sign-in-layout");
  await expect(scene.locator(".sign-in-art img")).toBeVisible();
  const outer = await scene.boundingBox();
  const panel = await scene.locator(".sign-in-panel").boundingBox();
  assert.ok(outer && panel);
  assert.ok(
    panel.x >= outer.x + 8 &&
      panel.y >= outer.y + 8 &&
      panel.x + panel.width <= outer.x + outer.width - 8 &&
      panel.y + panel.height <= outer.y + outer.height - 8,
    "Login controls stay inset within the artwork on every viewport",
  );
  const recoveryTrigger = scene.getByRole("button", {
    name: "Lost access to your email?",
  });
  const documentBounds = () =>
    scene.locator(".sign-in-panel").evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        x: bounds.x + scrollX,
        y: bounds.y + scrollY,
        width: bounds.width,
        height: bounds.height,
      };
    });
  const beforeRecovery = await documentBounds();
  await recoveryTrigger.click();
  const recovery = page.getByRole("dialog", { name: "Recover your account" });
  await expect(recovery).toBeVisible();
  await expect(recovery.getByLabel("Current account email")).toBeFocused();
  const modalBounds = await recovery.boundingBox();
  const viewport = page.viewportSize();
  assert.ok(modalBounds && viewport);
  assert.ok(
    modalBounds.x >= 0 && modalBounds.x + modalBounds.width <= viewport.width,
  );
  assert.deepEqual(
    await documentBounds(),
    beforeRecovery,
    "Opening recovery must not resize or move the login card in the document",
  );
  await recovery.getByLabel("Current account email").fill("draft@example.test");
  // Native dialogs allow the browser chrome boundary (BODY), never background controls.
  for (let step = 0; step < 6; step += 1) {
    await page.keyboard.press("Shift+Tab");
    assert.equal(
      await recovery.evaluate(
        (element) =>
          document.activeElement === document.body ||
          element.contains(document.activeElement),
      ),
      true,
    );
  }
  await page
    .getByRole("button", { name: "Continue with Google", includeHidden: true })
    .evaluate((element) => element.focus());
  assert.equal(
    await recovery.evaluate(
      (element) =>
        document.activeElement === document.body ||
        element.contains(document.activeElement),
    ),
    true,
    "The page behind the modal must be inert",
  );
  await page.keyboard.press("Escape");
  await expect(recovery).not.toBeVisible();
  await expect(recoveryTrigger).toBeFocused();
  await recoveryTrigger.click();
  await expect(recovery.getByLabel("Current account email")).toHaveValue(
    "draft@example.test",
  );
  await recovery
    .getByRole("button", { name: "Close account recovery" })
    .click();
  await expect(recoveryTrigger).toBeFocused();
  assert.deepEqual(await documentBounds(), beforeRecovery);
  const rain = scene.locator(".sign-in-rain");
  await expect(rain).toHaveAttribute("aria-hidden", "true");
  await expect(rain).toHaveCSS("pointer-events", "none");
  await expect(rain).toBeHidden();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(rain).toBeVisible();
  await expect(scene.locator(".sign-in-lightning-bolt")).toHaveCSS(
    "animation-name",
    "sign-in-lightning",
  );
  await expect(scene.locator(".sign-in-lightning-glow")).toHaveCSS(
    "animation-duration",
    "10s",
  );
  await expect(scene.locator(".sign-in-lightning-glow")).toHaveCSS(
    "pointer-events",
    "none",
  );
  // Observe the live timeline: a declared animation alone did not prove visibility.
  const bolt = scene.locator(".sign-in-lightning-bolt");
  await expect
    .poll(
      () =>
        bolt.evaluate((element) => Number(getComputedStyle(element).opacity)),
      {
        timeout: 4500,
        intervals: [100],
      },
    )
    .toBeGreaterThan(0.75);
  await expect
    .poll(
      () =>
        bolt.evaluate((element) => Number(getComputedStyle(element).opacity)),
      {
        timeout: 4500,
        intervals: [100],
      },
    )
    .toBeLessThan(0.05);
  const drop = rain.locator("span").first();
  await expect(drop).toHaveCSS("animation-name", "sign-in-rainfall");
  const before = await drop.evaluate(
    (element) => getComputedStyle(element).transform,
  );
  await expect
    .poll(() => drop.evaluate((element) => getComputedStyle(element).transform))
    .not.toBe(before);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(rain).toBeHidden();
  await expect(drop).toHaveCSS("animation-name", "none");
  await expect(scene.locator(".sign-in-lightning-bolt")).toBeHidden();
  await expect(scene.locator(".sign-in-lightning-glow")).toBeHidden();
}
async function healthyPage(page, expectedPortal) {
  await expect(page.locator("body")).toHaveAttribute(
    "data-portal",
    expectedPortal,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
    "Portal page must not horizontally overflow",
  );
  for (const select of await page.locator("select:visible").all()) {
    const bounds = await select.boundingBox();
    assert.ok(
      bounds && bounds.height >= 44,
      "Native selects retain a usable touch target",
    );
  }
  assert.equal(
    await page.evaluate(() => [...document.styleSheets].length > 0),
    true,
    "The actual SSR CSS assets must load",
  );
}
async function section(page, title, label, expected) {
  const record = page.getByRole("region", {
    name: `${title} ${orderID}`,
    exact: true,
  });
  await record.getByRole("link", { name: label, exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(`/orders/${orderID}\\?section=${expected}$`),
  );
  await expect(
    record.getByRole("heading", { name: `${title} ${orderID}`, exact: true }),
  ).toBeVisible();
  await expect(
    record.getByRole("link", { name: label, exact: true }),
  ).toHaveAttribute("aria-current", "page");
}

test(
  "isolated built admin and pro hosts retain clean portal navigation and host-only browser sessions",
  { timeout: 180000 },
  async (t) => {
    for (const application of ["storefront", "admin", "booster"])
      await access(`build/${application}/server/index.js`);
    await mkdir(evidenceDirectory, { recursive: true, mode: 0o700 });
    const frontendPort = await port();
    const origins = {
      customer: `http://playora.localhost:${frontendPort}`,
      admin: `http://admin.playora.localhost:${frontendPort}`,
      booster: `http://pro.playora.localhost:${frontendPort}`,
    };
    const secret = randomBytes(32).toString("hex");
    const seen = [];
    const violations = [];
    const unmatched = new Set();
    const backend = createServer((req, res) => {
      const path = new URL(req.url, "http://fixture.invalid").pathname;
      const portal = Object.entries(origins).find(
        ([, origin]) => origin === req.headers["x-playora-request-origin"],
      )?.[0];
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      const send = (body, status = 200) => {
        res.statusCode = status;
        res.end(JSON.stringify(body));
      };
      if (!portal || req.headers["x-booster-proxy-key"] !== secret) {
        violations.push("Missing trusted proxy binding");
        return send({ code: "permission_denied" }, 403);
      }
      const cookie = req.headers.cookie ?? "";
      seen.push({
        portal,
        path,
        cookie,
        audience: req.headers["x-playora-portal"] ?? "",
      });
      for (const other of ["customer", "admin", "booster"].filter(
        (role) => role !== portal,
      )) {
        if (
          cookie
            .split(/;\s*/)
            .some((part) => part.startsWith(cookieName(other) + "="))
        )
          violations.push(`A ${other} cookie crossed into ${portal}`);
      }
      if (req.method !== "GET") {
        violations.push(`Unexpected fixture mutation: ${req.method} ${path}`);
        return send({ code: "permission_denied" }, 403);
      }
      const declared = req.headers["x-playora-portal"];
      if (declared && declared !== portal)
        return send({ code: "permission_denied" }, 403);
      const authenticated = cookie
        .split(/;\s*/)
        .includes(`${cookieName(portal)}=verified-${portal}`);
      if (path === `/api/v1/auth/portals/${portal}/session`) {
        if (!cookie.includes(`${cookieName(portal)}=`))
          res.setHeader(
            "Set-Cookie",
            `${cookieName(portal)}=anonymous-${portal}; Path=/; HttpOnly; SameSite=Lax`,
          );
        return send(session(portal, authenticated));
      }
      if (path === "/api/v1/fixture/echo") return send({ portal, cookie });
      const publicValue = publicRecord(path);
      if (publicValue) return send(publicValue);
      if (!authenticated) return send({ code: "sign_in_required" }, 401);
      // The signed-in customer keeps the order/support widget after returning
      // from a staff host to public terms. Model its authenticated empty state
      // explicitly; unexpected routes must still fail the final assertion.
      if (portal === "customer" && path === "/api/v1/me/overview")
        return send({
          attention: [],
          active: [],
          upcoming: [],
          messages: [],
          progress: [],
          more_messages: false,
          more_attention: false,
          more_active: false,
          more_upcoming: false,
        });
      const value = privateRecord(path, portal);
      if (value) return send(value);
      unmatched.add(`${portal} ${path}`);
      return send({ code: "not_found" }, 404);
    });
    const backendPort = await listen(backend);
    t.after(
      () =>
        new Promise((resolve) => {
          backend.closeAllConnections();
          backend.close(resolve);
        }),
    );
    let serverOutput = "";
    const child = spawn(process.execPath, ["server.mjs"], {
      env: {
        ...process.env,
        HOST: "127.0.0.1",
        PORT: String(frontendPort),
        APP_ENV: "test",
        FRONTEND_APP: "both",
        API_ORIGIN: `http://127.0.0.1:${backendPort}`,
        PUBLIC_ORIGIN: origins.customer,
        ADMIN_PUBLIC_ORIGIN: origins.admin,
        BOOSTER_PUBLIC_ORIGIN: origins.booster,
        PUBLIC_SITE_ORIGIN: origins.customer,
        PROXY_SHARED_KEY: secret,
        TERMS_VERSION: "synthetic-portal-v1",
        ACCOUNT_TERMS_TEXT: "Synthetic portal browser qualification terms.",
        TRUST_PROXY_CIDRS: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    for (const output of [child.stdout, child.stderr])
      output.on("data", (bytes) => {
        serverOutput = (serverOutput + bytes.toString()).slice(-40000);
      });
    t.after(async () => {
      await stop(child);
      await writeFile(`${evidenceDirectory}/server.log`, serverOutput, {
        mode: 0o600,
      });
    });
    await started(child, frontendPort, new URL(origins.customer).host);
    const browser = await (engine === "webkit" ? webkit : chromium).launch({
      ...(engine === "chromium"
        ? {
            args: [
              "--host-resolver-rules=MAP *.playora.localhost 127.0.0.1,MAP playora.localhost 127.0.0.1",
            ],
          }
        : {}),
    });
    t.after(() => browser.close());
    for (const viewport of [
      { name: "desktop", width: 1440, height: 1000 },
      { name: "mobile", width: 390, height: 844 },
    ]) {
      await t.test(viewport.name, async () => {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          reducedMotion: "reduce",
        });
        await context.tracing.start({ screenshots: true, snapshots: true });
        const external = [];
        await context.route("**/*", (route) => {
          const url = new URL(route.request().url());
          if (![...Object.values(origins)].includes(url.origin)) {
            external.push(url.origin);
            return route.abort();
          }
          return route.continue();
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        const assetFailures = [];
        page.on("response", (response) => {
          if (
            /\/assets\/.*\.(?:js|css)(?:\?|$)/.test(response.url()) &&
            response.status() !== 200
          )
            assetFailures.push(`${response.status()} ${response.url()}`);
        });
        try {
          await page.goto(origins.customer + "/login");
          await expect(page.locator(".sign-in-panel")).toHaveCount(1);
          await healthySignInScene(page);
          await expect(page.locator(".google-sign-in img")).toHaveAttribute(
            "src",
            "/brand/google-signin.png",
          );
          await page
            .getByRole("button", { name: "Send verification code" })
            .click();
          await expect(
            page.getByLabel("Email address", { exact: true }),
          ).toBeFocused();
          await expect(
            page.getByLabel("Email address", { exact: true }),
          ).toHaveAccessibleDescription("Complete this field.");
          await healthyPage(page, "customer");
          await page.screenshot({
            path: `${evidenceDirectory}/${viewport.name}-customer-login.png`,
            fullPage: true,
          });
          // A customer cookie must never make either staff entry authenticated.
          await context.addCookies([
            {
              name: cookieName("customer"),
              value: "verified-customer",
              url: origins.customer,
              httpOnly: true,
              sameSite: "Lax",
            },
          ]);
          for (const portal of ["admin", "booster"]) {
            await page.goto(origins[portal] + "/login");
            await expect(page.getByRole("heading", { level: 1 })).toHaveText(
              portal === "admin" ? "Admin sign-in" : "Booster sign-in",
            );
            await expect(page.getByLabel("Work email address")).toBeVisible();
            await expect(
              page.getByRole("link", { name: "Visit the PLAYORA website ↗" }),
            ).toHaveAttribute("href", origins.customer + "/");
            await expect(
              page.getByRole("link", { name: "account terms" }).first(),
            ).toHaveAttribute("href", origins.customer + "/terms");
            await expect(page.locator(".sign-in-panel")).toHaveCount(1);
            await healthySignInScene(page);
            await expect(page.locator(".google-sign-in img")).toHaveAttribute(
              "src",
              "/brand/google-signin.png",
            );
            await page
              .getByRole("button", { name: "Send verification code" })
              .click();
            await expect(page.getByLabel("Work email address")).toBeFocused();
            await expect(page.getByLabel("Work email address")).toHaveAttribute(
              "aria-invalid",
              "true",
            );
            await expect(
              page.getByLabel("Work email address"),
            ).toHaveAccessibleDescription("Complete this field.");
            await healthyPage(page, portal);
            await page.screenshot({
              path: `${evidenceDirectory}/${viewport.name}-${portal}-login.png`,
              fullPage: true,
            });

            // The fixture grants a synthetic session locally; no real sign-in,
            // authenticator, message or production action occurs in this runner.
            await context.addCookies([
              {
                name: cookieName(portal),
                value: `verified-${portal}`,
                url: origins[portal],
                httpOnly: true,
                sameSite: "Lax",
              },
            ]);
            await page.goto(origins[portal] + "/");
            await expect(page.getByRole("heading", { level: 1 })).toHaveText(
              portal === "admin" ? "Administration" : "Your next session",
            );
            await healthyPage(page, portal);
            if (portal === "admin") {
              await expect(page.getByRole("search")).toHaveAttribute(
                "action",
                "/orders",
              );
              await page
                .getByRole("searchbox", { name: "Search orders" })
                .fill("Synthetic");
              await page
                .getByRole("searchbox", { name: "Search orders" })
                .press("Enter");
              await expect(page).toHaveURL(
                origins.admin + "/orders?search=Synthetic",
              );
            } else {
              await page
                .getByRole("link", { name: "View assigned work", exact: true })
                .click();
              await expect(page).toHaveURL(origins.booster + "/orders");
            }
            await expect(page.getByRole("heading", { level: 1 })).toHaveText(
              portal === "admin" ? "Order queue" : "Assigned work",
            );
            await healthyPage(page, portal);
            // Let fixture reads finish before deliberately replacing the document.
            await page.waitForLoadState("networkidle");
            await page.goto(origins[portal] + "/unknown-route");
            await expect(page.getByRole("heading", { level: 1 })).toHaveText(
              "This page isn’t available.",
            );
            await expect(
              page.getByRole("link", {
                name:
                  portal === "admin"
                    ? "Return to Administration"
                    : "Return to Booster workspace",
                exact: true,
              }),
            ).toHaveAttribute("href", "/");
            await healthyPage(page, portal);
            await page.waitForLoadState("networkidle");
            await page.goto(origins[portal] + "/orders");
            const orderLink =
              portal === "admin"
                ? page.getByRole("link", {
                    name: `Synthetic game Order ${orderID}`,
                    exact: true,
                  })
                : page.getByRole("link", {
                    name: `View assignment ${orderID} · Synthetic game`,
                    exact: true,
                  });
            await expect(orderLink).toHaveAttribute(
              "href",
              `/orders/${orderID}`,
            );
            await orderLink.click();
            await expect(page).toHaveURL(
              origins[portal] + `/orders/${orderID}`,
            );
            const title = portal === "admin" ? "Order" : "Assignment";
            await expect(
              page.getByRole("heading", {
                name: `${title} ${orderID}`,
                exact: true,
              }),
            ).toBeVisible();
            if (portal === "admin") {
              await section(page, title, "Quote & agreement", "quote");
              await page
                .getByLabel("Agreed scope", { exact: true })
                .fill("Synthetic unsaved quote draft");
              await section(page, title, "Activity", "history");
              await expect(
                page.getByText("No activity on this page.", { exact: true }),
              ).toBeVisible();
              await section(page, title, "Quote & agreement", "quote");
              await expect(
                page.getByLabel("Agreed scope", { exact: true }),
              ).toHaveValue("Synthetic unsaved quote draft");
            } else {
              await section(page, title, "Progress", "progress");
              await page
                .getByLabel("Customer-visible update", { exact: true })
                .fill("Synthetic unsaved progress draft");
              await section(page, title, "Messages & proof", "messages");
              await expect(
                page.getByText(
                  "Shared coordination is not available. Ask your administrator to enable it for this assignment.",
                  { exact: true },
                ),
              ).toBeVisible();
              await section(page, title, "Progress", "progress");
              await expect(
                page.getByLabel("Customer-visible update", { exact: true }),
              ).toHaveValue("Synthetic unsaved progress draft");
            }
            await healthyPage(page, portal);
            await page.screenshot({
              path: `${evidenceDirectory}/${viewport.name}-${portal}-order.png`,
              fullPage: true,
            });
            await page.goBack();
            await expect(page).toHaveURL(
              new RegExp(
                `^${origins[portal]}/orders/${orderID}\\?section=${portal === "admin" ? "history" : "messages"}$`,
              ),
            );
            // Empty the visited draft before refreshing to avoid relying on a
            // browser's beforeunload prompt in this read-only journey.
            await section(
              page,
              title,
              portal === "admin" ? "Quote & agreement" : "Progress",
              portal === "admin" ? "quote" : "progress",
            );
            await page
              .getByLabel(
                portal === "admin" ? "Agreed scope" : "Customer-visible update",
                { exact: true },
              )
              .fill("");
            await page.reload();
            await expect(
              page.getByRole("heading", {
                name: `${title} ${orderID}`,
                exact: true,
              }),
            ).toBeVisible();
            await healthyPage(page, portal);
            const echo = await page.evaluate(async () =>
              (await fetch("/api/v1/fixture/echo")).json(),
            );
            assert.equal(echo.portal, portal);
            assert.match(
              echo.cookie,
              new RegExp(`${cookieName(portal)}=verified-${portal}`),
            );

            // Finish the current read-only view before intentionally replacing
            // its document; WebKit reports aborted cross-host reads as page errors.
            await page.waitForLoadState("networkidle");
            await page.goto(
              origins.customer + `/${portal}/orders?state=submitted`,
            );
            await expect(page).toHaveURL(
              origins[portal] + "/orders?state=submitted",
            );
            await expect(page.getByRole("heading", { level: 1 })).toHaveText(
              portal === "admin" ? "Order queue" : "Assigned work",
            );
          }
          await page.waitForLoadState("networkidle");
          await page
            .getByRole("link", { name: "Terms & policies", exact: true })
            .click();
          await expect(page).toHaveURL(origins.customer + "/terms");
          await expect(
            page.getByText("Synthetic portal browser qualification terms.", {
              exact: true,
            }),
          ).toBeVisible();
          const customerEcho = await page.evaluate(async () =>
            (await fetch("/api/v1/fixture/echo")).json(),
          );
          assert.equal(customerEcho.portal, "customer");
          assert.equal(customerEcho.cookie, "bp-session=verified-customer");
          await page
            .getByRole("button", { name: "Orders & support", exact: true })
            .click();
          const activity = page.getByRole("complementary", {
            name: "Your orders and support",
            exact: true,
          });
          await expect(
            activity.getByText(
              "No active orders. Your completed orders remain in order history.",
              { exact: true },
            ),
          ).toBeVisible();
          await expect(
            activity.getByRole("link", { name: "Order history", exact: true }),
          ).toHaveAttribute("href", "/orders");
          await expect(
            activity.getByRole("link", {
              name: "Chat with support",
              exact: true,
            }),
          ).toHaveAttribute("href", "/support");
          await activity
            .getByRole("button", { name: "Close", exact: true })
            .click();
          await healthyPage(page, "customer");
          assert.deepEqual(external, []);
          assert.deepEqual(errors, []);
          assert.deepEqual(assetFailures, []);
        } finally {
          await context.tracing.stop({
            path: `${evidenceDirectory}/${viewport.name}-trace.zip`,
          });
          await context.close();
        }
      });
    }
    assert.deepEqual(violations, []);
    assert.deepEqual([...unmatched], []);
    for (const portal of ["admin", "booster"])
      assert(
        seen.some(
          (request) =>
            request.portal === portal &&
            request.path === `/api/v1/auth/portals/${portal}/session` &&
            request.audience === portal,
        ),
      );
    await writeFile(
      `${evidenceDirectory}/result.json`,
      JSON.stringify(
        {
          passed: true,
          engine,
          viewports: ["desktop", "mobile"],
          portals: ["admin", "booster"],
          requests: seen.length,
          synthetic: true,
          realBackendAuthenticationQualified: false,
        },
        null,
        2,
      ) + "\n",
      { mode: 0o600 },
    );
  },
);
