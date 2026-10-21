import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";
let server: ViteDevServer, origin: string;
test.beforeAll(async () => {
  server = await createServer({
    configFile: false,
    envDir: false,
    root: fileURLToPath(new URL("../fixtures/suppliers", import.meta.url)),
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
test("draft filters show unprepared offers separately from existing listings", async ({
  page,
}, info) => {
  await page.goto(origin + "/admin/shop/suppliers?stage=listing-filter");
  const products = page.getByRole("list", { name: "Imported products" });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.getByLabel("PLAYORA drafts").selectOption("not_added");
    await expect(
      products.getByRole("heading", { name: /Weekly Diamond Pass/ }),
    ).toBeVisible();
    await expect(
      products.getByRole("heading", { name: /86 Diamonds/ }),
    ).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath(`not-added-${String(width)}.png`),
      fullPage: true,
    });
    await page.getByLabel("PLAYORA drafts").selectOption("added");
    await expect(
      products.getByRole("link", { name: "Open listing draft" }),
    ).toBeVisible();
    await expect(
      products.getByRole("heading", { name: /Weekly Diamond Pass/ }),
    ).toHaveCount(0);
    await page.getByLabel("PLAYORA drafts").selectOption("");
    await expect(products.getByRole("heading")).toHaveCount(2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
});
test("private library and exact pricing are readable across responsive layouts", async ({
  page,
}, info) => {
  await page.goto(origin + "/admin/shop/suppliers");
  await expect(page.getByText("2 imported products · 2 offers")).toBeVisible();
  for (const width of [1440, 768, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`library-${String(width)}.png`),
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Review Player ID" }).click();
  await expect(
    page.getByRole("heading", { name: "Mobile Legends · 86 Diamonds" }),
  ).toBeFocused();
  await page.getByLabel("Price rule").selectOption("fixed");
  await page.getByLabel("Fixed unit selling price (USD)").fill("12.345");
  await page.getByRole("button", { name: "Save private offer" }).click();
  await expect(page.getByLabel("Fixed unit selling price (USD)")).toBeFocused();
  await expect(
    page.getByText(
      "Enter a positive USD price with at most two decimal places.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByLabel("Price rule").selectOption("default");
  await expect(
    page.getByText("Check the highlighted fields before continuing."),
  ).toHaveCount(0);
  await expect(page.getByLabel("Fixed unit selling price (USD)")).toHaveCount(
    0,
  );
  await page.getByLabel("Price rule").selectOption("fixed");
  await page.getByLabel("Fixed unit selling price (USD)").fill("12.50");
  await expect(page.getByText("USD 12.50")).toBeVisible();
  await expect(
    page.getByText("Check the highlighted fields before continuing."),
  ).toHaveCount(0);
  await expect(page.getByText("Nexus · Sandbox · Private offer")).toBeVisible();
  await page
    .getByLabel("PLAYORA game")
    .selectOption("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  await page.getByLabel("Reviewed account region").fill("Global");
  await page.getByLabel("Reviewed delivery method").selectOption("id");
  for (const width of [1440, 768, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`offer-${String(width)}.png`),
      fullPage: true,
    });
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Save private offer" }).click();
  await expect(
    page.getByText("Private offer saved. Nothing was published."),
  ).toBeVisible();
  await expect(page.getByText("USD 12.50")).toBeVisible();
  await page.getByRole("button", { name: "Default markup: 15.00%" }).click();
  await page.getByLabel("Default markup (%)").fill("1001");
  await page.getByRole("button", { name: "Save default markup" }).click();
  await expect(page.getByLabel("Default markup (%)")).toBeFocused();
  await page.getByLabel("Default markup (%)").fill("20");
  await expect(
    page.getByText("Check the highlighted fields before continuing."),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Save default markup" }).click();
  await expect(
    page.getByText(
      "Default markup saved. Fixed prices and individual overrides were preserved.",
    ),
  ).toBeVisible();
  await expect(page.getByText("USD 12.50")).toBeVisible();
  await page.getByRole("button", { name: "Import private catalog" }).click();
  await expect(
    page.getByRole("button", { name: "Cancel import" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Import complete: 2 products and 2 offers. Nothing was published.",
    ),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("USD 12.50")).toBeVisible();
});
test("failure, conflict, cancelled imports and session expiry preserve clear recovery", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto(origin + "/admin/shop/suppliers?stage=empty");
  await expect(
    page.getByRole("heading", { name: "Start with a private import" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Import private catalog" }).click();
  await page.getByRole("button", { name: "Cancel import" }).click();
  await expect(
    page.getByText(
      "Import cancelled. The previous complete catalog is unchanged.",
    ),
  ).toBeVisible();
  await page.goto(origin + "/admin/shop/suppliers?stage=conflict");
  await page.getByRole("button", { name: "Review Account sign-in" }).click();
  await page.getByLabel("Reviewed account region").fill("Türkiye");
  await page.getByRole("button", { name: "Save private offer" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "The catalog or saved settings changed",
  );
  await expect(page.getByLabel("Reviewed account region")).toHaveValue(
    "Türkiye",
  );
  await page.getByRole("button", { name: "Back to products" }).click();
  await expect(
    page.getByRole("heading", { name: "Discard these offer changes?" }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("conflict-390.png"),
    fullPage: true,
  });
  await page.evaluate(() => {
    window.supplierFixtureRequests = [];
  });
  await page.getByRole("button", { name: "Discard changes" }).click();
  await page.getByRole("button", { name: "Reload saved settings" }).click();
  await page.getByRole("button", { name: "Review Account sign-in" }).click();
  await expect(page.getByLabel("Reviewed account region")).toHaveValue(
    "Saved by another administrator",
  );
  expect(
    await page.evaluate(() =>
      window.supplierFixtureRequests.filter(
        (request) => request.method === "POST",
      ),
    ),
  ).toEqual([]);
  await page.getByLabel("Reviewed account region").fill("Türkiye");
  await page.getByRole("button", { name: "Save private offer" }).click();
  await expect(
    page.getByText("Private offer saved. Nothing was published."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review Account sign-in" }).click();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("boosterplus:session-changed", {
        detail: { portal: "admin" },
      }),
    ),
  );
  await expect(
    page.getByRole("heading", { name: "Admin access changed" }),
  ).toBeVisible();
  await expect(page.getByLabel("Reviewed account region")).toHaveCount(0);
  await page.goto(origin + "/admin/shop/suppliers?stage=error");
  await expect(
    page.getByRole("button", { name: "Retry supplier library" }),
  ).toBeVisible();
  await expect(page.getByText("Supplier unit cost")).toHaveCount(0);
});
