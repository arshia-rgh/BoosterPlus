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
  await expect(page.getByRole("button", { name: /^Filters/ })).toBeVisible();
  await expect(page.locator(".shop-card h3").first()).toHaveText(
    "55 Diamonds · Global",
  );
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.getByRole("button", { name: /^Filters/ })).toBeVisible();
    const badge = page.locator(".shop-card .shop-region-badge").first();
    await expect(badge.locator('svg[data-region="global"]')).toBeVisible();
    const artBox = await page
      .locator(".shop-card .shop-artwork-frame")
      .first()
      .boundingBox();
    const badgeBox = await badge.boundingBox();
    expect(
      artBox &&
        badgeBox &&
        badgeBox.x >= artBox.x &&
        badgeBox.x - artBox.x <= 16 &&
        badgeBox.y - artBox.y <= 16,
    ).toBe(true);
    const price = page
      .locator(".shop-card .shop-published-price strong")
      .first();
    await expect(price).toBeVisible();
    await expect(price).not.toContainText("From");
    expect(
      Number(await price.evaluate((el) => getComputedStyle(el).fontWeight)),
    ).toBeGreaterThanOrEqual(650);
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
    await page.getByRole("button", { name: /^Filters/ }).click();
    await page.getByLabel("Sort by", { exact: true }).selectOption(sort ?? "");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.locator(".shop-card h3").first()).toHaveText(first ?? "");
  }
  await page.getByRole("button", { name: /^Filters/ }).click();
  await page.getByLabel("Region", { exact: true }).selectOption("Indonesia");
  await page
    .getByLabel("Sort by", { exact: true })
    .selectOption("diamonds_desc");
  await page.getByRole("button", { name: "Apply filters" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".shop-card h3").first()).toHaveText(
    "50 Diamonds · Indonesia",
  );
  await page
    .getByRole("link", {
      name: "View details for 50 Diamonds · Indonesia",
      exact: true,
    })
    .click();
  await page.getByRole("link", { name: "Back to shop", exact: true }).click();
  await page.getByRole("button", { name: /^Filters/ }).click();
  await expect(page.getByLabel("Region", { exact: true })).toHaveValue(
    "Indonesia",
  );
  await expect(page.getByLabel("Sort by", { exact: true })).toHaveValue(
    "diamonds_desc",
  );
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "Clear all" }).click();
  await page.getByRole("button", { name: /^Filters/ }).click();
  await expect(page.getByLabel("Sort by", { exact: true })).toHaveValue(
    "diamonds_asc",
  );
});
test("pagination preserves sorting and changing it resets the page", async ({
  page,
}) => {
  await page.goto(origin + "/games/example/shop?sort=price_asc");
  await page.getByRole("link", { name: "Next products" }).click();
  await expect(page).toHaveURL(/sort=price_asc.*after=fixture-next/);
  await page.getByRole("button", { name: /^Filters/ }).click();
  await page
    .getByLabel("Sort by", { exact: true })
    .selectOption("diamonds_desc");
  await page.getByRole("button", { name: "Apply filters" }).click();
  expect(new URL(page.url()).searchParams.has("after")).toBe(false);
  await expect(page.locator(".shop-card h3").first()).toHaveText(
    "275 Diamonds · Global",
  );
  await page.goBack();
  await page.getByRole("button", { name: /^Filters/ }).click();
  await expect(page.getByLabel("Sort by", { exact: true })).toHaveValue(
    "price_asc",
  );
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
  await expect(
    page.getByRole("button", {
      name: "Remove sort by filter: Price: high to low",
    }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath("error.png"), fullPage: true });
  await page.goto(origin + "/games/example/shop?q=loading&sort=price_desc");
  await expect(page.getByText("Loading available products…")).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Remove sort by filter: Price: high to low",
    }),
  ).toBeVisible();
  await expect(page.locator(".shop-card")).toHaveCount(3);
});

