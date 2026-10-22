import { paymentRoutes } from "../../app/payments/routes";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";

let server: ViteDevServer;
let origin: string;
test.beforeAll(async () => {
  server = await createServer({
    configFile: false,
    envDir: false,
    root: fileURLToPath(
      new URL("../fixtures/payment-minimums", import.meta.url),
    ),
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
    throw new Error("Missing isolated address");
  origin = `http://127.0.0.1:${String(address.port)}`;
});
test.afterAll(async () => {
  await server.close();
});

const routes = [
  { code: "usdtbsc", label: "USDT", network: "BNB Smart Chain (BEP20)" },
  { code: "usdttrc20", label: "USDT", network: "TRON (TRC20)" },
];
async function isolate(page: Page, mode = "mixed", choices = routes) {
  const state = { mode, posts: 0, reads: 0 };
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() !== "GET") {
      state.posts++;
      return route.fulfill({
        status: 503,
        json: { code: "payments_unavailable" },
      });
    }
    if (path.endsWith("/payments/options")) {
      state.reads++;
      if (state.mode === "loading") return;
      if (state.mode === "error")
        return route.fulfill({
          status: 503,
          json: { code: "payments_unavailable" },
        });
      return route.fulfill({
        json: {
          contract_id: state.mode === "stale" ? "old-contract" : "contract",
          policy_id: "policy",
          currency: "USD",
          amount_minor: "5000",
          server_time: new Date().toISOString(),
          routes: choices.map((v, i) => ({
            code: v.code,
            status:
              state.mode === "all-below" || i ? "below_minimum" : "available",
            minimum_crypto: i ? "60" : state.mode === "all-below" ? "55" : "5",
            minimum_fiat: i ? "60" : state.mode === "all-below" ? "55" : "5",
            checked_at: new Date().toISOString(),
            valid_until: new Date(Date.now() + 86400000).toISOString(),
          })),
        },
      });
    }
    if (path.endsWith("/payments"))
      return route.fulfill({
        json: {
          server_time: new Date().toISOString(),
          enabled: true,
          attempts: [],
          receipts: [],
          policy: {
            id: "policy",
            data: {
              routes: choices,
              currencies: ["USD"],
              remedies: null,
              label: "Payment agreement",
              text: "Pay the agreed order price using the selected coin and network.",
              fee_mode: "merchant",
              rate_mode: "fixed",
              window_minutes: 30,
            },
          },
        },
      });
    return route.fulfill({ status: 404, json: { code: "fixture_not_found" } });
  });
  return state;
}

for (const width of [390, 1440]) {
  test(`minimum choices reflow and stay readable at ${String(width)}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 960 });
    const state = await isolate(page);
    await page.goto(origin);
    await expect(page.getByRole("radio", { name: /BEP20/ })).toBeEnabled();
    await expect(page.getByRole("radio", { name: /TRC20/ })).toBeDisabled();
    await page.getByRole("radio", { name: /BEP20/ }).check();
    await page
      .getByLabel("I accept this payment policy and the agreed order price")
      .check();
    await expect(
      page.getByRole("button", { name: "Go to payment" }),
    ).toBeEnabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (await new AxeBuilder({ page }).include("main").analyze()).violations,
    ).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`mixed-${String(width)}.png`),
      fullPage: true,
    });
    state.mode = "all-below";
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.getByRole("radio", { name: /BEP20/ })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Go to payment" }),
    ).toBeDisabled();
    await expect(
      page.getByLabel(
        "I accept this payment policy and the agreed order price",
      ),
    ).not.toBeChecked();
    await page.screenshot({
      path: info.outputPath(`all-below-${String(width)}.png`),
      fullPage: true,
    });
    state.mode = "mixed";
    await page.getByRole("button", { name: "Check again" }).click();
    await expect(page.getByRole("radio", { name: /BEP20/ })).toBeEnabled();
    await expect(page.getByRole("radio", { name: /BEP20/ })).not.toBeChecked();
    expect(state.posts).toBe(0);
  });
}
for (const mode of ["loading", "error", "all-below", "stale"]) {
  test(`selection fails closed for ${mode}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const state = await isolate(page, mode);
    await page.goto(origin);
    await expect(page.getByRole("radio")).toHaveCount(2);
    if (mode === "loading")
      await expect(page.getByText("Checking payment options…")).toBeVisible();
    else if (mode === "all-below")
      await expect(
        page.getByText(
          "This order is below the minimum for the available payment options.",
        ),
      ).toBeVisible();
    else
      await expect(
        page.getByText("Payment options couldn’t be checked. Try again."),
      ).toBeVisible();
    for (const radio of await page.getByRole("radio").all())
      await expect(radio).toBeDisabled();
    await expect(
      page.getByLabel(
        "I accept this payment policy and the agreed order price",
      ),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Go to payment" }),
    ).toBeDisabled();
    await page.screenshot({
      path: info.outputPath(`${mode}.png`),
      fullPage: true,
    });
    expect(state.posts).toBe(0);
  });
}
for (const kind of ["custom", "package", "account", "shop"]) {
  test(`${kind} uses the same minimum eligibility before checkout`, async ({
    page,
  }) => {
    const state = await isolate(page);
    await page.goto(`${origin}/?kind=${kind}`);
    await expect(page.getByRole("radio", { name: /BEP20/ })).toBeEnabled();
    await expect(page.getByRole("radio", { name: /TRC20/ })).toBeDisabled();
    expect(state.reads).toBe(1);
    expect(state.posts).toBe(0);
  });
}

