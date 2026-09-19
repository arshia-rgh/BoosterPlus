import { expect, test } from "@playwright/test";
test.use({ video: { mode: "on", size: { width: 1280, height: 720 } } });
test("records native scroll and multi-game articulated motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator("#rank-journey")).toHaveAttribute(
    "data-enhanced",
    "true",
  );
  for (const direction of [1, -1]) {
    await page.locator("#rank-journey").evaluate(async (scene, direction) => {
      const top = scene.getBoundingClientRect().top + scrollY;
      const travel = scene.getBoundingClientRect().height - innerHeight;
      await new Promise<void>((resolve) => {
        let frame = 0;
        const move = () => {
          const progress = direction === 1 ? frame / 90 : 1 - frame / 90;
          scrollTo(0, top + travel * progress);
          if (++frame <= 90) requestAnimationFrame(move);
          else resolve();
        };
        requestAnimationFrame(move);
      });
    }, direction);
  }
  const showcase = page.locator(".world-showcase");
  await showcase.scrollIntoViewIfNeeded();
  for (const game of [
    "Mobile Legends",
    "World of Warcraft",
    "League of Legends",
  ]) {
    await showcase.getByRole("button", { name: game, exact: true }).click();
    await expect(showcase.locator(".world-stage")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await expect(showcase.locator(".scene-layer")).toHaveCount(1);
    await expect(
      showcase.locator('.scene-layer[data-visible="true"] .character-art'),
    ).toHaveAttribute("data-active", "true");
    // A complete deterministic recording interval, not a wait used to make an assertion pass.
    await page.evaluate(
      async () =>
        new Promise<void>((resolve) => {
          let frames = 0;
          const tick = () => {
            if (++frames === 100) resolve();
            else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
    );
  }
  await page.getByRole("button", { name: "Reduced", exact: true }).click();
  await expect(showcase.locator("animate")).toHaveCount(0);
  await page.getByRole("link", { name: "Games", exact: true }).first().click();
  await expect(page.locator(".character-art")).toHaveCount(0);
});
