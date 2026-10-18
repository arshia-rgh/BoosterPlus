import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, webkit, expect } from "@playwright/test";
import { publicRecord, session } from "./fixtures.mjs";
import { account, game, screenshot } from "./account-fixtures.mjs";

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
}

test(
  "built account marketplace keeps facts, total, terms and purchase review readable",
  { timeout: 120000 },
  async (t) => {
    const engine = process.env.PLAYWRIGHT_ENGINE ?? "chromium";
    assert.ok(["chromium", "webkit"].includes(engine));
    const evidence = `.cache/account-market/${engine}/${Date.now()}`;
    await mkdir(evidence, { recursive: true });
    const socket = createServer();
    const port = await listen(socket);
    await new Promise((resolve) => socket.close(resolve));
    const origin = `http://127.0.0.1:${port}`;
    const requests = [],
      unmatched = [],
      errors = [];
    const sparse = structuredClone(account);
    sparse.id = "00000000-0000-4000-8000-000000000167";
    sparse.images = [];
    sparse.product.title = "Account without screenshots";
    sparse.product.attributes = [];
    const backend = createServer((req, res) => {
      const url = new URL(req.url, origin),
        path = url.pathname;
      requests.push({ method: req.method, path });
      const send = (value, status = 200) => {
        res.writeHead(status, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        res.end(JSON.stringify(value));
      };
      if (req.method !== "GET")
        return send({ code: "fixture_mutation_forbidden" }, 403);
      if (path === "/api/v1/auth/portals/customer/session") {
        const s = session("customer", true);
        s.google_enabled = false;
        return send(s);
      }
      if (path === "/api/v1/me/overview")
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
      if (["/api/v1/games", "/api/v1/accounts/games"].includes(path))
        return send({ games: [], next: "" });
      if (path === "/api/v1/catalog/games/mobile-legends") return send(game);
      if (path === "/api/v1/catalog/games/mobile-legends/discovery")
        return send({
          game_id: game.game_id,
          release_id: game.id,
          capabilities: ["boost", "accounts", "shop", "news"].map(
            (service) => ({
              service,
              state: service === "accounts" ? "active" : "off",
              description: "",
              reason: "",
            }),
          ),
          promotions: [],
          metrics: [],
        });
      if (path === "/api/v1/accounts")
        return send({ items: [account, sparse], next: "" });
      if (path === `/api/v1/accounts/${account.id}`) return send(account);
      if (path === `/api/v1/accounts/${sparse.id}`) return send(sparse);
      if (account.images.some((image) => image === url.pathname + url.search)) {
        res.writeHead(200, { "Content-Type": "image/svg+xml" });
        return res.end(screenshot);
      }
      const common = publicRecord(path);
      if (common) return send(common);
      unmatched.push(path);
      return send({ code: "fixture_missing" }, 501);
    });
    const apiPort = await listen(backend);
    t.after(
      () =>
        new Promise((resolve) => {
          backend.closeAllConnections();
          backend.close(resolve);
        }),
    );
    const child = spawn(process.execPath, ["server.mjs"], {
      env: {
        PATH: process.env.PATH,
        APP_ENV: "test",
        HOST: "127.0.0.1",
        PORT: String(port),
        FRONTEND_APP: "storefront",
        API_ORIGIN: `http://127.0.0.1:${apiPort}`,
        PUBLIC_ORIGIN: origin,
        PUBLIC_SITE_ORIGIN: origin,
        PROXY_SHARED_KEY: "s".repeat(64),
        TERMS_VERSION: "synthetic-v1",
        ACCOUNT_TERMS_TEXT: "Synthetic terms only.",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    for (const stream of [child.stdout, child.stderr])
      stream.on("data", (data) => {
        output += data.toString();
      });
    t.after(async () => {
      if (child.exitCode === null) {
        const end = once(child, "exit");
        child.kill("SIGTERM");
        await end;
      }
      await writeFile(`${evidence}/server.log`, output);
    });
    let ready = false;
    for (let attempt = 0; attempt < 100 && !ready; attempt++) {
      assert.equal(child.exitCode, null, output);
      try {
        const response = await fetch(`${origin}/login`);
        ready = response.ok;
        await response.arrayBuffer();
      } catch {
        /* bounded local startup only */
      }
      if (!ready) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready, output);
    const browser = await (engine === "webkit" ? webkit : chromium).launch();
    t.after(() => browser.close());
    for (const width of [1440, 768, 390, 320]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
        serviceWorkers: "block",
      });
      await context.route("**/*", (route) =>
        new URL(route.request().url()).origin === origin
          ? route.continue()
          : route.abort(),
      );
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      const local = page.locator(".game-account-market");
      await page.goto(`${origin}/games/mobile-legends/accounts`);
      const card = page.getByRole("article", { name: account.product.title });
      await expect(card.getByText("USD 105.00")).toBeVisible();
      await expect(
        card.getByText("Includes 5% buyer commission"),
      ).toBeVisible();
      await expect(card.getByText("Rank", { exact: true })).toBeVisible();
      await expect(page.getByText("No account screenshot")).toBeVisible();
      await card.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${evidence}/cards-${width}.png` });
      await card.getByRole("link", { name: "Review account" }).click();
      const purchase = page.getByRole("region", {
        name: "Purchase this account",
      });
      await expect(
        purchase.locator(".account-total").getByText("USD 105.00"),
      ).toBeVisible();
      await expect(local.getByText(account.product.sale_terms)).toBeHidden();
      await page.getByRole("button", { name: "View screenshot 2" }).click();
      await expect(page.getByText("Reviewed screenshot 2 of 2")).toBeVisible();
      const enlarge = page.getByRole("button", { name: "Enlarge screenshot" });
      await enlarge.click();
      await expect(
        page.getByRole("dialog", { name: "Enlarged account screenshot" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(enlarge).toBeFocused();
      await local
        .locator(".account-detail-title")
        .first()
        .scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${evidence}/detail-${width}.png` });
      await purchase
        .getByRole("button", { name: "Review this account purchase" })
        .click();
      const review = page.getByRole("region", {
        name: "Account purchase review",
      });
      await expect(review).toBeFocused();
      const navigationBounds = await page
        .locator(".site-header")
        .evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return getComputedStyle(element).position === "sticky"
            ? rect.bottom
            : 0;
        });
      const reviewTitleBounds = await review
        .locator(".account-detail-title")
        .boundingBox();
      assert.ok(
        reviewTitleBounds && reviewTitleBounds.y > navigationBounds,
        `Review identity must be visible below the sticky header after the step transition: width=${width}, title=${JSON.stringify(reviewTitleBounds)}, header=${navigationBounds}`,
      );
      const backBounds = await review
        .getByRole("button", { name: "Back to account listing" })
        .boundingBox();
      assert.ok(
        backBounds &&
          backBounds.height >= 44 &&
          backBounds.y > navigationBounds,
        "Secondary actions retain touch-sized controls and stay below the sticky header",
      );
      await expect(review.getByLabel("Account price breakdown")).toContainText(
        "Total to payUSD 105.00",
      );
      for (const row of await review
        .locator(".account-price-breakdown > div")
        .all()) {
        const labelBounds = await row.locator("dt").boundingBox();
        const amountBounds = await row.locator("dd").boundingBox();
        assert.ok(
          labelBounds &&
            amountBounds &&
            amountBounds.x >= labelBounds.x + labelBounds.width,
          "Price amounts stay in a separate aligned column on narrow screens",
        );
      }
      await expect(
        review.getByRole("button", { name: "Reserve and continue to payment" }),
      ).toBeDisabled();
      await review.getByText("Sale agreement", { exact: true }).click();
      await expect(review.getByText(account.product.sale_terms)).toBeVisible();
      await expect(review.locator(".account-gallery")).toHaveCount(0);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
      );
      await page.screenshot({ path: `${evidence}/review-${width}.png` });
      await review
        .getByRole("button", { name: "Back to account listing" })
        .click();
      await expect(
        purchase.getByRole("button", { name: "Review this account purchase" }),
      ).toBeFocused();
      await page.goto(`${origin}/games/mobile-legends/accounts/${sparse.id}`);
      await expect(page.getByText("No screenshots provided")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Enlarge screenshot" }),
      ).toHaveCount(0);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
      );
      // Explicitly mock the two access states; never create a live reservation.
      await context.route(`**/api/v1/auth/portals/customer/session`, (route) =>
        route.fulfill({
          json: { ...session("customer", false), google_enabled: false },
        }),
      );
      await page.goto(
        `${origin}/games/mobile-legends/accounts/${account.id}?step=review`,
      );
      await expect(
        page.getByRole("link", { name: "Sign in to reserve this account" }),
      ).toHaveAttribute(
        "href",
        `/login?returnTo=${encodeURIComponent(`/games/mobile-legends/accounts/${account.id}?step=review`)}`,
      );
      await context.route(`**/api/v1/accounts/${account.id}`, (route) =>
        route.fulfill({ json: { ...account, state: "sold" } }),
      );
      await page.reload();
      await expect(
        page.getByRole("region", { name: "Account availability" }),
      ).toContainText("cannot be reserved");
      await expect(
        page.getByRole("button", { name: "Reserve and continue to payment" }),
      ).toHaveCount(0);
      await context.close();
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(unmatched, []);
    assert.ok(
      requests.every((request) => request.method === "GET"),
      "Review checks must not mutate even the synthetic backend",
    );
    await writeFile(
      `${evidence}/result.json`,
      JSON.stringify(
        {
          passed: true,
          engine,
          widths: [1440, 768, 390, 320],
          requests: requests.length,
          mutations: 0,
          limits:
            "Built UI with synthetic API; not database or live payment qualification.",
        },
        null,
        2,
      ),
    );
  },
);
