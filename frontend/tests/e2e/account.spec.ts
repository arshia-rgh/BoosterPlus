import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn, accountDestination, signOut } from "./identity-fixtures";

test("account overview, settings and mobile menu preserve focus, privacy and preferences", async ({
  page,
  request,
}, info) => {
  await signIn(page, request, `account-ux-${randomUUID()}@example.test`);
  await expect(
    page.getByRole("heading", { name: "Ready for your next climb?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Profile", exact: true }),
  ).toHaveCount(0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const more = page.getByRole("button", { name: "More", exact: true });
    if (width <= 850) {
      await more.click();
      const menu = page.getByRole("dialog", { name: "Account menu" });
      await expect(menu).toBeVisible();
      await expect(
        menu.getByRole("link", { name: "Administration ↗" }),
      ).toHaveCount(0);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(menu).not.toBeVisible();
      await expect(more).toBeFocused();
    }
  }
  await page.setViewportSize(
    info.project.use.viewport ?? { width: 1440, height: 900 },
  );
  await page.screenshot({
    path: `.cache/ux02-overview-${info.project.name}.png`,
    fullPage: true,
  });
  await accountDestination(page, "Profile");
  await page
    .getByLabel("Display name", { exact: true })
    .fill("A long player name ".repeat(5));
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.", { exact: true })).toBeVisible();
  const name = await page
    .getByLabel("Display name", { exact: true })
    .inputValue();
  await accountDestination(page, "Preferences");
  await page.getByLabel("Email me order updates", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByText("Email preferences saved.")).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Email me order updates", { exact: true }),
  ).not.toBeChecked();
  await accountDestination(page, "Profile");
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    name,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: `.cache/ux02-profile-${info.project.name}.png`,
    fullPage: true,
  });
  await page.goto("/account/security?returnTo=%2Forders");
  await expect(
    page.getByRole("link", { name: "Return to your task ↗" }),
  ).toHaveAttribute("href", "/orders");
  await page.goto("/account/security?returnTo=https%3A%2F%2Fevil.test");
  await expect(
    page.getByRole("link", { name: "Return to your task ↗" }),
  ).toHaveCount(0);
  await signOut(page);
  await expect(
    page.getByRole("button", { name: "Send verification code" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Account navigation", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  expect((await page.request.get("/api/v1/me/overview")).status()).toBe(401);
});
