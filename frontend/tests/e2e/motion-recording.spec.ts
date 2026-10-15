import { expect, test } from "@playwright/test";
import { fixture } from "./identity-fixtures";
test.use({ video: { mode: "on", size: { width: 1280, height: 720 } } });
test("records native homepage reveals and persistent game atmosphere", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  for (const [index, kind] of [
    "boost",
    "accounts",
    "shop",
    "payment",
    "news",
  ].entries()) {
    await page
      .getByRole("tablist", { name: "Explore PLAYORA services" })
      .getByRole("tab")
      .nth(index)
      .click();
    const section = page.locator(`.introduction-${kind}`);
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveCSS("animation-name", "explorer-enter");
    // Record one complete finite entry interval. This is video evidence, not a
    // sleep used to make a functional assertion pass.
    await page.evaluate(
      async () =>
        new Promise<void>((resolve) => {
          let frames = 0;
          const frame = () => {
            if (++frames === 50) resolve();
            else requestAnimationFrame(frame);
          };
          requestAnimationFrame(frame);
        }),
    );
  }
  await page.getByRole("link", { name: "Choose your game" }).last().click();
  await expect(page.locator("#game-selection-title")).toBeFocused();
  await page
    .locator(`a[href="/games/${fixture(info.project.name, "discovery_wow")}"]`)
    .click();
  await expect(page.locator(".game-backdrop img")).toHaveCSS(
    "animation-name",
    "game-background-drift",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".game-backdrop img")).toHaveCSS(
    "animation-name",
    "none",
  );
});