for (const width of [390, 1440]) {
  test(`selected option is cleared after a failed refresh at ${String(width)}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 960 });
    const state = await isolate(page);
    await page.goto(origin);
    await page.getByRole("radio", { name: /BEP20/ }).check();
    const consent = page.getByLabel(
      "I accept this payment policy and the agreed order price",
    );
    await consent.check();
    state.mode = "error";
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(
      page.getByText("Your previous payment option is no longer available."),
    ).toBeVisible();
    await expect(consent).not.toBeChecked();
    await expect(consent).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Go to payment" }),
    ).toBeDisabled();
    await page.screenshot({
      path: info.outputPath(`selected-error-${String(width)}.png`),
      fullPage: true,
    });
    expect(state.posts).toBe(0);
  });
}

for (const width of [390, 1440]) {
  test(`thirty payment routes remain navigable at ${String(width)}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 960 });
    const state = await isolate(page, "mixed", paymentRoutes);
    await page.goto(origin);
    await expect(page.getByRole("radio")).toHaveCount(30);
    await page.getByRole("radio", { name: /BTC/ }).check();
    await expect(page.getByText(/Use BTC on Bitcoin only/)).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`thirty-${String(width)}.png`),
      fullPage: true,
    });
    await page.getByLabel("Find a coin or network").fill("TRON");
    await expect(page.getByText("Selected:")).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(4);
    await page.screenshot({
      path: info.outputPath(`filtered-${String(width)}.png`),
      fullPage: true,
    });
    await page.getByLabel("Find a coin or network").fill("no-such-network");
    await expect(page.getByText("No matching coin or network.")).toBeVisible();
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(page.getByRole("radio", { name: /BTC/ })).toBeChecked();
    expect(
      (await new AxeBuilder({ page }).include("main").analyze()).violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    state.mode = "all-below";
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.getByRole("radio", { name: /BTC/ })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Go to payment" }),
    ).toBeDisabled();
    await page.screenshot({
      path: info.outputPath(`thirty-disabled-${String(width)}.png`),
      fullPage: true,
    });
    expect(state.posts).toBe(0);
  });
  test(`admin canonical picker at ${String(width)}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto(`${origin}/?policy`);
    await expect(page.getByRole("checkbox")).toHaveCount(31);
    await expect(
      page.getByRole("region", { name: "Saved options needing review" }),
    ).toBeVisible();
    const collision = page.getByRole("checkbox", {
      name: "USDT · BNB Smart Chain (BEP20)",
    });
    await expect(collision).toBeDisabled();
    await expect(collision).not.toBeChecked();
    await page.getByLabel("Find a coin or network").fill("usdtbsc");
    await page.screenshot({
      path: info.outputPath(`policy-collision-${String(width)}.png`),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Remove Old USDT" }).click();
    await expect(collision).toBeEnabled();
    await collision.check();
    await page.getByRole("button", { name: "Clear search" }).click();
    await page.screenshot({
      path: info.outputPath(`policy-${String(width)}.png`),
      fullPage: true,
    });
    await page.getByRole("checkbox", { name: "Selected only" }).check();
    await page.getByLabel("Find a coin or network").fill("USDT");
    await page.screenshot({
      path: info.outputPath(`policy-selected-${String(width)}.png`),
      fullPage: true,
    });
    expect(
      (await new AxeBuilder({ page }).include("main").analyze()).violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
