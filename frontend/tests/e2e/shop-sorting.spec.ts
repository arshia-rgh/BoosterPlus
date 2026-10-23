import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";
let server: ViteDevServer, origin: string;
test.beforeAll(async () => {
  server = await createServer({
    configFile: false,
    envDir: false,
    root: fileURLToPath(new URL("../fixtures/shop-sorting", import.meta.url)),
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
test("default, filters, all sorts and product return keep context", async ({
  page,
}, info) => {
  await page.goto(origin + "/games/example/shop");
  await expect(page.getByLabel("Sort by")).toHaveValue("diamonds_asc");
  await expect(page.locator(".shop-card h3").first()).toHaveText(
    "55 Diamonds · Global",
  );
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(
      page.getByRole("button", { name: "Apply filters" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`browse-${String(width)}.png`),
      fullPage: true,
    });
  }
  for (const [sort, first] of [
    ["diamonds_desc", "275 Diamonds · Global"],
    ["price_asc", "5 Diamonds · Indonesia"],
    ["price_desc", "Elite Bundle · Indonesia"],
    ["diamonds_asc", "55 Diamonds · Global"],
  ]) {
    await page.getByLabel("Sort by").selectOption(sort ?? "");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.locator(".shop-card h3").first()).toHaveText(first ?? "");
  }
  await page.getByLabel("Region", { exact: true }).selectOption("Indonesia");
  await page.getByLabel("Sort by").selectOption("diamonds_desc");
  await page.getByRole("button", { name: "Apply filters" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".shop-card h3").first()).toHaveText(
    "50 Diamonds · Indonesia",
  );
  await page
    .getByRole("link", { name: "View 50 Diamonds · Indonesia", exact: true })
    .click();
  await page.getByRole("link", { name: "Back to shop", exact: true }).click();
  await expect(page.getByLabel("Region", { exact: true })).toHaveValue(
    "Indonesia",
  );
  await expect(page.getByLabel("Sort by")).toHaveValue("diamonds_desc");
  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page.getByLabel("Sort by")).toHaveValue("diamonds_asc");
});
test("pagination preserves sorting and changing it resets the page", async ({
  page,
}) => {
  await page.goto(origin + "/games/example/shop?sort=price_asc");
  await page.getByRole("link", { name: "Next products" }).click();
  await expect(page).toHaveURL(/sort=price_asc.*after=fixture-next/);
  await page.getByLabel("Sort by").selectOption("diamonds_desc");
  await page.getByRole("button", { name: "Apply filters" }).click();
  expect(new URL(page.url()).searchParams.has("after")).toBe(false);
  await expect(page.locator(".shop-card h3").first()).toHaveText(
    "275 Diamonds · Global",
  );
  await page.goBack();
  await expect(page.getByLabel("Sort by")).toHaveValue("price_asc");
});
test("empty, loading and retry retain the sort control", async ({
  page,
}, info) => {
  await page.goto(origin + "/games/example/shop?q=missing&sort=price_desc");
  await expect(
    page.getByRole("heading", { name: "No matching products" }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath("empty.png"), fullPage: true });
  await page.goto(origin + "/games/example/shop?q=error&sort=price_desc");
  await expect(page.getByRole("button", { name: "Retry shop" })).toBeVisible();
  await expect(page.getByLabel("Sort by")).toHaveValue("price_desc");
  await page.screenshot({ path: info.outputPath("error.png"), fullPage: true });
  await page.goto(origin + "/games/example/shop?q=loading&sort=price_desc");
  await expect(page.getByText("Loading available products…")).toBeVisible();
  await expect(page.getByLabel("Sort by")).toHaveValue("price_desc");
  await expect(page.locator(".shop-card")).toHaveCount(3);
});
