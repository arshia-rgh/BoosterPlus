import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export async function qualifyOrderWorkspace(page: Page, project: string) {
  await page
    .getByLabel("Search game or full order ID")
    .fill("Order journey game");
  await page.getByLabel("Order status").selectOption("awaiting_payment");
  await page
    .getByRole("button", { name: "Filter orders", exact: true })
    .click();
  await expect(page.locator(".order-list li")).toHaveCount(1);
  await expect(page.locator(".order-list")).toContainText(
    "Accepted total · USD 12.34",
  );
  await page.locator(".order-list").getByRole("link").click();
  await expect(page).toHaveURL(/\/orders\/[a-f0-9-]+\?section=payment$/);
  const id = new URL(page.url()).pathname.split("/").at(-1);
  if (!id) throw new Error("Missing order reference");
  await page
    .getByRole("navigation", { name: "Order sections", exact: true })
    .getByRole("link", { name: "Overview", exact: true })
    .click();
  const agreement = page.locator(
    '[data-order-section="Accepted agreement"] > summary',
  );
  await expect(agreement).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Accepted agreement", exact: true }),
  ).toBeHidden();
  await agreement.click();
  await expect(
    page.getByRole("region", { name: "Accepted agreement", exact: true }),
  ).toContainText("USD 12.34");
  await agreement.click();
  await expect(
    page.getByRole("heading", { name: "Order timeline", exact: true }),
  ).toBeHidden();
  await page.getByText("Order activity", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Order timeline", exact: true }),
  ).toBeVisible();
  await page.getByText("Selections & reorder", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Requested selections", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Solo", { exact: true })).toBeVisible();
  const identity = page.locator(".record-heading");
  await identity.evaluate((element) => {
    element.setAttribute("data-retained", "original");
  });
  const tabs = page.getByRole("navigation", {
    name: "Order sections",
    exact: true,
  });
  await tabs.getByRole("link", { name: "Messages", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/orders/${id}\\?section=messages$`));
  await page
    .getByLabel("Message", { exact: true })
    .fill("Private unsent draft kept inside my order");
  await tabs.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page.getByLabel("Message", { exact: true })).toBeHidden();
  await tabs.getByRole("link", { name: "Messages", exact: true }).click();
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
    "Private unsent draft kept inside my order",
  );
  await expect(identity).toHaveAttribute("data-retained", "original");
  await tabs.getByRole("link", { name: "Payment", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Payment and receipts", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
    "Private unsent draft kept inside my order",
  );
  await tabs.getByRole("link", { name: "Overview", exact: true }).click();
  const viewport = page.viewportSize();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  }
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  if (viewport) await page.setViewportSize(viewport);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: `.cache/ux04-order-${project}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "← Order list", exact: true }).click();
  await expect(page.getByLabel("Order status")).toHaveValue("awaiting_payment");
  await expect(page.getByLabel("Search game or full order ID")).toHaveValue(
    "Order journey game",
  );
  await expect(page.locator(".order-list li")).toHaveCount(1);
  await page.screenshot({
    path: `.cache/ux04-list-${project}.png`,
    fullPage: true,
  });
  await page.locator(".order-list").getByRole("link").click();
  await tabs.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(
    page.locator('[data-order-section="Accepted agreement"] > summary'),
  ).toBeVisible();
  await page.route(`**/api/v1/orders/${id}`, (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ code: "permission_denied" }),
    }),
  );
  await page
    .getByRole("button", { name: "Refresh order", exact: true })
    .click();
  await expect(
    page.getByText(
      "Order access is no longer available. Sign in to your customer account to continue.",
      {
        exact: true,
      },
    ),
  ).toBeVisible();
  await expect(page.locator(".customer-order-workspace")).toHaveCount(0);
  await page.unroute(`**/api/v1/orders/${id}`);
  await page
    .getByRole("button", { name: "Check order access again", exact: true })
    .click();
  await expect(
    page.locator('[data-order-section="Accepted agreement"] > summary'),
  ).toBeVisible();
}
