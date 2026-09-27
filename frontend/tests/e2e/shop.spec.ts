import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn, enroll, fixture } from "./identity-fixtures";
test("administrator authors and reviews a shop product with explicit capacity", async ({
  page,
  request,
}, info) => {
  test.setTimeout(180000);
  await signIn(
    page,
    request,
    fixture(info.project.name, "shopadmin"),
    "/admin/login",
  );
  await enroll(page);
  await page.goto("/admin/shop");
  await expect(
    page.getByRole("heading", { name: "Products", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No products yet. Create your first private draft above.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: `.cache/shop-list-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "New product draft", exact: true })
    .click();
  await page
    .getByLabel("Product game", { exact: true })
    .selectOption({ index: 1 });
  await page.getByLabel("New product title").fill("Synthetic delivery item");
  await page
    .getByRole("button", { name: "Create product draft", exact: true })
    .click();
  await expect(page.getByLabel("Product title", { exact: true })).toHaveValue(
    "Synthetic delivery item",
  );
  const productURL = page.url().split("?")[0];
  await page.getByRole("link", { name: "Publication", exact: true }).click();
  await page.getByRole("button", { name: "Preview saved revision" }).click();
  await expect(
    page.getByRole("heading", { name: "Check these product details" }),
  ).toBeVisible();
  await page.screenshot({
    path: `.cache/shop-validation-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("link", {
      name: "Delivery and commercial terms · Minimum delivery hours: Set an explicit ordered delivery estimate.",
    })
    .click();
  await expect(page.getByLabel("Minimum delivery hours")).toBeFocused();
  await expect(page.getByLabel("Minimum delivery hours")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.screenshot({
    path: `.cache/shop-field-correction-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Details", exact: true }).click();

  await page
    .getByLabel("Product description")
    .fill("Synthetic browser fixture only, not a commercial offer.");
  await page.getByLabel("Category", { exact: true }).fill("Fixture items");
  await page
    .getByLabel("Approved artwork path")
    .fill("/catalog-assets/game-placeholder.svg");
  await page
    .getByLabel("Artwork alternative text")
    .fill("Synthetic game item placeholder");
  await page
    .getByLabel("Artwork source and permission")
    .fill("Repository fixture artwork; not a live product image.");
  await page.getByRole("link", { name: "Variants", exact: true }).click();
  await page.getByRole("button", { name: "Add variant", exact: true }).click();
  await page
    .getByLabel("Variant label", { exact: true })
    .fill("Synthetic variant");
  for (const label of [
    "Supported region",
    "Supported platform",
    "Supported server",
  ])
    await page.getByLabel(label, { exact: true }).fill("Fixture only");
  await page.getByLabel("Price currency").selectOption("USD");
  await page.getByLabel("Unit price in minor units").fill("1234");
  await page.getByLabel("Offer this variant when published").check();
  await page
    .getByRole("link", { name: "Delivery information", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add player identifier", exact: true })
    .click();
  await page.getByLabel("Required for delivery").check();
  await page.getByRole("link", { name: "Terms", exact: true }).click();
  await page.getByLabel("Minimum delivery hours").fill("1");
  await page.getByLabel("Maximum delivery hours").fill("24");
  await page.getByLabel("Reservation minutes").fill("30");
  for (const label of [
    "Delivery terms",
    "Cancellation terms",
    "Refund terms",
    "Fees and included charges",
  ])
    await page
      .getByLabel(label, { exact: true })
      .fill("Explicit synthetic fixture terms for this browser test only.");
  await page.getByRole("link", { name: "Details", exact: true }).click();
  await expect(page.getByLabel("Product description")).toHaveValue(
    "Synthetic browser fixture only, not a commercial offer.",
  );
  await page
    .getByRole("link", { name: "← Shop products", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeFocused();
  await page.screenshot({
    path: `.cache/shop-leave-guard-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Stay with this draft" }).click();
  await page.getByRole("link", { name: "Publication", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Preview saved revision" }),
  ).toBeDisabled();
  await page
    .getByLabel(
      "I reviewed artwork rights, public details, compatibility, prices and terms",
    )
    .check();
  await page.getByRole("button", { name: "Save product draft" }).click();
  await expect(
    page.getByText("Saved revision 2", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Preview saved revision" }).click();
  await expect(
    page.getByRole("article", { name: "Private customer preview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Publish reviewed revision" }).click();
  await page
    .getByRole("button", { name: "Confirm publish", exact: true })
    .click();
  await expect(
    page.getByText("published · Revision 3", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Stock", exact: true }).click();
  await page.getByLabel("Total capacity for variant_1").fill("8");
  await page
    .getByLabel("Capacity change reason for variant_1")
    .fill("Eight units verified for this isolated browser fixture.");
  await expect(
    page.getByRole("button", { name: "Update variant_1 capacity" }),
  ).toBeDisabled();
  await page
    .getByLabel("I reviewed the stock commitments for variant_1")
    .check();
  await page.getByRole("button", { name: "Update variant_1 capacity" }).click();
  await expect(
    page.getByText("published · Revision 4", { exact: true }),
  ).toBeVisible();
  const initialViewport = page.viewportSize();
  for (const width of info.project.name === "desktop" ? [1440, 768] : [393]) {
    await page.setViewportSize({ width, height: 900 });
    for (const section of [
      "Details",
      "Variants",
      "Delivery information",
      "Terms",
      "Stock",
      "Publication",
      "History",
    ]) {
      await page.getByRole("link", { name: section, exact: true }).click();
      if (section === "Publication") {
        await page
          .getByRole("button", { name: "Preview saved revision" })
          .click();
        await expect(
          page.getByRole("article", { name: "Private customer preview" }),
        ).toBeVisible();
      }
      if (section === "History")
        await expect(
          page.getByText("Revision 3 ·", { exact: false }),
        ).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: `.cache/shop-${section.replaceAll(" ", "-").toLowerCase()}-${String(width)}.png`,
        fullPage: true,
      });
    }
  }
  if (initialViewport) await page.setViewportSize(initialViewport);
  await page.getByRole("link", { name: "Publication", exact: true }).click();
  await page
    .getByRole("button", { name: "Pause product", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm pause", exact: true })
    .click();
  await expect(
    page.getByText("paused · Revision 5", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "← Shop products", exact: true })
    .click();
  await expect(
    page.getByRole("link", {
      name: "Edit Synthetic delivery item",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Search products by title or reference")
    .fill("Synthetic delivery");
  await page
    .getByRole("button", { name: "Search products", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Edit Synthetic delivery item", exact: true })
    .click();
  await expect.poll(() => page.url().split("?")[0]).toBe(productURL);
});
