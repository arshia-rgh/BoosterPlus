import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("home and game catalog are accessible and navigate correctly", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/PLAYORA/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "YOUR NEXT",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("link", { name: /explore games/i }).click();
  await expect(page).toHaveURL(/\/games$/);
  await expect(
    page.getByRole("heading", { name: "Choose your game. Shape your climb." }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("missing pages return 404 without reflecting malicious input", async ({
  page,
}) => {
  const response = await page.goto(
    "/missing?message=%3Cscript%3Ealert(1)%3C/script%3E",
  );
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await expect(page.getByText("alert(1)")).toHaveCount(0);
  await page.getByRole("link", { name: "Back to home" }).click();
  await expect(page).toHaveURL("/");
});

test("keyboard users can skip navigation", async ({ page }, info) => {
  await page.goto("/");
  // Safari's default keyboard policy uses Option-Tab to include links.
  await page.keyboard.press(
    info.project.use.browserName === "webkit" ? "Alt+Tab" : "Tab",
  );
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

for (const [path, title] of [
  ["/account", "Your account"],
  ["/admin", "Administration"],
  ["/admin/coupons", "Coupons"],
  ["/booster", "Booster portal"],
] as const) {
  test(`${path} shell is accessible and exposes no account data`, async ({
    page,
  }, info) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(
      page.getByText("Sign in with Google or an email code.", { exact: false }),
    ).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (path === "/account")
      await page.screenshot({
        path: ".cache/account-" + info.project.name + ".png",
        fullPage: true,
      });
  });
}
