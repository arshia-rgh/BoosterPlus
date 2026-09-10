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
  await signIn(page, request, fixture(info.project.name, "catalog"));
  await enroll(page);
  await page.getByRole("link", { name: "Catalog editor", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Edit Mobile Legends", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit Mobile Legends", exact: true })
    .click();
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
  await expect(page.getByText(/Review actual catalog data/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish catalog", exact: true }),
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
  const matches = await addField("matches", "Matches", "integer");
  await matches.getByLabel("Required field", { exact: true }).check();
  await matches.getByLabel("Minimum value", { exact: true }).fill("1");
  await matches.getByLabel("Maximum value", { exact: true }).fill("5");
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
  await page.getByLabel(/I verified the actual/).check();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Changes saved.", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Publish catalog", exact: true })
    .click();
  await expect(
    page.getByText(/Field dependencies contain a cycle/),
  ).toBeVisible();
  // Locators now use stable keys because names changed during editing.
  const savedHero = service.locator('[data-catalog-field="2"]');
  const show = savedHero.getByRole("group", {
    name: "Show field when",
    exact: true,
  });
  await show.getByLabel("Condition field").selectOption("restrict");
  await show.getByLabel("Condition values").fill("true");
  await page.getByLabel(/I verified the actual/).check();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Changes saved.", { exact: true })).toBeVisible();
  await service.getByLabel("Price evaluator").selectOption("pricing-v1");
  await service.getByLabel("Estimate currency").selectOption("USD");
  await service
    .getByLabel("Base amount in minor units", { exact: true })
    .fill("100.25");
  await service.getByLabel("Maximum estimate in minor units").fill("999999");
  await service
    .getByRole("button", { name: "Add price operation", exact: true })
    .click();
  const priceRule = service.locator('[data-price-rule="0"]');
  await priceRule.locator("summary").click();
  await priceRule
    .getByLabel("Price operation", { exact: true })
    .selectOption("per_unit");
  await priceRule.getByLabel("Operation value").fill("100.25");
  await priceRule.getByLabel("Quantity field").selectOption("matches");
  await service
    .getByRole("button", { name: "Add price example", exact: true })
    .click();
  const priceCase = service.locator('[data-price-case="0"]');
  await priceCase.locator("summary").click();
  await priceCase.getByLabel("Play mode (required)").selectOption("solo");
  await priceCase.getByLabel("Matches (required)").fill("2");
  await priceCase.getByLabel("Expected amount in minor units").fill("300");
  await page.getByLabel(/I verified the actual/).check();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Changes saved.", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Publish catalog", exact: true })
    .click();
  await expect(
    page.getByText("Expected result differs from the current pricing rules."),
  ).toBeVisible();
  await priceCase.getByLabel("Expected amount in minor units").fill("301");
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
  for (const section of [references, service, pack])
    await section.locator("summary").first().click();
  await page.screenshot({
    path: `.cache/catalog-editor-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .locator(".catalog-preview")
    .screenshot({ path: `.cache/catalog-preview-${info.project.name}.png` });
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
    expect(
      (await new AxeBuilder({ page: customer }).analyze()).violations,
    ).toEqual([]);
    await customer.getByRole("link", { name: "Configure Duo boost" }).click();
    await customer.getByLabel("Play mode (required)").selectOption("solo");
    await customer.getByLabel("Matches (required)").fill("2");
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
    await pack.locator("summary").first().click();
    await page.getByLabel("Price in minor units").fill("1500");
    await page.getByLabel(/I verified the actual/).check();
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(
      page.getByText("Changes saved.", { exact: true }),
    ).toBeVisible();
    await customer.reload();
    await expect(customer.locator(".package-price")).toHaveText("USD 12.34");
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
