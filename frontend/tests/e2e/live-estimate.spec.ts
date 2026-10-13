import { expect, test, type Page, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";
import prepared from "../fixtures/mlbb-catalog/configuration.json" with { type: "json" };

let server: ViteDevServer;
let origin: string;
test.beforeAll(async () => {
  server = await createServer({
    configFile: false,
    envDir: false,
    root: fileURLToPath(new URL("../fixtures/live-estimate", import.meta.url)),
    publicDir: fileURLToPath(new URL("../../public", import.meta.url)),
    server: {
      host: "127.0.0.1",
      port: 0,
      fs: { allow: [fileURLToPath(new URL("../../../", import.meta.url))] },
    },
    logLevel: "error",
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string")
    throw new Error("Missing isolated preview address");
  origin = `http://127.0.0.1:${String(address.port)}`;
});
test.afterAll(async () => {
  await server.close();
});

async function bounds(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Missing layout element");
  return box;
}
async function gutterLayout(page: Page) {
  return page.evaluate(() => {
    const content = document.querySelector(".game-local-content");
    const faq = document.querySelector(".game-faq");
    if (!content || !faq) throw new Error("Missing content or FAQ");
    return {
      content:
        content.getBoundingClientRect().x +
        parseFloat(getComputedStyle(content).paddingLeft),
      faq:
        faq.getBoundingClientRect().x +
        parseFloat(getComputedStyle(faq).paddingLeft),
      width: document.documentElement.scrollWidth,
    };
  });
}
async function isolate(page: Page) {
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    const send = (json: unknown, status = 200) =>
      route.fulfill({ status, json });
    if (request.method() === "GET" && path.endsWith("/session"))
      return send({
        portal: "customer",
        user: null,
        csrf_token: "x".repeat(48),
        google_enabled: false,
        google_linked: false,
        mfa_required: false,
        capabilities: [],
        terms_version: "fixture",
        terms_url: "/terms",
      });
    if (request.method() === "GET" && path.endsWith("/discovery"))
      return send({
        game_id: "synthetic-game",
        release_id: "ui149",
        capabilities: ["boost", "accounts", "shop", "news"].map((service) => ({
          service,
          state: "active",
          description: "Isolated fixture",
          reason: "",
        })),
        promotions: [],
        metrics: [],
      });
    if (
      request.method() === "GET" &&
      (path.endsWith("/accounts") || path.endsWith("/shop"))
    )
      return send({ items: [], next: "" });
    if (
      request.method() === "POST" &&
      /\/(estimate|discount|validate)$/.test(path)
    ) {
      const input = request.postDataJSON() as {
        answers: Record<string, unknown>;
        code?: string;
      };
      if (path.endsWith("/validate"))
        return send({ answers: input.answers, issues: [] });
      if (input.code === "ERROR") return send({ code: "internal_error" }, 503);
      const amount =
        Array.isArray(input.answers.heroes) && input.answers.heroes.length
          ? "3000"
          : "2500";
      return send({
        release_id: "ui149",
        version: 1,
        evaluator: "pricing-v1",
        expires_at: new Date(Date.now() + 900000).toISOString(),
        outcome: input.code === "MANUAL" ? "manual_review" : "estimated",
        currency: "USD",
        amount_minor: amount,
        answers: input.answers,
        lines: [
          {
            key: "demo",
            label: "Synthetic review amount",
            amount_minor: amount,
          },
        ],
        issues: [],
      });
    }
    return send({ code: "not_found" }, 404);
  });
}

for (const width of [320, 390, 768, 1280]) {
  test(`live price stays stable and details stay accessible at ${String(width)}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 });
    await isolate(page);
    await page.goto(`${origin}/games/mobile-legends/services/rank_boost`);
    const card = page.getByRole("complementary", { name: "Selection summary" });
    const price = card.getByRole("region", { name: "Price estimate" });
    await expect(price).toContainText("USD 25.00");
    const coupon = page.getByRole("textbox", { name: "Coupon code" });
    await coupon.fill("ERROR");
    const before = await bounds(card);
    const scroll = await page.evaluate(() => scrollY);
    await expect(price).toContainText("Estimate unavailable");
    await expect(coupon).toBeFocused();
    await expect(price).not.toContainText("USD 25.00");
    const error = await bounds(card);
    expect(before).not.toBeNull();
    expect(error).not.toBeNull();
    expect(Math.abs(error.height - before.height)).toBeLessThanOrEqual(2);
    expect(
      Math.abs((await page.evaluate(() => scrollY)) - scroll),
    ).toBeLessThanOrEqual(2);
    if (width <= 768) expect(error.height).toBeLessThanOrEqual(250);
    await page.screenshot({
      path: info.outputPath(`error-${String(width)}.png`),
    });
    await coupon.fill("MANUAL");
    await expect(price).toContainText("manual price review");
    expect(
      Math.abs((await bounds(card)).height - before.height),
    ).toBeLessThanOrEqual(2);
    await coupon.fill("");
    await expect(price).toContainText("USD 25.00");
    expect(
      Math.abs((await bounds(card)).height - before.height),
    ).toBeLessThanOrEqual(2);
    const trigger = card.getByRole("button", { name: "Price & selections" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Price & selections" });
    await expect(dialog).toBeVisible();
    const close = dialog.getByRole("button", { name: "Close details" });
    await expect(close).toBeFocused();
    await expect(dialog).toContainText(
      "Your provisional estimate is shown here",
    );
    await expect(dialog).not.toContainText(
      "Check your selections for a provisional estimate",
    );
    await dialog.getByText("Price breakdown", { exact: true }).click();
    await expect(dialog.getByText(/Synthetic review amount/)).toBeVisible();
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => !!document.activeElement?.closest("dialog")),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`details-${String(width)}.png`),
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await close.click();
    await expect(trigger).toBeFocused();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    const layout = await gutterLayout(page);
    expect(Math.abs(layout.content - layout.faq)).toBeLessThanOrEqual(1);
    await info.attach("layout", {
      body: JSON.stringify({ before, error, scroll, layout }),
      contentType: "application/json",
    });
  });
}

test("shared accounts, shop and package gutters match their game FAQ", async ({
  page,
}) => {
  await isolate(page);
  const pack = prepared.configuration.packages[0];
  if (!pack) throw new Error("Missing package fixture");
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    for (const suffix of [
      "?service=accounts",
      "?service=shop",
      `/packages/${pack.key}`,
    ]) {
      await page.goto(`${origin}/games/mobile-legends${suffix}`);
      await expect(page.locator(".game-faq")).toBeVisible();
      const layout = await gutterLayout(page);
      expect(Math.abs(layout.content - layout.faq)).toBeLessThanOrEqual(1);
      expect(layout.width).toBeLessThanOrEqual(width);
    }
  }
});
