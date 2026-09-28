import { measuredInteraction } from "./integrated-capture";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fixture } from "./identity-fixtures";

test("game identity persists through service, package, review and missing-option navigation", async ({
  page,
}, info) => {
  const slug = fixture(info.project.name, "work_slug");
  await page.goto(`/games/${slug}`);
  const heading = page.getByRole("heading", { level: 1 });
  const name = await heading.textContent();
  await heading.evaluate((element) => {
    element.setAttribute("data-persistence-check", "original");
  });
  await page
    .locator(".game-service-card")
    .filter({ hasText: "Boosting" })
    .click();
  await expect(page).toHaveURL(`/games/${slug}?service=boost`);
  const custom = page.locator(`a[href="/games/${slug}/services/boost"]`);
  await measuredInteraction(
    page,
    `game-service-${info.project.name}`,
    async () => {
      await custom.click();
      await expect(page).toHaveURL(`/games/${slug}/services/boost`);
      await expect(
        page.locator(".game-local-content h2").first(),
      ).toBeFocused();
    },
  );
  await expect(heading).toHaveAttribute("data-persistence-check", "original");
  await expect(page.locator(".game-local-content h2").first()).toBeFocused();
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(heading).toHaveText(name ?? "");
  await page.goBack();
  await expect(page).toHaveURL(`/games/${slug}?service=boost`);
  await expect(heading).toHaveAttribute("data-persistence-check", "original");
  await page.locator(`a[href="/games/${slug}/packages/pack"]`).click();
  await expect(page).toHaveURL(`/games/${slug}/packages/pack`);
  await expect(heading).toHaveAttribute("data-persistence-check", "original");
  await page.goBack();
  await expect(page).toHaveURL(`/games/${slug}?service=boost`);
  await page.getByRole("link", { name: "← Back to choose a service" }).click();
  await expect(page).toHaveURL(`/games/${slug}`);
  await page.locator(`a[href="/games/${slug}/reviews"]`).click();
  await expect(page).toHaveURL(`/games/${slug}/reviews`);
  await expect(heading).toHaveAttribute("data-persistence-check", "original");
  await page.reload();
  await expect(heading).toHaveText(name ?? "");
  await page.goto(`/games/${slug}/services/missing`);
  await expect(
    page.getByRole("heading", { name: "This option is unavailable" }),
  ).toBeVisible();
  await expect(heading).toHaveText(name ?? "");
  await expect(
    page.getByRole("link", { name: "Back to game services" }),
  ).toHaveAttribute("href", `/games/${slug}`);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("link", { name: "Back to game services" }).click();
  await expect(page.locator(".game-local-content h2").first()).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("an unavailable parent game retains an accessible recovery title", async ({
  page,
}) => {
  const response = await page.goto("/games/unpublished-di01-fixture");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Game unavailable",
  );
  await expect(page).toHaveTitle("Game unavailable | PLAYORA");
  await expect(
    page.getByRole("link", { name: "Choose another game" }),
  ).toHaveAttribute("href", "/games");
});
