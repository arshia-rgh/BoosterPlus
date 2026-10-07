import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
export async function qualifyCharacters(page: Page, project: string) {
  const showcase = page.locator(".world-showcase");
  await showcase.scrollIntoViewIfNeeded();
  const initialHeight = await showcase.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  await expect(showcase.getByRole("heading")).toHaveCount(1);
  for (const [game, key] of [
    ["Mobile Legends", "miya"],
    ["World of Warcraft", "illidan"],
    ["League of Legends", "ahri"],
  ]) {
    if (!game || !key) throw new Error("Missing character fixture");
    await showcase.getByRole("button", { name: game, exact: true }).click();
    const art = showcase.locator(`.character-art[data-character=${key}]`);
    await expect(art).toHaveAttribute("data-active", "true");
    await expect(showcase.locator(".world-stage")).toHaveAttribute(
      "data-scene",
      key,
    );
    await expect(art.locator("clipPath")).toHaveCount(0);
    await expect(art.locator("animate")).toHaveCount(2);
    expect(
      await showcase.evaluate(
        (element) => element.getBoundingClientRect().height,
      ),
    ).toBe(initialHeight);
    if ((page.viewportSize()?.width ?? 1280) <= 750) {
      const positions = await showcase.evaluate((element) => {
        const bounds = (selector: string) => {
          const child = element.querySelector(selector);
          if (!child) throw new Error("Missing showcase region");
          return child.getBoundingClientRect();
        };
        return {
          copyBottom: bounds(".world-copy").bottom,
          artTop: bounds(".world-stage").top,
          artBottom: bounds(".world-stage").bottom,
          actionTop: bounds(".world-action").top,
        };
      });
      expect(positions.copyBottom).toBeLessThanOrEqual(positions.artTop);
      expect(positions.artBottom).toBeLessThanOrEqual(positions.actionTop);
    }
    await page.screenshot({ path: `.cache/character-${project}-${key}.png` });
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    showcase.locator('.scene-layer[data-visible="true"] .character-art'),
  ).toHaveAttribute("data-motion", "reduced");
  await expect(showcase.locator("animate")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await showcase.scrollIntoViewIfNeeded();
  await expect(
    showcase.locator('.scene-layer[data-visible="true"] .character-art'),
  ).toHaveAttribute("data-active", "true");
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await expect(
    showcase.locator('.scene-layer[data-visible="true"] .character-art'),
  ).toHaveAttribute("data-active", "false");
  await page.route("**/characters/**", (route) => route.abort());
  await page.reload();
  await expect(page.locator(".character-fallback").first()).toBeAttached();
  await expect(
    page.getByRole("link", { name: "Explore games", exact: true }),
  ).toBeVisible();
  await page.unroute("**/characters/**");
}
