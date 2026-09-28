import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn, enroll, fixture } from "./identity-fixtures";
import { draftSchema } from "../../app/shop/model";
test.use({ actionTimeout: 15000 });
async function capture(page: Page, name: string, desktop: boolean) {
  for (const width of desktop ? [1440, 768] : [393, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.cache/di11-offers-${name}-${String(width)}.png`,
      fullPage: true,
    });
  }
}
test("shop availability and reviewed product offers preserve named catalog return context", async ({
  page,
  request,
}, info) => {
  test.setTimeout(180000);
  await signIn(
    page,
    request,
    fixture(info.project.name, "shopmarketing"),
    "/admin/login",
  );
  await enroll(page);
  const productID = fixture(info.project.name, "offers-shop_product");
  const slug = fixture(info.project.name, "offers-shop_slug");
  const product = draftSchema.parse(
    await (
      await page.request.get(`/api/v1/admin/shop/products/${productID}`)
    ).json(),
  );
  const source = new URLSearchParams({
    game: product.game_id,
    availability: "available",
    q: productID,
  });
  await page.goto(`/admin/shop?${source.toString()}`);
  await page
    .getByLabel("Purchase availability", { exact: true })
    .selectOption("unavailable");
  await expect(page.getByText(/No products match these filters/)).toBeVisible();
  await capture(page, "empty", info.project.name === "desktop");
  await page
    .getByLabel("Purchase availability", { exact: true })
    .selectOption("available");
  await page
    .getByRole("link", { name: "Edit Synthetic fixture item", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Featured offers", exact: true })
    .click();
  await capture(page, "product", info.project.name === "desktop");
  await page
    .getByRole("link", {
      name: "Manage featured offers for Shop fixture game",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("region", { name: "Featured offers editor", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Add featured offer", exact: true })
    .click();
  await page
    .getByLabel("Offer title", { exact: true })
    .fill("Synthetic stock-backed shop offer");
  await page
    .getByLabel("Offer description", { exact: true })
    .fill("Fixture-only offer, fulfilled manually. No live commercial terms.");
  await page.getByLabel("Offer type", { exact: true }).selectOption("shop");
  await page
    .getByRole("button", { name: "More products", exact: true })
    .click();
  await page
    .getByLabel("Published shop product", { exact: true })
    .selectOption(productID);
  await page
    .getByLabel("Shop variant", { exact: true })
    .selectOption("fixture");
  await page
    .getByLabel("Starts at (UTC)", { exact: true })
    .fill(new Date(Date.now() - 60000).toISOString());
  await page
    .getByLabel("Ends at (UTC)", { exact: true })
    .fill(new Date(Date.now() + 3600000).toISOString());
  await page
    .getByLabel("Show remaining quantity from real inventory", { exact: true })
    .check();
  await page
    .getByLabel("Include this offer when the catalog is published", {
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "First products", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Synthetic fixture item", exact: true }),
  ).toBeVisible();
  await capture(page, "editor", info.project.name === "desktop");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Changes saved.", { exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: "Review & publish", exact: true })
    .click();
  await page
    .getByLabel(
      "I verified the actual rank/option data, availability, prices and customer promises, including any win-rate terms.",
      { exact: true },
    )
    .check();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Changes saved.", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Preview saved draft", exact: true })
    .click();
  await expect(
    page.getByText("Publication checks passed.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Publish catalog", exact: true })
    .click();
  await expect(
    page.getByText("Catalog published.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "← Back to shop product", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/admin/shop/${productID}\\?section=promotion$`),
  );
  await page
    .getByRole("link", { name: "← Shop products", exact: true })
    .click();
  expect(new URL(page.url()).searchParams.get("availability")).toBe(
    "available",
  );
  expect(new URL(page.url()).searchParams.get("q")).toBe(productID);
  expect(new URL(page.url()).searchParams.get("game")).toBe(product.game_id);
  await page.goto(`/games/${slug}`);
  await expect(
    page.getByRole("heading", {
      name: "Synthetic stock-backed shop offer",
      exact: true,
    }),
  ).toBeVisible();
  await capture(page, "public", info.project.name === "desktop");
  await page
    .getByRole("link", { name: "Review shop item", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/shop/${productID}\\?variant=fixture&quantity=1$`),
  );
  await expect(
    page.getByRole("heading", { name: "Choose your options", exact: true }),
  ).toBeVisible();
  await page.route("**/catalog-assets/game-placeholder.svg", async (route) => {
    await route.abort();
  });
  await page.reload();
  await expect(
    page.getByText("Artwork unavailable", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Choose your options", exact: true }),
  ).toBeVisible();
  await capture(page, "media-unavailable", info.project.name === "desktop");
});
