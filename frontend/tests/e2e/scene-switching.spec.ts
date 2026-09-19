import { expect, test, type Route } from "@playwright/test";

test("slow scene loading keeps the old scene; rapid selection ignores stale results", async ({
  page,
}) => {
  const held: Route[] = [];
  await page.route("**/scenes/ahri.jpg", (route) => {
    held.push(route);
  });
  await page.goto("/");
  const stage = page.locator(".world-stage");
  await stage.scrollIntoViewIfNeeded();
  await page
    .getByRole("button", { name: "League of Legends", exact: true })
    .click();
  await expect.poll(() => held.length).toBeGreaterThan(0);
  await expect(stage).toHaveAttribute("data-scene", "miya");
  await expect(stage).toHaveAttribute("aria-busy", "true");
  await page
    .getByRole("button", { name: "World of Warcraft", exact: true })
    .press("Enter");
  await expect(stage).toHaveAttribute("data-scene", "illidan");
  for (const route of held) await route.continue();
  await expect(stage).toHaveAttribute("aria-busy", "false");
  await expect(stage.locator('[data-character="ahri"]')).toHaveCount(0);
  await expect(
    page.locator('.world-backdrop[data-visible="true"]'),
  ).toHaveAttribute("src", "/scenes/illidan.jpg");
  await expect(stage.locator(".scene-layer")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "World of Warcraft", exact: true }),
  ).toBeFocused();
});

test("a stalled motion field becomes a still; a missing backdrop remains usable", async ({
  page,
}) => {
  await page.route("**/characters/illidan-wing-field.svg", () => {});
  await page.route("**/scenes/illidan.jpg", (route) => route.abort());
  await page.goto("/");
  const stage = page.locator(".world-stage");
  await stage.scrollIntoViewIfNeeded();
  await page
    .getByRole("button", { name: "World of Warcraft", exact: true })
    .press("Enter");
  await expect(stage).toHaveAttribute("data-scene", "illidan", {
    timeout: 7000,
  });
  const active = stage.locator('.scene-layer[data-visible="true"]');
  await expect(active.locator(".character-art")).toHaveAttribute(
    "data-motion",
    "reduced",
  );
  await expect(active.locator("image")).not.toHaveAttribute("filter");
  await expect(page.locator('img[src="/scenes/illidan.jpg"]')).toBeHidden();
  await expect(
    page.getByRole("link", { name: "Browse available games" }),
  ).toBeVisible();
});
