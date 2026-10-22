import { paymentRoutes, manualPayoutNetwork } from "../../app/payments/routes";
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
    root: fileURLToPath(new URL("../fixtures/payment-hosted", import.meta.url)),
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

const policy = {
  id: "policy",
  data: {
    routes: [
      { code: "usdtbsc", label: "USDT on BNB Smart Chain", network: "bsc" },
    ],
    currencies: ["USD"],
    remedies: null,
    label: "Payment agreement",
    text: "Pay the agreed USD price on the secure payment page. Your order starts only after payment is verified.",
    fee_mode: "merchant",
    rate_mode: "fixed",
    window_minutes: 30,
  },
};
async function isolate(page: Page, mode = "ready") {
  const state = { posts: 0, unexpected: [] as string[], body: null as unknown };
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path.endsWith("/session"))
      return route.fulfill({
        json: {
          portal: "customer",
          user: {
            id: "fixture",
            portal: "customer",
            email: "fixture@example.invalid",
            display_name: "Fixture",
            role: "customer",
            staff_alias: "",
            suspended: false,
            mfa_enabled: false,
            notify_updates: false,
          },
          csrf_token: "x".repeat(64),
          google_enabled: false,
          google_linked: false,
          mfa_required: false,
          capabilities: ["account"],
          terms_version: "fixture",
          terms_url: "/terms",
        },
      });
    if (req.method() !== "GET") {
      state.posts++;
      state.body = req.postDataJSON();
      return route.fulfill({
        status: 503,
        json: { code: "payments_unavailable" },
      });
    }
    if (!path.endsWith("/payments")) {
      state.unexpected.push(path);
      return route.fulfill({ status: 404, json: { code: "unexpected_read" } });
    }
    if (mode === "error")
      return route.fulfill({
        status: 503,
        json: { code: "payments_unavailable" },
      });
    const attempt = {
      id: "attempt",
      order_id: "fixture-checkout",
      native_checkout: false,
      instruction_status: "not_applicable",
      deposit: null,
      state:
        mode === "recovery"
          ? "awaiting_payment"
          : mode === "paid"
            ? "settled"
            : mode === "creating"
              ? "creating"
              : "awaiting_payment",
      issue: "",
      currency: "USD",
      amount_minor: "5000",
      route: { selection: "provider", code: "", network: "", label: "" },
      policy,
      checkout_url:
        mode === "waiting" ? "https://nowpayments.io/payment/?iid=123" : "",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 1800000).toISOString(),
    };
    return route.fulfill({
      json: {
        server_time: new Date().toISOString(),
        enabled: mode !== "paused",
        policy,
        attempts: ["ready", "paused"].includes(mode) ? [] : [attempt],
        receipts:
          mode === "paid"
            ? [
                {
                  id: "receipt",
                  state: "confirmed",
                  currency: "usdtbsc",
                  network: "bsc",
                  amount: "50",
                  allocated_currency: "USD",
                  allocated_minor: "5000",
                  created_at: new Date().toISOString(),
                },
              ]
            : [],
      },
    });
  });
  return state;
}
for (const width of [390, 1440]) {
  for (const mode of [
    "ready",
    "creating",
    "recovery",
    "waiting",
    "paid",
    "error",
    "paused",
  ]) {
    test(`hosted ${mode} at ${String(width)}`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 960 });
      const state = await isolate(page, mode);
      await page.goto(origin);
      await expect(
        page.getByRole("heading", { name: "Payment and receipts" }),
      ).toBeVisible();
      if (mode === "ready") {
        await expect(page.getByText("Agreed price: USD 50.00")).toBeVisible();
        await expect(page.getByRole("radio")).toHaveCount(0);
        await expect(
          page.getByRole("button", { name: "Go to payment" }),
        ).toBeDisabled();
        await page
          .getByLabel("I accept this payment policy and the agreed order price")
          .check();
        await expect(
          page.getByRole("button", { name: "Go to payment" }),
        ).toBeEnabled();
      } else if (mode === "recovery")
        await expect(
          page.getByRole("heading", { name: "Recovering your payment link" }),
        ).toBeVisible();
      else if (mode === "waiting")
        await expect(
          page.getByRole("link", { name: "Go to payment" }),
        ).toHaveAttribute("href", "https://nowpayments.io/payment/?iid=123");
      else if (mode === "paid") {
        await expect(page.getByText("50 USDT")).toBeVisible();
        await expect(
          page.getByText("BNB Smart Chain (BEP20) · confirmed"),
        ).toBeVisible();
      } else if (mode === "error")
        await expect(
          page.getByRole("button", { name: "Try payment information again" }),
        ).toBeVisible();
      else if (mode === "paused")
        await expect(
          page.getByText(/Checkout is currently unavailable/),
        ).toBeVisible();
      else
        await expect(
          page
            .locator(".payment-current")
            .getByRole("heading", { name: /Preparing/i }),
        ).toBeVisible();
      await expect(
        page.getByText("Payment asset", { exact: true }),
      ).toHaveCount(0);
      expect(
        (await new AxeBuilder({ page }).include("main").analyze()).violations,
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`${mode}-${String(width)}.png`),
        fullPage: true,
      });
      expect(state.posts).toBe(0);
      expect(state.unexpected).toEqual([]);
    });
  }
  test(`admin payout choices are separate at ${String(width)}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 960 });
    await isolate(page);
    await page.goto(`${origin}/?policy`);
    await expect(
      page.getByText("Seller payout assets and networks", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(
      paymentRoutes.filter((r) => manualPayoutNetwork(r.network)).length + 1,
    );
    await page.getByLabel("Find a coin or network").fill("USDT");
    await page.screenshot({
      path: info.outputPath(`payout-${String(width)}.png`),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Preview saved payment policy" })
      .click();
    await expect(page.locator(".payment-policy-preview")).not.toContainText(
      "Supported assets",
    );
    await expect(page.locator(".payment-policy-preview")).not.toContainText(
      "usdtbsc",
    );
    await page.screenshot({
      path: info.outputPath(`preview-${String(width)}.png`),
      fullPage: true,
    });
    expect(
      (await new AxeBuilder({ page }).include("main").analyze()).violations,
    ).toEqual([]);
  });
}
for (const kind of ["custom", "package", "account", "shop"]) {
  test(`${kind} submits no coin or minimum request`, async ({ page }) => {
    const state = await isolate(page);
    await page.goto(`${origin}/?kind=${kind}`);
    await page
      .getByLabel("I accept this payment policy and the agreed order price")
      .check();
    await page.getByRole("button", { name: "Go to payment" }).click();
    await expect.poll(() => state.posts).toBe(1);
    expect(state.body).toEqual({
      contract_id: "contract",
      policy_id: "policy",
      accept_policy: true,
    });
    expect(state.unexpected).toEqual([]);
    await expect(
      page.getByRole("button", { name: "Go to payment" }),
    ).toBeDisabled();
  });
}
