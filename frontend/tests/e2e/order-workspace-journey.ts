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
  await expect(page).toHaveURL(/\/orders\/[a-f0-9-]+$/);
  const id = page.url().split("/").at(-1);
  if (!id) throw new Error("Missing order reference");
  await expect(
    page.getByRole("region", { name: "Accepted agreement", exact: true }),
  ).toContainText("USD 12.34");
  await expect(
    page.getByRole("heading", { name: "Order timeline", exact: true }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Activity", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Order timeline", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Order activity", { exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Selections", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Requested selections", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Solo", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Open order conversation", exact: true })
    .click();
  await expect(page).toHaveURL(/\/support\/[a-f0-9-]+$/);
  await page
    .getByLabel("Message", { exact: true })
    .fill("Private unsent draft before returning to my order");
  await page.getByText("Details", { exact: true }).click();
  await page
    .getByRole("link", { name: "View linked order", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Accepted agreement", exact: true }),
  ).toBeVisible();
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
  await expect(
    page.getByRole("region", { name: "Accepted agreement", exact: true }),
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
    page.getByText("Order unavailable. Refresh to check access again.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".customer-order-workspace")).toHaveCount(0);
  await page.unroute(`**/api/v1/orders/${id}`);
  await page
    .getByRole("button", { name: "Refresh order", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Accepted agreement", exact: true }),
  ).toBeVisible();
}
