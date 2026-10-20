import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";

const servers: ViteDevServer[] = [];
let categoriesOrigin: string, purchaseOrigin: string;
async function fixtureOrigin(directory: string) {
  const server = await createServer({
    configFile: false,
    envDir: false,
    cacheDir: fileURLToPath(
      new URL(`../../.cache/delivery-review-${directory}`, import.meta.url),
    ),
    root: fileURLToPath(new URL(`../fixtures/${directory}`, import.meta.url)),
    publicDir: fileURLToPath(new URL("../../public", import.meta.url)),
    server: {
      host: "127.0.0.1",
      port: 0,
      fs: { allow: [fileURLToPath(new URL("../../../", import.meta.url))] },
    },
    logLevel: "error",
  });
  servers.push(server);
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string")
    throw new Error("Missing isolated fixture address");
  return `http://127.0.0.1:${String(address.port)}`;
}
test.beforeAll(async () => {
  categoriesOrigin = await fixtureOrigin("supplier-delivery-categories");
  purchaseOrigin = await fixtureOrigin("supplier-shop");
});
test.afterAll(async () => {
  for (const server of servers) await server.close();
});
test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    const hostname = new URL(route.request().url()).hostname;
    if (hostname !== "127.0.0.1") return route.abort();
    await route.continue();
  });
});
async function capture(page: Page, info: TestInfo, name: string) {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`${name}-${String(width)}.png`),
      fullPage: true,
    });
  }
}

for (const [method, label] of [
  ["id", "Instant top-up"],
  ["code", "Instant code delivery"],
  ["account", "Account sign-in · 24–72 hours"],
] as const) {
  test(`supplier ${method} terms, preview and frozen agreement show its category`, async ({
    page,
  }, info) => {
    await page.goto(`${categoriesOrigin}/?method=${method}`);
    await expect(
      page
        .getByRole("region", { name: "Product terms", exact: true })
        .getByText(label, { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Minimum delivery hours")).toHaveCount(0);
    await expect(page.getByLabel("Maximum delivery hours")).toHaveCount(0);
    await expect(
      page
        .getByRole("region", { name: "Product preview", exact: true })
        .getByText(label, { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Accepted agreement", exact: true })
        .getByText(
          `${label} after verified payment and complete required details. Follow the order status for confirmed delivery.`,
        ),
    ).toBeVisible();
    await expect(page.getByText("0–0 hours", { exact: false })).toHaveCount(0);
    await capture(page, info, method);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}

test("historic positive-hour supplier agreement retains its accepted estimate", async ({
  page,
}, info) => {
  await page.goto(`${categoriesOrigin}/?method=id&historical=true`);
  await expect(
    page
      .getByRole("region", { name: "Product preview", exact: true })
      .getByText("1–24 hours", { exact: true }),
  ).toBeVisible();
  const agreement = page.getByRole("region", {
    name: "Accepted agreement",
    exact: true,
  });
  await expect(
    agreement.getByText(
      "Delivery estimate: 1–24 hours after fulfillment can start.",
    ),
  ).toBeVisible();
  await expect(agreement.getByText(/Instant top-up/)).toHaveCount(0);
  await capture(page, info, "historical");
});

test("manual product keeps editable hours and staff fulfillment", async ({
  page,
}, info) => {
  await page.goto(`${categoriesOrigin}/?manual=true`);
  await expect(page.getByLabel("Minimum delivery hours")).toHaveValue("1");
  await expect(page.getByLabel("Maximum delivery hours")).toHaveValue("24");
  const preview = page.getByRole("region", {
    name: "Product preview",
    exact: true,
  });
  await expect(preview.getByText("1–24 hours", { exact: true })).toBeVisible();
  await expect(
    preview.getByText(/PLAYORA staff fulfill this manual product/),
  ).toBeVisible();
  await page.getByLabel("Minimum delivery hours").fill("2");
  await expect(preview.getByText("2–24 hours", { exact: true })).toBeVisible();
  await capture(page, info, "manual");
});

for (const [method, label] of [
  ["id", "Instant top-up"],
  ["code", "Instant code delivery"],
] as const) {
  test(`${method} purchase review keeps the instant category and verified-payment requirement`, async ({
    page,
  }, info) => {
    await page.goto(
      `${purchaseOrigin}/games/example/shop/synthetic-product?method=${method}&timing=instant`,
    );
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    if (method === "id") {
      await page.getByLabel("Player ID").fill("synthetic-player");
      await page.getByLabel("Server", { exact: true }).selectOption("eu");
    }
    await page.getByLabel("Quantity", { exact: true }).fill("1.5");
    await page.getByRole("button", { name: "Review current price" }).click();
    await expect(
      page.getByRole("heading", { name: "Review your order" }),
    ).toBeFocused();
    await expect(
      page.getByText(`${label} · Türkiye`, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("USD 17.25", { exact: true })).toBeVisible();
    await expect(page.getByText("0–0 hours", { exact: false })).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        window.nexusUIRequests.filter((request) =>
          request.path.endsWith("/supplier-reserve"),
        ),
      ),
    ).toEqual([]);
    await capture(page, info, `purchase-${method}`);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
