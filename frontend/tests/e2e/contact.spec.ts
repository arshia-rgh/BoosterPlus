import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Public discovery and read-only navigation only. No external channel, mailto,
// message, payment, or real-provider sign-in is opened by this test.
test("public contact stays available before sign-in and preserves the private-support return", async ({
  page,
}, info) => {
  await page.goto("/contact");
  await expect(
    page.getByRole("heading", { level: 1, name: "Contact us." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "support@playoragames.com" }),
  ).toHaveAttribute("href", "mailto:support@playoragames.com");
  await expect(
    page.getByRole("link", { name: "Email for account access" }),
  ).toHaveAttribute("href", "mailto:support@playoragames.com");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("link", { name: "Chat with support" }),
    ).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `.cache/contact138-${info.project.name}-${String(width)}.png`,
      fullPage: true,
    });
  }
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Support", exact: true })
    .click();
  await expect(page).toHaveURL(/\/contact$/);
  await page.getByRole("link", { name: "Contact us & support" }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await page.getByRole("link", { name: "Chat with support" }).click();
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fsupport$/);
  await expect(page.getByLabel("Email address", { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(
    page.getByRole("link", { name: "support@playoragames.com" }),
  ).toBeVisible();
});
