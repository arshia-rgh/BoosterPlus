import { secondaryCapture } from "./secondary-capture";
import { randomUUID } from "node:crypto";
import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { enroll, fixture, signIn } from "./identity-fixtures";
import { historySchema, listingSchema } from "../../app/catalog/model";

async function option(
  container: Locator,
  index: number,
  key: string,
  label: string,
) {
  await container
    .getByRole("button", { name: "Add option", exact: true })
    .click();
  const row = container.getByRole("group", {
    name: `Option ${String(index + 1)}`,
    exact: true,
  });
  await row.getByLabel("Option key", { exact: true }).fill(key);
  await row.getByLabel("Option label", { exact: true }).fill(label);
}
async function condition(
  container: Locator,
  legend: string,
  field: string,
  value: string,
) {
  const group = container.getByRole("group", { name: legend, exact: true });
  await group.getByLabel("Enable condition").check();
  await group.getByLabel("Condition field").selectOption(field);
  await group.getByLabel("Condition values").fill(value);
}

test("staff builds, previews, publishes and archives another game through the generic UI", async ({
  page,
  request,
  browser,
}, info) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(10000);
  const slug = `synthetic-${info.project.name}-${randomUUID()}`;
  await signIn(
    page,
    request,
    fixture(info.project.name, "catalog"),
    "/admin/login",
  );
  await enroll(page);
  const couponCode =
    `SAVE-${info.project.name}-${randomUUID().slice(0, 8)}`.toUpperCase();
  await expect(
    page.getByRole("heading", { name: "Operations overview", exact: true }),
  ).toBeVisible();

  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByRole("link", { name: "Coupons", exact: true }).click();
  await page.getByRole("button", { name: "New coupon", exact: true }).click();
  await page.getByLabel("Coupon code", { exact: true }).fill(couponCode);
  await page
    .getByLabel("Coupon name", { exact: true })
    .fill("Synthetic half-price coupon");
  await page.getByLabel("Enable coupon", { exact: true }).check();
  await page.getByLabel("Discount value", { exact: true }).fill("25");
  await page.getByLabel("Coupon currency", { exact: true }).selectOption("USD");
  await page.getByLabel("Eligible game slugs", { exact: true }).fill(slug);
  await page.getByRole("button", { name: "Save coupon", exact: true }).click();
  await expect(page.getByText("Coupon saved.", { exact: true })).toBeVisible();
  await page.getByLabel("Discount value", { exact: true }).fill("50");
  await page.getByRole("button", { name: "Save coupon", exact: true }).click();
  await expect(page.getByText("Coupon saved.", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Coupon revision history", exact: true })
    .click();
  await expect(page.getByText("Revision 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Revision 2", { exact: true })).toBeVisible();
  await secondaryCapture(page, "coupon-history", info.project.name);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.cache/coupons-${info.project.name}.png`,
    fullPage: true,
  });
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByRole("link", { name: "Catalog editor", exact: true }).click();
  const installationGames = [
    ["mobile-legends", "Mobile Legends", "mlbb-1536.jpg"],
    ["world-of-warcraft", "World of Warcraft", "wow-1536.jpg"],
    ["league-of-legends", "League of Legends", "lol-1536.jpg"],
    ["valorant", "VALORANT", "valorant-1536.png"],
    ["dota-2", "Dota 2", "dota-1536.jpg"],
    ["wild-rift", "Wild Rift", "wildrift-1536.jpg"],
  ] as const;
  for (const [gameSlug, name, asset] of installationGames) {
    await page.getByLabel("Search catalog name or slug").fill(gameSlug);
    await page
      .getByLabel("Catalog state", { exact: true })
      .selectOption("draft");
    await page
      .getByRole("button", { name: "Filter catalogs", exact: true })
      .click();
    const card = page
      .locator(".game-card")
      .filter({ has: page.getByText(gameSlug, { exact: true }) });
    await card
      .getByRole("button", { name: `Edit ${name}`, exact: true })
      .click();
    await page.getByText("Existing artwork path", { exact: true }).click();
    await expect(
      page.getByLabel("Public asset path", { exact: true }),
    ).toHaveValue(`/catalog-assets/game-${asset}`);
    await expect(
      page.getByLabel("Customize game artwork framing"),
    ).toBeChecked();
    if (gameSlug === "mobile-legends") {
      const artwork = page.locator('.artwork-upload[data-purpose="game"]');
      await artwork
        .getByLabel("Choose a replacement image")
        .setInputFiles("tests/fixtures/proof.png");
      await artwork
        .getByRole("button", { name: "Prepare image versions", exact: true })
        .click();
      await expect(
        artwork.getByRole("button", { name: "Use this image", exact: true }),
      ).toBeEnabled();
      await artwork
        .getByRole("button", { name: "Use this image", exact: true })
        .click();
      await expect(
        page.getByLabel("Public asset path", { exact: true }),
      ).toHaveValue(/^\/api\/v1\/artwork\//);
      await expect(
        page.getByRole("slider", {
          name: "Mobile horizontal focus",
          exact: true,
        }),
      ).toHaveValue("50");
      await artwork
        .getByRole("button", {
          name: "Restore default game artwork",
          exact: true,
        })
        .click();
      await expect(
        page.getByLabel("Public asset path", { exact: true }),
      ).toHaveValue(`/catalog-assets/game-${asset}`);
      await expect(
        page.getByRole("slider", {
          name: "Mobile horizontal focus",
          exact: true,
        }),
      ).toHaveValue("85");
      await page
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
      await expect(
        page.getByText("Draft saved", { exact: true }),
      ).toBeVisible();
    }
    const framing = page.locator(".artwork-framing-previews");
    await expect(framing.locator("img")).toHaveCount(2);
    for (const img of await framing.locator("img").all()) {
      await expect(img).toBeVisible();
      await expect
        .poll(() =>
          img.evaluate(
            (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
          ),
        )
        .toBe(true);
    }
    await framing.screenshot({
      path: `.cache/installation-${gameSlug}-${info.project.name}.png`,
    });
    await page
      .getByRole("button", { name: "← All catalog drafts", exact: true })
      .click();
  }
  await page.getByLabel("Search catalog name or slug").fill("");
  await page.getByLabel("Catalog state", { exact: true }).selectOption("");
  await page
    .getByRole("button", { name: "Filter catalogs", exact: true })
    .click();
  const starter = page.locator(".game-card").filter({
    has: page.getByText("mobile-legends", { exact: true }),
  });
  await expect(starter).toHaveCount(1);
  if (info.project.name === "desktop") {
    const viewport = page.viewportSize();
    for (const width of [1280, 768, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await starter.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: info.outputPath(`di04-admin-identities-${String(width)}.png`),
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    if (viewport) await page.setViewportSize(viewport);
  }
  async function section(label: string) {
    await page
      .getByRole("navigation", { name: "Catalog sections" })
      .getByRole("link", { name: label, exact: true })
      .click();
  }
  await starter
    .getByRole("button", { name: "Edit Mobile Legends", exact: true })
    .click();
  await section("Review & publish");
  // The starter has over 16 KiB of real configuration; exercise the bounded catalog proxy path.
  if (info.project.name === "desktop") {
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(
      page.getByText("Changes saved.", { exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole("button", { name: "Preview saved draft", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: /Review actual catalog data/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Publish catalog",
      exact: true,
      includeHidden: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "← All catalog drafts", exact: true })
    .click();
  await page
    .getByLabel("New game name", { exact: true })
    .fill("Synthetic UI game");
  await page.getByLabel("New game slug", { exact: true }).fill(slug);
  await page.getByRole("button", { name: "Create draft", exact: true }).click();
  await expect(page.getByLabel("Game name", { exact: true })).toHaveValue(
    "Synthetic UI game",
  );
  await page
    .getByLabel("Game description", { exact: true })
    .fill("Isolated browser fixture — not a live offering.");
  await page.getByText("Existing artwork path", { exact: true }).click();
  await page
    .getByLabel("Public asset path", { exact: true })
    .fill("/catalog-assets/game-placeholder.svg");
  await page
    .getByLabel("Image alternative text", { exact: true })
    .fill("Synthetic catalog artwork");
  // Invalid drafts open the actual input even when submitted from another editor section.
  await page.getByLabel("Game name", { exact: true }).fill("");
  await section("FAQ");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByLabel("Game name", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Game name", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(
    page.getByLabel("Game description", { exact: true }),
  ).toHaveValue("Isolated browser fixture — not a live offering.");
  await page.screenshot({
    path: info.outputPath("validation-catalog-hidden-section.png"),
    fullPage: true,
  });
  await page.getByLabel("Game name", { exact: true }).fill("Synthetic UI game");
  await page.getByLabel("Customize game artwork framing").check();
  await page.getByLabel("Desktop text placement").selectOption("right");
  await page.getByLabel("Desktop horizontal focus").focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("Desktop horizontal focus")).toHaveValue("1");
  await page
    .getByRole("button", { name: "Add reference catalog", exact: true })
    .click();
  const references = page.locator('[data-catalog-reference="0"]');
  await references.locator("summary").first().click();
  await references.getByLabel("Catalog key", { exact: true }).fill("heroes");
  await references
    .getByLabel("Catalog label", { exact: true })
    .fill("Champions");
  await references.getByLabel("Catalog kind").selectOption("hero");
  await option(references, 0, "alpha", "Alpha");
  await option(references, 1, "beta", "Beta");
  await section("Boosting forms");
  await page.getByRole("button", { name: "Add service", exact: true }).click();
  const service = page.locator('[data-catalog-service="0"]');
  await service.locator("summary").first().click();
  await service.getByLabel("Service key", { exact: true }).fill("boost");
  await service.getByLabel("Service name", { exact: true }).fill("Duo boost");
  async function addField(key: string, label: string, type: string) {
    await service
      .getByRole("button", { name: "Add field", exact: true })
      .click();
    const field = service.locator("[data-catalog-field]").last();
    await field.locator("summary").first().click();
    await field.getByLabel("Field key", { exact: true }).fill(key);
    await field.getByLabel("Field label", { exact: true }).fill(label);
    if (type !== "select")
      await field.getByLabel("Field type", { exact: true }).selectOption(type);
    return field;
  }
  const mode = await addField("mode", "Play mode", "select");
  await mode.getByLabel("Required field", { exact: true }).check();
  await option(mode, 0, "solo", "Solo");
  await option(mode, 1, "duo", "Duo");
  await addField("restrict", "Single hero", "boolean");
  const hero = await addField("hero", "Hero", "select");
  await hero
    .getByLabel("Reference catalog", { exact: true })
    .selectOption("heroes");
  // Deliberate self-reference must fail publication; fixes happen through the same controls.
  await condition(hero, "Show field when", "hero", "alpha");
  await condition(hero, "Require field when", "restrict", "true");
  await addField("win_preference", "Requested win rate", "win_rate");
  const matches = await addField("matches", "Matches", "integer");
  await matches.getByLabel("Required field", { exact: true }).check();
  await matches.getByLabel("Minimum value", { exact: true }).fill("1");
  await matches.getByLabel("Maximum value", { exact: true }).fill("5");
  await section("Packages");
  await page.getByRole("button", { name: "Add package", exact: true }).click();
  const pack = page.locator('[data-catalog-package="0"]');
  await pack.locator("summary").first().click();
  await pack.getByLabel("Package key", { exact: true }).fill("starter");
  await pack.getByLabel("Package name", { exact: true }).fill("Starter pack");
  await pack.getByRole("button", { name: "Add variant", exact: true }).click();
  const variant = pack.getByRole("group", { name: "Variant 1", exact: true });
  await variant.getByLabel("Variant key", { exact: true }).fill("standard");
  await variant.getByLabel("Variant name", { exact: true }).fill("Standard");
  await variant.getByLabel("Pricing currency").selectOption("USD");
  await variant.getByLabel("Price in minor units").fill("1234");
  await variant.getByLabel("Minimum delivery hours").fill("1");
  await variant.getByLabel("Maximum delivery hours").fill("3");
  await variant.getByLabel("Limit capacity").check();
  await variant.getByLabel("Available capacity").fill("2");
  await variant
    .getByRole("group", { name: "Required package information", exact: true })
    .getByLabel("Play mode", { exact: true })
    .check();
  await condition(variant, "Variant eligibility", "mode", "solo");
  await section("Game & ranks");
  // DI11 implements shop; availability is now publishable independently of boost.
  await expect(
    page
      .getByLabel("Shop availability")
      .getByRole("option", { name: "Available", exact: true }),
  ).toHaveCount(1);
  await page.getByLabel("Boosting availability").selectOption("active");
  await page.getByLabel("Accounts availability").selectOption("paused");
  await page
    .getByLabel("Accounts unavailable reason")
    .fill("Synthetic inventory review.");
  await page
    .getByLabel("Allow source-based public statistics after publication")
    .check();
  await page.getByLabel("Minimum eligible records").fill("25");
  await page
    .getByLabel("Allow source-based public statistics after publication")
    .uncheck();
  await page
    .getByLabel("Allow source-based public statistics after publication")
    .check();
  await expect(page.getByLabel("Minimum eligible records")).toHaveValue("25");
  await section("Featured offers");
  await page
    .getByRole("button", { name: "Add featured offer", exact: true })
    .click();
  const promotion = page.getByRole("region", {
    name: "Featured offers",
    exact: true,
  });
  await promotion
    .getByLabel("Offer title", { exact: true })
    .fill("Synthetic featured package");
  await promotion.getByLabel("Offer type").selectOption("account");
  await expect(
    promotion.getByText("No published accounts on this page."),
  ).toBeVisible();
  const accountPath = `**/api/v1/accounts?slug=${slug}&after=*`;
  await page.route(accountPath, (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"code":"unavailable"}',
    }),
  );
  await promotion.getByLabel("Offer type").selectOption("package");
  await promotion.getByLabel("Offer type").selectOption("account");
  await expect(
    promotion.getByRole("button", { name: "Retry accounts" }),
  ).toBeVisible();
  await promotion.screenshot({
    path: info.outputPath("di03-account-selection-error.png"),
  });
  await page.unroute(accountPath);
  // Public response fixture qualifies selector recovery only. Real reserve,
  // release binding and payment boundaries are covered by TiDB tests.
  const syntheticAccount = {
    id: randomUUID(),
    release_id: randomUUID(),
    game: "Synthetic UI game",
    slug,
    state: "published",
    images: [],
    product: {
      title: "Synthetic reviewed account",
      description: "Public response fixture",
      region: "Fixture region",
      rank: "Fixture rank",
      attributes: [],
      media_ids: [],
      currency: "USD",
      amount_minor: "12345",
      sale_terms: "Approved fixture sale terms",
      transfer_requirements: "Fixture transfer requirements",
      dispute_terms: "Fixture dispute terms",
      acknowledgement_terms: "Fixture acknowledgement terms",
      dispute_hours: 48,
      delivery_min_hours: 1,
      delivery_max_hours: 24,
    },
  };
  await page.route(accountPath, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [syntheticAccount], next: "" }),
    }),
  );
  await promotion.getByRole("button", { name: "Retry accounts" }).click();
  await expect(
    promotion.getByLabel("Published account").getByRole("option", {
      name: "Synthetic reviewed account · USD 123.45",
      exact: true,
    }),
  ).toHaveCount(1);
  await promotion
    .getByLabel("Published account")
    .selectOption(syntheticAccount.id);
  await promotion.screenshot({
    path: info.outputPath("di03-account-selection-restored.png"),
  });
  await page.unroute(accountPath);
  await promotion.getByLabel("Offer type").selectOption("package");
  await promotion
    .getByLabel("Package", { exact: true })
    .selectOption("starter");
  await promotion.getByLabel("Package variant").selectOption("standard");
  await promotion
    .getByLabel("Starts at (UTC)")
    .fill(new Date(Date.now() - 60000).toISOString());
  await promotion
    .getByLabel("Ends at (UTC)")
    .fill(new Date(Date.now() + 86400000).toISOString());
  await promotion
    .getByText("Optional reviewed coupon", { exact: true })
    .click();
  await promotion.getByLabel("Coupon code", { exact: true }).fill(couponCode);
  await promotion.getByLabel("Reviewed coupon version").fill("2");
  await promotion
    .getByLabel("Show remaining quantity from real inventory")
    .check();
  await promotion
    .getByLabel("Include this offer when the catalog is published")
    .check();

  await section("Review & publish");
  await page.getByLabel(/I verified the actual/).check();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Changes saved.", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Preview saved draft", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Publish catalog",
      exact: true,
      includeHidden: true,
    }),
  ).toBeDisabled();
  await expect(
    page.getByRole("link", { name: /Field dependencies contain a cycle/ }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Catalog sections" })
      .getByRole("link", { name: "Boosting forms", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.screenshot({
    path: info.outputPath("validation-catalog-nested-field.png"),
    fullPage: true,
  });
  // Locators now use stable keys because names changed during editing.
  await section("Boosting forms");
  const savedHero = service.locator('[data-catalog-field="2"]');
  const show = savedHero.getByRole("group", {
    name: "Show field when",
    exact: true,
  });
  await show.getByLabel("Condition field").selectOption("restrict");
  await show.getByLabel("Condition values").fill("true");
  await section("Review & publish");
  await page.getByLabel(/I verified the actual/).check();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Changes saved.", { exact: true })).toBeVisible();
  await section("Price estimation");
  const pricing = page.locator("#catalog-pricing details").first();
  await pricing.locator("summary").first().click();
  await pricing.getByLabel("Price evaluator").selectOption("pricing-v1");
  await pricing.getByLabel("Estimate currency").selectOption("USD");
  await pricing
    .getByLabel("Base amount in minor units", { exact: true })
    .fill("100.25");
  await pricing.getByLabel("Maximum estimate in minor units").fill("999999");
  await pricing
    .getByRole("button", { name: "Add price operation", exact: true })
    .click();
  const priceRule = pricing.locator('[data-price-rule="0"]');
  await priceRule.locator("summary").click();
  await priceRule
    .getByLabel("Price operation", { exact: true })
    .selectOption("per_unit");
  await priceRule.getByLabel("Operation value").fill("100.25");
  await priceRule.getByLabel("Quantity field").selectOption("matches");
  await pricing
    .getByRole("button", { name: "Add price example", exact: true })
    .click();
  const priceCase = pricing.locator('[data-price-case="0"]');
  await priceCase.locator("summary").click();
  await priceCase.getByLabel("Play mode (required)").selectOption("solo");
  await priceCase.getByLabel("Matches (required)").fill("2");
  await priceCase.getByLabel("Expected amount in minor units").fill("300");
  await section("Review & publish");
  await page.getByLabel(/I verified the actual/).check();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Changes saved.", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Preview saved draft", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Publish catalog",
      exact: true,
      includeHidden: true,
    }),
  ).toBeDisabled();
  await expect(
    page.getByRole("link", {
      name: /Expected result differs from the current pricing rules/,
    }),
  ).toBeVisible();
  await section("Price estimation");
  await priceCase.getByLabel("Expected amount in minor units").fill("301");
  await section("Review & publish");
  await page.getByLabel(/I verified the actual/).check();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Changes saved.", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Preview saved draft", exact: true })
    .click();
  await expect(
    page.getByText("Publication checks passed.", { exact: true }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  for (const [label, group] of [
    ["Game & ranks", references],
    ["Boosting forms", service],
    ["Packages", pack],
  ] as const) {
    await section(label);
    await group.locator("summary").first().click();
  }
  await section("Review & publish");
  await page.screenshot({
    path: `.cache/catalog-editor-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .locator(".catalog-preview")
    .screenshot({ path: `.cache/catalog-preview-${info.project.name}.png` });
  const originalViewport = page.viewportSize();
  for (const width of info.project.name === "desktop" ? [1280, 768] : [320]) {
    await page.setViewportSize({ width, height: 900 });
    await section("Game & ranks");
    await page
      .getByRole("region", {
        name: "Service availability and public statistics",
        exact: true,
      })
      .scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("region", {
        name: "Service availability and public statistics",
        exact: true,
      })
      .screenshot({
        path: info.outputPath(`di03-catalog-${String(width)}.png`),
      });
    await page
      .getByLabel("Accounts unavailable reason")
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: info.outputPath(`di03-availability-viewport-${String(width)}.png`),
      scale: "css",
    });
    await page.getByLabel("Minimum eligible records").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: info.outputPath(`di03-metrics-viewport-${String(width)}.png`),
      scale: "css",
    });
    await section("Featured offers");
    await promotion.getByLabel("Starts at (UTC)").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: info.outputPath(`di03-offer-viewport-${String(width)}.png`),
      scale: "css",
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  if (originalViewport) await page.setViewportSize(originalViewport);
  await section("Review & publish");

  await page
    .getByRole("button", { name: "Publish catalog", exact: true })
    .click();
  await expect(
    page.getByText("Catalog published.", { exact: true }),
  ).toBeVisible();
  const publicContext = await browser.newContext({
    viewport:
      info.project.name === "mobile"
        ? { width: 393, height: 851 }
        : { width: 1280, height: 900 },
  });
  const customer = await publicContext.newPage();
  try {
    await customer.goto(`http://127.0.0.1:4173/games/${slug}`);
    await expect(
      customer.getByRole("heading", { name: "Synthetic UI game", exact: true }),
    ).toBeVisible();
    await expect(customer.locator(".game-shell")).toHaveAttribute(
      "data-copy-side",
      "right",
    );
    await expect(customer.locator(".game-shell")).toHaveCSS(
      "--art-desktop-x",
      "1%",
    );
    expect(
      (await new AxeBuilder({ page: customer }).analyze()).violations,
    ).toEqual([]);
    await expect(customer.locator(".game-stage-art")).toHaveCSS(
      "object-position",
      info.project.name === "mobile" ? "50% 20%" : "1% 30%",
    );
    await customer.route("**/catalog-assets/game-placeholder.svg", (route) =>
      route.abort(),
    );
    await customer.reload();
    await expect(customer.locator(".game-stage-compact")).toBeVisible();
    await expect(customer.locator(".game-backdrop")).toHaveCount(0);
    await customer.unroute("**/catalog-assets/game-placeholder.svg");
    await customer.reload();
    await expect(customer.locator(".game-stage-art")).toBeVisible();
    await customer
      .locator(".game-service-card")
      .filter({ hasText: "Boosting" })
      .click();
    await customer.getByRole("link", { name: "Configure Duo boost" }).click();
    await customer.getByLabel("Play mode (required)").selectOption("solo");
    await customer.getByLabel("Matches (required)").fill("2");
    await customer
      .getByLabel("Win-rate preference", { exact: true })
      .selectOption("range");
    await customer.getByLabel("Lower win rate (%)", { exact: true }).fill("80");
    await customer.getByLabel("Upper win rate (%)", { exact: true }).fill("60");
    await customer
      .getByRole("button", { name: "Check selections", exact: true })
      .click();
    await expect(
      customer.getByLabel("Upper win rate (%)", { exact: true }),
    ).toBeFocused();
    await expect(
      customer.getByLabel("Upper win rate (%)", { exact: true }),
    ).toHaveAttribute("aria-invalid", "true");
    await customer.screenshot({
      path: info.outputPath("validation-win-rate-range.png"),
      fullPage: true,
    });
    await customer.getByLabel("Lower win rate (%)", { exact: true }).fill("50");
    await expect(
      customer.getByRole("complementary", { name: "Selection summary" }),
    ).toContainText("Between 50–60%");
    await customer.getByLabel("Single hero").selectOption("true");
    await expect(customer.getByLabel("Hero (required)")).toBeVisible();
    await customer
      .getByRole("button", { name: "Check selections", exact: true })
      .click();
    await expect(
      customer.getByText("This field is required.", { exact: true }),
    ).toBeVisible();
    await customer.getByLabel("Hero (required)").selectOption("alpha");
    await customer
      .getByRole("button", { name: "Check selections", exact: true })
      .click();
    await expect(customer.getByText(/Selections are valid/)).toBeVisible();
    await customer.getByLabel("Single hero").selectOption("false");
    await expect(customer.getByLabel("Hero (required)")).toHaveCount(0);
    await customer
      .getByRole("button", { name: "Check selections", exact: true })
      .click();
    await expect(customer.getByText(/Selections are valid/)).toBeVisible();
    expect(
      (await new AxeBuilder({ page: customer }).analyze()).violations,
    ).toEqual([]);
    await expect(
      customer.getByRole("heading", {
        name: "Estimated price: USD 3.01",
        exact: true,
      }),
    ).toBeVisible();
    await customer.screenshot({
      path: `.cache/pricing-${info.project.name}.png`,
      fullPage: true,
    });
    await customer.getByLabel("Coupon code (optional)").fill(couponCode);
    await customer
      .getByRole("button", { name: "Check selections", exact: true })
      .click();
    await expect(
      customer.getByRole("heading", {
        name: "Estimated price: USD 1.50",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      customer.getByText(/Coupon checks do not reserve a use/),
    ).toBeVisible();
    expect(
      (await new AxeBuilder({ page: customer }).analyze()).violations,
    ).toEqual([]);

    await customer.goto(`http://127.0.0.1:4173/games/${slug}/packages/starter`);
    await expect(customer.locator(".package-price")).toHaveText("USD 12.34");
    await customer.getByLabel("Play mode (required)").selectOption("duo");
    await customer.getByLabel("Matches (required)").fill("2");
    await customer
      .getByRole("button", { name: "Check selections", exact: true })
      .click();
    await expect(
      customer.getByText(/not eligible for the chosen package variant/),
    ).toBeVisible();
    await customer.getByLabel("Play mode (required)").selectOption("solo");
    await customer
      .getByRole("button", { name: "Check selections", exact: true })
      .click();
    await expect(customer.getByText(/Selections are valid/)).toBeVisible();
    await customer.getByLabel("Coupon code (optional)").fill("UNKNOWN-COUPON");
    await customer
      .getByRole("button", { name: "Check selections", exact: true })
      .click();
    await expect(
      customer.getByText(/This code is unavailable for these selections/),
    ).toBeVisible();
    await customer.getByLabel("Coupon code (optional)").fill(couponCode);
    await customer
      .getByRole("button", { name: "Check selections", exact: true })
      .click();
    await expect(
      customer.getByRole("heading", {
        name: "Estimated price: USD 6.17",
        exact: true,
      }),
    ).toBeVisible();
    await customer.screenshot({
      path: `.cache/catalog-package-${info.project.name}.png`,
      fullPage: true,
    });
    expect(
      (await new AxeBuilder({ page: customer }).analyze()).violations,
    ).toEqual([]);
    expect(
      await customer.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await section("Packages");
    await pack.locator("summary").first().click();
    await page.getByLabel("Price in minor units").fill("1500");
    await section("Review & publish");
    await page.getByLabel(/I verified the actual/).check();
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(
      page.getByText("Changes saved.", { exact: true }),
    ).toBeVisible();
    await customer.reload();
    await expect(customer.locator(".package-price")).toHaveText("USD 12.34");
    await page
      .getByRole("button", { name: "Preview saved draft", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Publish catalog", exact: true })
      .click();
    await expect(
      page.getByText("Catalog published.", { exact: true }),
    ).toBeVisible();
    // The already-open old configuration fails with a conflict instead of mixing prices.
    await customer.getByLabel("Play mode (required)").selectOption("solo");
    await customer.getByLabel("Matches (required)").fill("2");
    await customer
      .getByRole("button", { name: "Check selections", exact: true })
      .click();
    await expect(
      customer.getByText(/This catalog changed or is unavailable/),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "View release history", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Published history" }),
    ).toBeVisible();
    const listing = listingSchema.parse(
      await (await page.request.get("/api/v1/admin/catalog/games")).json(),
    );
    const game = listing.games.find((item) => item.slug === slug);
    expect(game).toBeDefined();
    if (!game) throw new Error("Missing published fixture");
    const history = historySchema.parse(
      await (
        await page.request.get(`/api/v1/admin/catalog/games/${game.id}/history`)
      ).json(),
    );
    expect(
      history.releases.map(
        (release) =>
          release.configuration.packages[0]?.variants[0]?.amount_minor,
      ),
    ).toEqual(["1500", "1234"]);
    await customer.reload();
    await expect(customer.locator(".package-price")).toHaveText("USD 15.00");
    await page
      .getByRole("button", { name: "Pause ordering", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Resume ordering", exact: true }),
    ).toBeVisible();
    await customer.reload();
    await expect(
      customer.getByRole("button", { name: "Check selections", exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: "Archive game", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Restore as paused", exact: true }),
    ).toBeVisible();
    expect((await customer.reload())?.status()).toBe(404);
  } finally {
    await publicContext.close();
  }
});
