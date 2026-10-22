import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";
import { emptyRemedies, remedyLabels } from "../../app/payments/model";
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
    throw new Error("Missing fixture address");
  origin = `http://127.0.0.1:${String(address.port)}`;
});
test.afterAll(async () => {
  await server.close();
});
const policy = {
  id: "policy",
  data: {
    label: "PLAYORA crypto payments and service protection — hosted checkout",
    text: "Pay your agreed USD price through secure checkout. Your accepted order and refund protections remain unchanged. This full policy remains available to read before accepting payment.",
    currencies: ["USD"],
    routes: [],
    fee_mode: "merchant",
    rate_mode: "fixed",
    window_minutes: 30,
    remedies: {
      ...emptyRemedies,
      ...Object.fromEntries(
        remedyLabels.map(([key]) => [
          key,
          "Your accepted order protections remain unchanged.",
        ]),
      ),
      dispute_hours: 8760,
      appeal_hours: 720,
      max_appeals: 3,
    },
  },
};
async function fixture(page: Page, initial = "review") {
  const state = {
    mode: initial,
    posts: 0,
    gets: 0,
    departures: 0,
    failCreate: false,
  };
  await page.route("https://nowpayments.io/**", async (route) => {
    state.departures++;
    await route.fulfill({
      contentType: "text/html",
      body: "<h1>Synthetic payment page</h1>",
    });
  });
  const attempt = () => ({
    id: "attempt",
    order_id: "fixture-checkout",
    native_checkout: false,
    instruction_status: "not_applicable",
    deposit: null,
    state: state.mode === "ready" ? "awaiting_payment" : state.mode,
    issue: state.mode === "uncertain" ? "invoice_uncertain" : "",
    currency: "USD",
    amount_minor: "5000",
    route: { selection: "provider", code: "", network: "", label: "" },
    policy,
    checkout_url:
      state.mode === "ready" ? "https://nowpayments.io/payment/?iid=123" : "",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 1800000).toISOString(),
  });
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    if (request.url().endsWith("/session"))
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
    if (request.method() === "POST") {
      expect(new URL(request.url()).pathname).toBe(
        "/api/v1/orders/fixture-checkout/checkout",
      );
      state.posts++;
      expect(request.postDataJSON()).toEqual({
        contract_id: "contract",
        policy_id: "policy",
        accept_policy: true,
      });
      if (state.failCreate)
        return route.fulfill({
          status: 503,
          json: { code: "payments_unavailable" },
        });
      state.mode = "new";
      return route.fulfill({ json: attempt() });
    }
    expect([
      "/api/v1/orders/fixture-checkout/payments",
      "/api/v1/admin/orders/fixture-checkout/payments",
    ]).toContain(new URL(request.url()).pathname);
    state.gets++;
    if (state.mode === "error")
      return route.fulfill({
        status: 503,
        json: { code: "payments_unavailable" },
      });
    return route.fulfill({
      json: {
        server_time: new Date().toISOString(),
        enabled: state.mode !== "paused",
        policy,
        attempts: ["review", "paused"].includes(state.mode) ? [] : [attempt()],
        receipts: [],
      },
    });
  });
  return state;
}
async function checkLayout(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
}
for (const width of [320, 390, 1440]) {
  test(`payment disclosures and preparation at ${String(width)}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 960 });
    await page.clock.install();
    const state = await fixture(page);
    await page.goto(origin);
    await expect(page.getByText("Agreed price: USD 50.00")).toBeVisible();
    await expect(
      page.getByText("Processing fees", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText("Exchange rate", { exact: true })).toHaveCount(
      0,
    );
    const disclosures = page.locator("details.payment-policy-disclosure");
    await expect(disclosures).toHaveCount(2);
    await expect(
      page.locator("details.payment-policy-disclosure[open]"),
    ).toHaveCount(0);
    await checkLayout(page);
    await page.screenshot({
      path: info.outputPath(`overview-${String(width)}.png`),
      fullPage: true,
    });
    await disclosures.first().locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText(policy.data.text)).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`policy-${String(width)}.png`),
      fullPage: true,
    });
    await page.keyboard.press("Enter");
    await page
      .getByLabel("I accept this payment policy and the agreed order price")
      .check();
    await page.getByRole("button", { name: "Go to payment" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Preparing your secure checkout.",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading")).toBeFocused();
    await checkLayout(page);
    await page.screenshot({
      path: info.outputPath(`preparing-${String(width)}.png`),
      fullPage: false,
    });
    // Native modal focus cannot move onto the order behind the overlay.
    await page.evaluate(() =>
      document.querySelector<HTMLElement>(".payment-panel > h2")?.focus(),
    );
    await expect(dialog.getByRole("heading")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button")).toBeFocused();
    state.mode = "creating";
    await page.clock.fastForward(16000);
    await expect(dialog.getByText(/taking a little longer/)).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: "Contact order support" }),
    ).toHaveAttribute("href", "/orders/fixture-checkout?section=messages");
    await checkLayout(page);
    await page.screenshot({
      path: info.outputPath(`delayed-${String(width)}.png`),
      fullPage: false,
    });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Payment and receipts" }),
    ).toBeFocused();
    await page.clock.fastForward(30000);
    await expect(dialog).not.toBeVisible();
    expect(state.posts).toBe(1);
    await page.screenshot({
      path: info.outputPath(`dismissed-${String(width)}.png`),
      fullPage: true,
    });
    state.mode = "ready";
    await page.clock.fastForward(11000);
    await expect(
      page.getByRole("heading", { name: "Synthetic payment page" }),
    ).toBeVisible();
    expect(state.departures).toBe(1);
    expect(state.posts).toBe(1);
  });
}
for (const outcome of ["uncertain", "error", "paused", "settled", "closed"]) {
  test(`preparation releases the customer on ${outcome}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 390, height: 960 });
    await page.clock.install();
    const state = await fixture(page, "creating");
    await page.goto(origin);
    await expect(page.getByRole("dialog")).toBeVisible();
    state.mode = outcome;
    await page.clock.fastForward(11000);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(".payment-panel")).toBeVisible();
    await checkLayout(page);
    await page.screenshot({
      path: info.outputPath(`${outcome}-390.png`),
      fullPage: true,
    });
    expect(state.posts).toBe(0);
    expect(state.departures).toBe(0);
  });
}
test("admin, recovery and existing payment link do not open a preparation modal", async ({
  page,
}) => {
  const state = await fixture(page, "creating");
  await page.goto(`${origin}/?admin`);
  await expect(
    page.getByRole("heading", { name: "Payment and receipts" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  state.mode = "awaiting_payment";
  await page.goto(origin);
  await expect(
    page.getByRole("heading", { name: "Recovering your payment link" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  state.mode = "ready";
  await page.reload();
  await expect(page.getByRole("link", { name: "Go to payment" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.departures).toBe(0);
  expect(state.posts).toBe(0);
});
test("a failed create closes preparation and focuses its error", async ({
  page,
}) => {
  const state = await fixture(page);
  state.failCreate = true;
  await page.goto(origin);
  await page
    .getByLabel("I accept this payment policy and the agreed order price")
    .check();
  await page.getByRole("button", { name: "Go to payment" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        !!document.activeElement?.querySelector("[role=alert]") ||
        document.activeElement?.getAttribute("role") === "alert",
    ),
  ).toBe(true);
  expect(state.posts).toBe(1);
});

test("going offline closes preparation without creating or navigating", async ({
  page,
}) => {
  const state = await fixture(page, "creating");
  await page.goto(origin);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.context().setOffline(true);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Payment and receipts" }),
  ).toBeFocused();
  expect(state.posts).toBe(0);
  expect(state.departures).toBe(0);
  await page.context().setOffline(false);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("reduced motion keeps the branded preparation state readable without animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await fixture(page, "creating");
  await page.goto(origin);
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page
      .locator(".payment-preparation-dialog .playora-loading-orbit")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  await page.getByRole("button", { name: "View order while we wait" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
