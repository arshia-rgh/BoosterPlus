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
  await page.screenshot({
    path: `.cache/shop-list-${info.project.name}.png`,
    fullPage: true,
  });
  const search = page.getByLabel("Search products by title or reference");
  await search.fill("Synthetic delivery");
  await page
    .getByRole("button", { name: "Search products", exact: true })
    .click();
  await expect(page).toHaveURL(/q=Synthetic\+delivery/);
  await search.fill("Other item");
  await page
    .getByRole("button", { name: "Search products", exact: true })
    .click();
  await expect(page).toHaveURL(/q=Other\+item/);
  await page.goBack();
  await expect(search).toHaveValue("Synthetic delivery");
  await page.goForward();
  await expect(search).toHaveValue("Other item");
  await page.goBack();
  await expect(search).toHaveValue("Synthetic delivery");
  await page.screenshot({
    path: `.cache/di15-shop-filter-history-${info.project.name}.png`,
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
  await expect(page).toHaveURL(/section=basics&field=description/);
  const description = page.getByLabel("Product description", { exact: true });
  await expect(description).toBeFocused();
  await expect(description).toBeInViewport();
  await expect(description).toHaveAttribute("aria-invalid", "true");
  await expect(description).toHaveAccessibleDescription(
    "Provide bounded plain text.",
  );
  await page.screenshot({
    path: `.cache/shop-validation-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Terms", exact: true }).click();
  const minimumDelivery = page.getByLabel("Minimum delivery hours");
  await expect(minimumDelivery).toBeVisible();
  await expect(minimumDelivery).toHaveAttribute("aria-invalid", "true");
  await expect(minimumDelivery).toHaveAccessibleDescription(
    "Set an explicit ordered delivery estimate.",
  );
  await expect(
    page.getByText("Set an explicit ordered delivery estimate.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: `.cache/shop-field-correction-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Details", exact: true }).click();

  await page
    .getByLabel("Product description")
    .fill("Synthetic browser fixture only, not a commercial offer.");
  await page.getByLabel("Category", { exact: true }).fill("Fixture items");
  await page.getByText("Existing artwork path", { exact: true }).click();
  await page
    .getByLabel("Approved artwork path")
    .fill("/catalog-assets/game-placeholder.svg");
  const productArtwork = page.locator(
    '.artwork-upload[data-purpose="product"]',
  );
  await productArtwork
    .getByLabel("Choose a replacement image")
    .setInputFiles("tests/fixtures/proof.png");
  await productArtwork
    .getByRole("button", { name: "Prepare image versions", exact: true })
    .click();
  await expect(
    productArtwork.getByRole("button", { name: "Use this image", exact: true }),
  ).toBeEnabled();
  await expect(
    productArtwork.getByAltText("Large image preview"),
  ).toBeVisible();
  await productArtwork
    .getByRole("button", { name: "Use this image", exact: true })
    .click();
  await expect(page.getByLabel("Approved artwork path")).toHaveValue(
    /^\/api\/v1\/artwork\//,
  );
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
  await page.getByRole("link", { name: "Variants", exact: true }).click();
  const minimumQuantity = page.getByLabel("Minimum quantity", { exact: true });
  await minimumQuantity.fill("1.5");
  let invalidDraftWrites = 0;
  const countDraftWrite = (request: import("@playwright/test").Request) => {
    if (
      request.method() === "POST" &&
      /\/api\/v1\/admin\/shop\/products\/[^/]+\/draft$/.test(
        new URL(request.url()).pathname,
      )
    )
      invalidDraftWrites++;
  };
  page.on("request", countDraftWrite);
  for (const attempt of [1, 2]) {
    await page.getByRole("button", { name: "Save product draft" }).click();
    await expect(page).toHaveURL(
      /section=variants&field=variants\.0\.min_quantity/,
    );
    await expect(minimumQuantity).toBeVisible();
    await expect(minimumQuantity).toBeFocused();
    await expect(minimumQuantity).toBeInViewport();
    await expect(minimumQuantity).toHaveValue("1.5");
    await expect(minimumQuantity).toHaveAttribute("aria-invalid", "true");
    await expect(minimumQuantity).toHaveAccessibleDescription(
      "Enter a whole number before continuing.",
    );
    if (attempt === 1) {
      await page.getByRole("link", { name: "Terms", exact: true }).click();
      const deliveryTerms = page.getByLabel("Delivery terms", { exact: true });
      await expect(page).toHaveURL(/section=terms/);
      await expect(minimumQuantity).toBeHidden();
      await expect(deliveryTerms).toBeVisible();
      await deliveryTerms.focus();
      // Let the old field query's scheduled focus run before checking Terms.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => {
              resolve();
            }),
          ),
      );
      await expect(deliveryTerms).toBeFocused();
      await expect(deliveryTerms).toHaveValue(
        "Explicit synthetic fixture terms for this browser test only.",
      );
    }
  }
  expect(invalidDraftWrites).toBe(0);
  page.off("request", countDraftWrite);
  await minimumQuantity.fill("1");
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
  await expect(search).toHaveValue("Synthetic delivery");
  await expect(page).toHaveURL(/q=Synthetic\+delivery/);
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
  await page.getByRole("link", { name: "Variants", exact: true }).click();
  await page.getByLabel("Supported region").fill("Different compatibility");
  await page.getByRole("link", { name: "Publication", exact: true }).click();
  await page
    .getByLabel(
      "I reviewed artwork rights, public details, compatibility, prices and terms",
    )
    .check();
  await page.getByRole("button", { name: "Save product draft" }).click();
  await expect(
    page.getByText("Saved revision 6", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Preview saved revision" }).click();
  await expect(page).toHaveURL(/section=variants&field=variants\.0\.key/);
  const stableKey = page.getByLabel("Stable variant key", { exact: true });
  const compatibilityError =
    "Published variant keys keep their region, platform and server. Use a new key for different compatibility.";
  await expect(stableKey).toBeFocused();
  await expect(stableKey).toBeInViewport();
  await expect(stableKey).toHaveValue("variant_1");
  await expect(stableKey).toHaveAttribute("aria-invalid", "true");
  await expect(stableKey).toHaveAccessibleDescription(compatibilityError);
  await expect(
    page.getByText(compatibilityError, { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Supported region")).toHaveValue(
    "Different compatibility",
  );
  // Invalid preview moves to the correction field and removes Publication.
  await expect(
    page.getByRole("button", { name: "Publish reviewed revision" }),
  ).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: `.cache/shop-compatibility-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByLabel("Supported region").fill("Fixture only");
  await expect(stableKey).toHaveValue("variant_1");
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
    page.getByText("Saved revision 7", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Preview saved revision" }).click();
  await expect(
    page.getByRole("article", { name: "Private customer preview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish reviewed revision" }),
  ).toBeEnabled();
  await expect(page.getByText(compatibilityError, { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByText("paused · Revision 7", { exact: true }),
  ).toBeVisible();
});
