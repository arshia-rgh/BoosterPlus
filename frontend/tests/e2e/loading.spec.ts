import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";
let server: ViteDevServer, origin: string;
test.beforeAll(async () => {
  server = await createServer({
    configFile: false,
    envDir: false,
    root: fileURLToPath(new URL("../fixtures/loading", import.meta.url)),
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

for (const path of ["/account", "/admin", "/booster"]) {
  test(`workspace loading preserves authorization and recovers at ${path}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    let finish: (state: string) => void = () => {};
    const pending = new Promise<string>((resolve) => {
      finish = resolve;
    });
    let attempts = 0;
    const portal =
      path === "/admin"
        ? "admin"
        : path === "/booster"
          ? "booster"
          : "customer";
    await page.route("**/api/v1/**", async (route) => {
      if (!new URL(route.request().url()).pathname.endsWith("/session"))
        return route.fulfill({ status: 404, json: { code: "not_found" } });
      attempts++;
      if (attempts === 1) {
        await pending;
        return route.fulfill({ status: 503, json: { code: "internal_error" } });
      }
      return route.fulfill({
        json: {
          portal,
          user: null,
          csrf_token: "x".repeat(64),
          google_enabled: false,
          google_linked: false,
          mfa_required: false,
          capabilities: [],
          terms_version: "fixture",
          terms_url: "/terms",
        },
      });
    });
    await page.goto(origin + path);
    const loading = page.locator(".playora-loading");
    await expect(loading).toBeVisible();
    await expect(page.getByText("Authorized workspace content")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Send verification code" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Checking your sign-in" }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`${portal}-390.png`),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({
      path: info.outputPath(`${portal}-1280.png`),
      fullPage: true,
    });
    await page.setViewportSize({ width: 320, height: 760 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await page
        .locator(".playora-loading-orbit")
        .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("none");
    expect(
      await page
        .locator(".playora-loading-trail span")
        .first()
        .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("none");
    finish("failed");
    await expect(
      page.getByRole("heading", { name: "Connection unavailable" }),
    ).toBeVisible();
    await expect(loading).toHaveCount(0);
    await page.getByRole("button", { name: "Retry connection" }).click();
    await expect(
      page.getByRole("button", { name: "Send verification code" }),
    ).toBeVisible();
    await expect(page.getByText("Authorized workspace content")).toHaveCount(0);
  });
}
test("compact loading fits a narrow purchase surface", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto(origin + "/account?compact");
  await expect(page.getByRole("status")).toContainText("Checking sign-in");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: info.outputPath("compact-320.png") });
});
