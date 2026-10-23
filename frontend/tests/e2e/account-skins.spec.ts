import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";
let server: ViteDevServer, origin: string;
test.beforeAll(async () => {
  server = await createServer({
    configFile: false,
    envDir: false,
    root: fileURLToPath(new URL("../fixtures/account-skins", import.meta.url)),
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
for (const width of [390, 1280])
  test(`optional skin collection at ${String(width)}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/v1/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/images"))
        return route.fulfill({ json: { images: [] } });
      return route.fulfill({
        status: 422,
        json: {
          code: "submission_invalid",
          issues: [
            {
              path: "attribute_3.groups.0.count",
              message: "Quantity must match the number of skin names.",
            },
          ],
        },
      });
    });
    await page.goto(origin);
    await expect(
      page.getByRole("button", { name: "Add skin group" }),
    ).toBeVisible();
    await expect(
      page.getByText("Skin collection (optional)", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Does this account have skins?", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Skin category 1")).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath(`empty-${String(width)}.png`),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Add skin group" }).click();
    await expect(page.getByLabel("Skin category 1")).toBeFocused();
    await page
      .getByLabel("Skin category 1")
      .selectOption({ label: "Collector" });
    await page.getByLabel("Quantity in group 1").fill("2");
    await page.getByLabel("Skin or hero names in group 1").fill("Aldous");
    await page.getByRole("button", { name: "Save account draft" }).click();
    await expect(page.getByLabel("Quantity in group 1")).toBeFocused();
    await expect(page.getByLabel("Quantity in group 1")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.getByLabel("Quantity in group 1")).toBeInViewport();
    await page.screenshot({
      path: info.outputPath(`invalid-${String(width)}.png`),
      fullPage: true,
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Remove skin group 1" }).click();
    await expect(
      page.getByRole("button", { name: "Add skin group" }),
    ).toBeFocused();
    await expect(page.getByLabel("Skin category 1")).toHaveCount(0);
  });
