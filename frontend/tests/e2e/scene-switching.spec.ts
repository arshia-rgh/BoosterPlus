import { expect, test, type Route } from "@playwright/test";
import { fixture } from "./identity-fixtures";

// The homepage character switcher is retired. Exercise the current game shell
// under delayed media and discovery responses without making navigation wait.
test("delayed game artwork does not block service navigation", async ({
  page,
}, info) => {
  const held: Route[] = [];
  await page.route("**/catalog-assets/game-mlbb-1536.jpg", (route) => {
    held.push(route);
  });
  const slug = fixture(info.project.name, "discovery_mlbb");
  await page.goto(`/games/${slug}`, { waitUntil: "domcontentloaded" });
  const heading = page.getByRole("heading", {
    level: 1,
    name: "Mobile Legends",
  });
  await expect(heading).toBeVisible();
  await expect.poll(() => held.length).toBeGreaterThan(0);
  await heading.evaluate((element) => {
    element.dataset.identity = "preserved";
  });
  await page
    .locator(".game-service-card")
    .filter({ hasText: "Boosting" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Boosting for Mobile Legends" }),
  ).toBeFocused();
  await expect(heading).toHaveAttribute("data-identity", "preserved");
  for (const route of held) await route.continue();
  await page.unroute("**/catalog-assets/game-mlbb-1536.jpg");
  await expect
    .poll(() =>
      page
        .locator(".game-stage-art")
        .evaluate(
          (element) =>
            element instanceof HTMLImageElement &&
            element.complete &&
            element.naturalWidth > 0,
        ),
    )
    .toBe(true);
  await expect(heading).toHaveAttribute("data-identity", "preserved");
  await page.getByRole("link", { name: "← Back to choose a service" }).click();
  await expect(
    page.getByRole("heading", { name: "Choose a service" }),
  ).toBeFocused();
});

test("discovery failures and mismatched releases recover without hiding game services", async ({
  page,
}, info) => {
  const slug = fixture(info.project.name, "discovery_mlbb");
  let held: Route | undefined;
  let attempt = 0;
  await page.route(
    `**/api/v1/catalog/games/${slug}/discovery`,
    async (route) => {
      attempt += 1;
      if (attempt === 1) {
        held = route;
        return;
      }
      if (attempt === 2) {
        const response = await route.fetch();
        const data = (await response.json()) as Record<string, unknown>;
        await route.fulfill({
          response,
          json: { ...data, release_id: "superseded-release" },
        });
        return;
      }
      await route.continue();
    },
  );
  await page.goto(`/games/${slug}`);
  const heading = page.getByRole("heading", {
    level: 1,
    name: "Mobile Legends",
  });
  await expect.poll(() => !!held).toBe(true);
  await expect(page.getByText("Checking featured offers…")).toBeVisible();
  await page
    .locator(".game-service-card")
    .filter({ hasText: "Boosting" })
    .click();
  await expect(heading).toBeVisible();
  await expect(page.locator(".game-faq")).toBeVisible();
  if (!held) throw new Error("Discovery request was not intercepted");
  await held.fulfill({
    status: 503,
    contentType: "application/json",
    body: "{}",
  });
  await expect(
    page.getByText(/Featured offers are temporarily unavailable/),
  ).toBeVisible();
  await expect(page.locator(".featured-offers")).toHaveCount(0);
  await page.getByRole("button", { name: "Refresh activity" }).click();
  await expect.poll(() => attempt).toBe(2);
  await expect(
    page.getByText(/Featured offers are temporarily unavailable/),
  ).toBeVisible();
  await expect(page.locator(".featured-offers")).toHaveCount(0);
  await page.getByRole("button", { name: "Refresh activity" }).click();
  await expect(
    page.getByRole("heading", { name: "Boosting highlights" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Featured offers are temporarily unavailable/),
  ).toHaveCount(0);
  await expect(heading).toBeVisible();
  await expect(page.locator(".game-faq")).toBeVisible();
});
