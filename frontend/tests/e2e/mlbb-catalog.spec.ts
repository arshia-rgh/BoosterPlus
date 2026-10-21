import { expect, test } from "@playwright/test";
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
    root: fileURLToPath(new URL("../fixtures/mlbb-catalog", import.meta.url)),
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
    throw new Error("Missing preview address");
  origin = `http://127.0.0.1:${String(address.port)}`;
});
test.afterAll(async () => {
  await server.close();
});

test("current MLBB preferences offer exactly three WR/delivery choices and hero-count premiums", async ({
  page,
}) => {
  await page.goto(`${origin}/?catalog=167`);
  const win = page.getByRole("group", {
    name: "Win-rate preference (required)",
    exact: true,
  });
  const delivery = page.getByRole("group", {
    name: "Delivery preference (required)",
    exact: true,
  });
  await expect(win.getByRole("radio")).toHaveCount(3);
  await expect(delivery.getByRole("radio")).toHaveCount(3);
  await win
    .getByRole("radio", { name: "Exactly 100% · +200%", exact: true })
    .check();
  await delivery
    .getByRole("radio", { name: "Within 24 hours · +25%", exact: true })
    .check();
  await expect(
    page.getByLabel(/Minimum delivery hours|Maximum delivery hours/),
  ).toHaveCount(0);
  const hero = page.getByRole("group", {
    name: "Preferred heroes",
    exact: true,
  });
  await hero.getByRole("searchbox").fill("Aldous");
  await hero.getByRole("checkbox", { name: "Aldous", exact: true }).check();
  await expect(
    page.getByText("Adds 50% of the base estimate.", { exact: true }),
  ).toBeVisible();
  await hero.getByRole("searchbox").fill("Yu Zhong");
  await hero.getByRole("checkbox", { name: "Yu Zhong", exact: true }).check();
  await expect(
    page.getByText("Adds 40% of the base estimate.", { exact: true }),
  ).toBeVisible();
  await hero
    .getByRole("button", { name: "Remove Aldous", exact: true })
    .click();
  await hero
    .getByRole("button", { name: "Remove Yu Zhong", exact: true })
    .click();
  await expect(
    page.getByText("No surcharge without a selection.", { exact: true }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
// Keep each viewport independently bounded: six axe scans and full-page
// screenshots in one journey can exceed the default budget on the shared host.
// Each case retains the complete linked-choice, rank, artwork and a11y checks.
for (const width of [320, 768, 1280]) {
  test(`MLBB linked choices, actual stars and artwork remain usable at ${String(width)}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin);
    const hero = page.getByRole("group", {
      name: "Preferred heroes",
      exact: true,
    });
    const search = hero.getByRole("searchbox");
    await search.fill("Kagura");
    await hero.getByRole("checkbox", { name: "Kagura", exact: true }).check();
    await expect(
      page.getByLabel("Preferred lane", { exact: true }),
    ).toHaveValue("option_3");
    await search.fill("Miya");
    await hero.getByRole("checkbox", { name: "Miya", exact: true }).check();
    await expect(
      page.getByLabel("Preferred lane", { exact: true }),
    ).toBeDisabled();
    await hero
      .getByRole("button", { name: "Remove Miya", exact: true })
      .click();
    await expect(search).toBeFocused();
    await hero
      .getByRole("button", { name: "Clear search", exact: true })
      .click();
    await expect(hero.getByText(/1 (of \d+ )?selected/)).toBeVisible();
    await page
      .getByLabel("Server / usual play location (required)", { exact: true })
      .selectOption("option_13");
    await expect(
      page.getByLabel("Region (required)", { exact: true }),
    ).toHaveValue("option_4");
    await page
      .getByLabel("Starting rank / division (required)", { exact: true })
      .selectOption("option_27");
    const stars = page.getByLabel("Current stars (required)", {
      exact: true,
    });
    await expect(
      page
        .getByRole("region", { name: "Your goal", exact: true })
        .getByLabel("Current stars (required)", { exact: true }),
    ).toBeVisible();
    await stars.fill("6");
    await expect(stars).not.toHaveAttribute("aria-invalid", "true");
    await stars.press("Tab");
    await expect(stars).toHaveAttribute("aria-invalid", "true");
    await stars.fill("62");
    await stars.press("Tab");
    await expect(stars).not.toHaveAttribute("aria-invalid", "true");
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    const layout = await hero.evaluate((e) => {
      const search = e
        .querySelector('input[type="search"]')
        ?.getBoundingClientRect();
      const choices = e
        .querySelector(".catalog-choice-options")
        ?.getBoundingClientRect();
      return {
        display: getComputedStyle(e).display,
        searchWidth: search?.width ?? 0,
        available: e.clientWidth,
        below: !!search && !!choices && choices.top >= search.bottom,
      };
    });
    expect(layout.display).toBe("block");
    expect(layout.searchWidth).toBeGreaterThan(layout.available * 0.6);
    expect(layout.below).toBe(true);
    await page.screenshot({
      path: info.outputPath(`mlbb-form-${String(width)}.png`),
      fullPage: true,
    });
    await page
      .getByRole("link", { name: "Fixed packages", exact: true })
      .click();
    await expect(page.locator("img.package-card-artwork")).toHaveCount(4);
    for (const image of await page.locator("img.package-card-artwork").all()) {
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() => image.evaluate((e) => (e as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
    }
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`mlbb-packages-${String(width)}.png`),
      fullPage: true,
    });
  });
}
test("prepared admin imports reject stale sources and preserve the publication boundary", async ({
  page,
}, info) => {
  await page.goto(`${origin}/?section=import`);
  await page
    .getByText("Import or export a prepared configuration", { exact: true })
    .click();
  const input = page.getByLabel(/Catalog configuration/);
  await input.fill(JSON.stringify(prepared));
  await page
    .getByRole("button", { name: "Review import", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await input.fill(JSON.stringify({ ...prepared, base_revision: 242 }));
  await page
    .getByRole("button", { name: "Review import", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("outdated");
  await input.fill(JSON.stringify({ ...prepared, base_revision: 243 }));
  await page
    .getByRole("button", { name: "Review import", exact: true })
    .click();
  await expect(
    page.getByText("Replace the draft configuration for Mobile Legends", {
      exact: true,
    }),
  ).toBeVisible();
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`mlbb-import-${String(width)}.png`),
      fullPage: true,
    });
  }
  await page
    .getByRole("button", { name: "Use in unsaved draft", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("unsaved draft");
  await expect(
    page.getByRole("button", {
      name: "Export saved configuration",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Discard unsaved edits", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Export saved configuration",
      exact: true,
    }),
  ).toBeEnabled();
  const downloadPending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export saved configuration", exact: true })
    .click();
  const download = await downloadPending;
  expect(download.suggestedFilename()).toBe(
    "playora-mobile-legends-revision-243.json",
  );
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream)
    chunks.push(Buffer.from(chunk as Uint8Array));
  expect(JSON.parse(Buffer.concat(chunks).toString("utf8"))).toEqual({
    ...prepared,
    base_revision: 243,
  });
});