test("modal drafts, keyboard focus, chips and image loading stay clear", async ({
  page,
}, info) => {
  let releaseImages = () => {};
  const imagesReady = new Promise<void>((resolve) => {
    releaseImages = resolve;
  });
  await page.route("**/catalog-assets/**", async (route) => {
    await imagesReady;
    await route.continue();
  });
  await page.goto(origin + "/games/example/shop", {
    waitUntil: "domcontentloaded",
  });
  const image = page.locator(".shop-card img").first();
  await expect(image).toHaveCSS("opacity", "0");
  await expect(image).toHaveAttribute("alt", "Mobile Legends artwork");
  await page.screenshot({
    path: info.outputPath("pending-artwork.png"),
    fullPage: true,
  });
  releaseImages();
  await expect(image).toHaveCSS("opacity", "1");
  const trigger = page.getByRole("button", { name: /^Filters/ });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 850 });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Shop filters" });
    await expect(
      dialog.getByRole("heading", { name: "Shop filters" }),
    ).toBeFocused();
    await page.getByLabel("Region", { exact: true }).selectOption("Indonesia");
    expect(new URL(page.url()).searchParams.has("region")).toBe(false);
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`modal-${String(width)}.png`),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(page.getByLabel("Region", { exact: true })).toHaveValue("");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
  }
  await trigger.click();
  await page.getByLabel("Region", { exact: true }).selectOption("Indonesia");
  await page.getByRole("button", { name: "Apply filters" }).click();
  const chip = page.getByRole("button", {
    name: "Remove region filter: Indonesia",
  });
  await expect(chip).toBeVisible();
  await page.getByLabel("Search shop").fill("Still typing");
  await trigger.click();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(trigger).toBeFocused();
  await expect(page.getByLabel("Search shop")).toHaveValue("Still typing");
  await expect(page.locator(".shop-card").first()).not.toContainText(
    "Instant top-up.",
  );
  await expect(
    page.getByRole("link", { name: "View details for 55 Diamonds · Global" }),
  ).toHaveText("View details");
});

test("account filters retain currency guards and clear dependent chips", async ({
  page,
}, info) => {
  await page.goto(
    origin + "/accounts?currency=USD&max_minor=5000&sort=price_asc",
  );
  await expect(page.getByLabel("Search accounts")).toBeVisible();
  await page.getByRole("button", { name: /^Filters/ }).click();
  await page.getByLabel("Maximum price", { exact: true }).fill("1.123");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByLabel("Maximum price", { exact: true })).toBeFocused();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Maximum price", { exact: true }).fill("50.00");
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 850 });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`accounts-modal-${String(width)}.png`),
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Cancel" }).click();
  await page
    .getByRole("button", { name: "Remove listing currency filter: USD" })
    .click();
  await expect(page).not.toHaveURL(/currency=|max_minor=/);
  await expect(page).toHaveURL(/sort=newest/);
  await page.getByRole("button", { name: /^Filters/ }).click();
  await page
    .getByLabel("Sort accounts", { exact: true })
    .selectOption("price_asc");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByLabel("Listing currency", { exact: true }),
  ).toBeFocused();
  await expect(
    page.getByText("Enter a listing currency to compare prices."),
  ).toBeVisible();
});

