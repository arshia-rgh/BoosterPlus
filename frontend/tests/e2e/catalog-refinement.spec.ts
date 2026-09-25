import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fixture } from "./identity-fixtures";

test("homepage choice survives game selection, reload and back; form results stay clear", async ({
  page,
}, info) => {
  const slug = fixture(info.project.name, "work_slug");
  for (const [path, name] of [
    ["custom", "Explore custom boosting"],
    ["packages", "Browse published packages"],
  ] as const) {
    await page.goto("/");
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(`/games?path=${path}`);
    await page.locator(`a[href="/games/${slug}?path=${path}"]`).first().click();
    await expect(page).toHaveURL(`/games/${slug}?path=${path}`);
    await page.reload();
    const picker = page.getByRole("navigation", { name: "Boosting type" });
    await expect(
      picker.getByRole("button", {
        name: path === "custom" ? "Custom boosting" : "Fixed packages",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("heading", {
        name: path === "custom" ? "Fixed packages" : "Custom boosting",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(page.locator(".game-stage-art")).toHaveCount(0);
    await expect(page.locator(".game-stage-compact")).toBeVisible();
    await page.getByRole("link", { name: "← All games" }).click();
    await expect(page).toHaveURL(`/games?path=${path}`);
    await page.goBack();
    await expect(page).toHaveURL(`/games/${slug}?path=${path}`);
  }
  await page.goto(`/games/${slug}/services/boost`);
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Games", exact: true }),
  ).toHaveCount(0);
  const summary = page.getByRole("complementary", {
    name: "Selection summary",
  });
  await page
    .getByRole("button", { name: "Check selections", exact: true })
    .click();
  await expect(summary).toContainText("Some selections need attention");
  await page.getByLabel("Mode (required)").selectOption("duo");
  await expect(summary).toContainText("Your selections have changed");
  await page
    .getByRole("button", { name: "Check selections", exact: true })
    .click();
  const result = page.getByRole("region", { name: "Price estimate" });
  await expect(result).toContainText("manual price review");
  await expect(summary).toContainText(
    "These selections need a manual price review",
  );
  await result.scrollIntoViewIfNeeded();
  const bounds = await page.locator(".dynamic-form").evaluate((form) => {
    const summary = form
      .querySelector(".selection-summary")
      ?.getBoundingClientRect();
    const result = form
      .querySelector('[aria-label="Price estimate"]')
      ?.getBoundingClientRect();
    if (!summary || !result) throw new Error("Missing summary or result");
    return { bottom: summary.bottom, top: result.top };
  });
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.top);
  await page.screenshot({
    path: `.cache/hf02a-form-${info.project.name}.png`,
    fullPage: true,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .getByRole("button", { name: "Continue to order information →" })
    .click();
  await expect(
    page.getByRole("heading", { name: "2. Review & request" }),
  ).toBeFocused();
  await expect(result).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 480 });
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  for (const name of ["Support", "My account"])
    await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});
