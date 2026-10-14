import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";
let server: ViteDevServer, origin: string;
test.beforeAll(async () => {
  server = await createServer({
    configFile: false,
    envDir: false,
    root: fileURLToPath(new URL("../fixtures/manual-payout", import.meta.url)),
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
test("manual payout validates evidence, verifies the owner and preserves a completed receipt", async ({
  page,
}) => {
  let verified = false,
    saved = 0;
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const send = (json: unknown, status = 200) =>
      route.fulfill({ status, json });
    if (path.endsWith("/session"))
      return send({
        portal: "admin",
        user: {
          id: "fixture-owner",
          portal: "admin",
          email: "owner@example.invalid",
          display_name: "Fixture",
          role: "owner",
          staff_alias: "",
          suspended: false,
          mfa_enabled: true,
          notify_updates: false,
        },
        csrf_token: "x".repeat(64),
        google_enabled: false,
        google_linked: false,
        mfa_required: false,
        capabilities: ["owner"],
        terms_version: "fixture",
        terms_url: "/terms",
      });
    if (path.endsWith("/mfa/verify")) {
      verified = true;
      return send({ recovery_codes: [] });
    }
    if (path.endsWith("/manual")) {
      if (!verified) return send({ code: "recent_auth_required" }, 403);
      saved++;
      const input = route.request().postDataJSON() as Record<string, unknown>;
      expect(input.amount).toBe("90.000000");
      expect(input.network).toBe("bsc");
      return send({
        id: "synthetic-payout",
        order_id: "",
        case_id: "",
        receipt_id: "",
        kind: "seller_payout",
        currency: "usdtbsc",
        network: "bsc",
        amount: "90.000000",
        terms: "Synthetic accepted offer",
        state: "confirmed",
        issue: "",
        version: 4,
        recipient: input.recipient,
        recipient_at: "2026-01-01T00:00:00Z",
        approved_at: "2026-01-02T01:00:00Z",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T01:00:00Z",
        manual_receipt: {
          id: "receipt",
          transaction_hash: input.transaction_hash,
          completed_at: input.completed_at,
          recorded_at: "2026-01-02T01:00:00Z",
        },
      });
    }
    throw new Error(`Unexpected isolated request: ${path}`);
  });
  await page.goto(`${origin}/?state=read-failure`);
  const button = page.getByRole("button", { name: "Record completed payout" });
  await expect(button).toBeDisabled();
  await page.getByRole("checkbox").check();
  await button.click();
  await expect(page.getByLabel("Transaction hash")).toBeFocused();
  await page.getByLabel("Transaction hash").fill(`0x${"ab".repeat(32)}`);
  await page.getByLabel("Transfer completion time").fill("2026-01-02T12:00");
  await page
    .getByLabel("Verification note")
    .fill("Verified the completed synthetic transfer and exact destination.");
  await page.getByRole("checkbox").check();
  await button.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(
    "Record this completed external seller payout",
  );
  await dialog.getByLabel(/authenticator code/i).fill("123456");
  await dialog.getByRole("button", { name: "Verify and continue" }).click();
  const receipt = page.getByRole("region", { name: "Manual payout saved" });
  await expect(receipt).toBeFocused();
  await expect(receipt).toContainText("do not send the payment again");
  await expect(receipt).toContainText("not automatically verified");
  expect(saved).toBe(1);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test("manual hold and seller receipt fit narrow screens without owner actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto(`${origin}/?state=held`);
  await expect(
    page.getByText(/accepted payout conditions are not met/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Record completed payout" }),
  ).toHaveCount(0);
  await page.goto(`${origin}/?state=seller`);
  await expect(
    page.getByRole("region", { name: /Manual payout receipt/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Record completed payout" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test("manual payout states stay readable at desktop and narrow widths", async ({
  page,
}, info) => {
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    for (const state of ["ready", "held", "seller", "completed"]) {
      await page.goto(`${origin}/?state=${state}`);
      await expect(
        page.getByRole("heading", { name: "Seller payout", exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: info.outputPath(`${state}-${String(width)}.png`),
        fullPage: true,
      });
    }
  }
});
