import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fixture } from "./identity-fixtures";
// Supersedes the retired homepage character-showcase journeys. The historic rig
// remains component-tested; the accepted runtime now uses equal game hubs.
for (const game of ["mlbb", "wow", "lol", "valorant", "dota", "wildrift"]) {
  test(`game ${game} preserves its framing, motion choice and failed-image fallback`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const path = `/games/${fixture(info.project.name, `discovery_${game}`)}`;
    await page.goto(path);
    await expect(page.locator(".game-shell")).toHaveAttribute(
      "data-motion",
      "full",
    );
    const backdrop = page.locator(".game-backdrop img");
    await expect(backdrop).toHaveCSS("animation-name", "game-background-drift");
    const hero = page.locator(".game-stage-art");
    const source = await hero.getAttribute("src");
    expect(source).toContain(`/catalog-assets/game-${game}-1536.`);
    await expect(backdrop).toHaveAttribute("src", source ?? "");
    await page
      .getByRole("button", { name: "Reduce background motion", exact: true })
      .click();
    await expect(page.locator(".game-shell")).toHaveAttribute(
      "data-motion",
      "reduced",
    );
    await expect(backdrop).toHaveCSS("animation-name", "none");
    await page.reload();
    await expect(page.locator(".game-shell")).toHaveAttribute(
      "data-motion",
      "reduced",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page
      .getByRole("button", { name: "Use device motion setting", exact: true })
      .click();
    await expect(backdrop).toHaveCSS("animation-name", "none");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.route(`**/catalog-assets/game-${game}-1536.*`, (route) =>
      route.abort(),
    );
    await page.reload();
    await expect(page.locator(".game-stage-compact")).toBeVisible();
    await expect(page.locator(".game-backdrop")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Choose a service" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "← All games" })).toBeVisible();
    await page.locator(".game-stage").screenshot({
      path: `.cache/di04-fallback-${game}-${info.project.name}.png`,
    });
  });
}