test("news and boosting use the same staged filters without changing service context", async ({
  page,
}, info) => {
  await page.goto(origin + "/games/example/news?q=hero&kind=guide");
  await page.getByRole("button", { name: /^Filters/ }).click();
  await expect(page.getByLabel("Reading type", { exact: true })).toHaveValue(
    "guide",
  );
  await page.getByLabel("Reading type", { exact: true }).selectOption("patch");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/q=hero.*kind=patch/);
  await page
    .getByRole("button", { name: "Remove reading type filter: Patch notes" })
    .click();
  await expect(page.getByLabel("Search news and guides")).toHaveValue("hero");
  await page.getByRole("button", { name: /^Filters/ }).click();
  await page.screenshot({
    path: info.outputPath("news-modal.png"),
    fullPage: true,
  });
  await page.goto(origin + "/games/example?service=boost&path=packages");
  await expect(
    page.getByRole("heading", { name: "Fixed packages", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Filters/ }).click();
  await expect(page.getByLabel("Boosting type", { exact: true })).toHaveValue(
    "packages",
  );
  await page
    .getByLabel("Boosting type", { exact: true })
    .selectOption("custom");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/service=boost.*path=custom/);
  await expect(
    page.getByRole("heading", { name: "Fixed packages", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /^Filters/ }).click();
  await page.screenshot({
    path: info.outputPath("boosting-modal.png"),
    fullPage: true,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("long titles, manual delivery and failed artwork remain readable before opening details", async ({
  page,
}, info) => {
  await page.goto(origin + "/games/example/shop?q=review-cases");
  await expect(
    page.getByRole("heading", {
      name: "50 + 5 Diamonds · Indonesia — first top-up bonus",
      exact: true,
    }),
  ).toBeVisible();
  const manual = page.locator(".shop-card").filter({
    has: page.getByRole("heading", { name: "Elite Bundle", exact: true }),
  });
  await expect(manual).toContainText("2–24 hours");
  await expect(manual.locator(".shop-card-meta")).toContainText("Global");
  await expect(manual.locator(".shop-card-meta")).toContainText("Indonesia");
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`long-cards-${String(width)}.png`),
      fullPage: true,
    });
  }
  await page
    .getByRole("link", {
      name: "View details for 50 + 5 Diamonds · Indonesia — first top-up bonus",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(
      "Bonus applies to eligible first top-ups only. Review this condition before ordering.",
    ),
  ).toBeVisible();
  await page.route("**/catalog-assets/**", (route) => route.abort());
  await page.goto(origin + "/games/example/shop?q=review-cases");
  await expect(page.getByText("Artwork unavailable").first()).toBeVisible();
  await page.screenshot({
    path: info.outputPath("failed-artwork.png"),
    fullPage: true,
  });
});

test("game search chip and clear action return focus to the persistent search", async ({
  page,
}) => {
  await page.goto(origin + "/games");
  const search = page.getByLabel("Search this game list", { exact: true });
  await search.fill("No game");
  await page
    .getByRole("button", { name: "Remove search filter: No game" })
    .click();
  await expect(search).toBeFocused();
  await expect(search).toHaveValue("");
  await search.fill("No game");
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(search).toBeFocused();
  await expect(search).toHaveValue("");
});

test("search actions align and short mobile dialogs keep focused fields above actions", async ({
  page,
}, info) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto(origin + "/games/example/shop");
    const input = await page.getByLabel("Search shop").boundingBox();
    const search = await page
      .getByRole("button", { name: "Search", exact: true })
      .boundingBox();
    const filters = await page
      .getByRole("button", { name: /^Filters/ })
      .boundingBox();
    if (!input || !search || !filters)
      throw new Error("Missing toolbar bounds");
    expect(
      Math.abs(search.y + search.height - filters.y - filters.height),
    ).toBeLessThan(2);
    if (width > 600)
      expect(
        Math.abs(input.y + input.height - search.y - search.height),
      ).toBeLessThan(2);
    else expect(search.y).toBeGreaterThan(input.y + input.height);
  }
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto(
    origin + "/accounts?currency=USD&max_minor=5000&sort=price_asc",
  );
  await page.getByRole("button", { name: /^Filters/ }).click();
  for (const name of ["Maximum price", "Sort accounts"]) {
    const field = page.getByLabel(name, { exact: true });
    await field.focus();
    const bounds = await field.boundingBox();
    const footer = await page
      .locator(".list-filter-dialog-actions")
      .boundingBox();
    const header = await page
      .locator(".list-filter-dialog-heading")
      .boundingBox();
    if (!bounds || !footer || !header) throw new Error("Missing modal bounds");
    expect(bounds.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(footer.y + 1);
  }
  await page.screenshot({
    path: info.outputPath("accounts-short-modal.png"),
    fullPage: true,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("uploaded product artwork keeps responsive sources within its reserved frame", async ({
  page,
}) => {
  await page.route("**/api/v1/artwork/**", async (route) => {
    const response = await route.fetch({
      url: origin + "/catalog-assets/game-mlbb-640.jpg",
    });
    await route.fulfill({ response });
  });
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto(origin + "/games/example/shop?q=responsive-cases");
  const image = page.locator(".shop-card img").first();
  await expect(image).toHaveCSS("opacity", "1");
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.currentSrc))
    .toContain("/thumb");
  await page.setViewportSize({ width: 768, height: 850 });
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.currentSrc))
    .toContain("/card");
});
