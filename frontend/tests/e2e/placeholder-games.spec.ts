import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";
let server: ViteDevServer, origin: string;
test.beforeAll(async () => {
  server = await createServer({
    configFile: false,
    envDir: false,
    root: fileURLToPath(
      new URL("../fixtures/placeholder-games", import.meta.url),
    ),
    publicDir: fileURLToPath(new URL("../../public", import.meta.url)),
    server: {
      host: "127.0.0.1",
      port: 0,
      fs: { allow: [fileURLToPath(new URL("../../../", import.meta.url))] },
    },
    logLevel: "error",
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string")
    throw new Error("Missing fixture address");
  origin = `http://127.0.0.1:${String(address.port)}`;
});
test.afterAll(async () => {
  await server.close();
});
for (const width of [390, 1280])
  test(`placeholder games at ${String(width)}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/v1/**", (route) =>
      route.fulfill({ status: 401, json: { code: "unauthorized" } }),
    );
    await page.goto(origin);
    await expect(
      page.getByRole("heading", { name: "Find your game." }),
    ).toBeVisible();
    await expect(
      page.locator("article.discovery-game-card.is-paused"),
    ).toHaveCount(5);
    await expect(page.locator("a.discovery-game-card")).toHaveCount(1);
    const firstCard = page.locator(".discovery-game-card").first();
    await expect(firstCard).toHaveAttribute("href", "/games/mobile-legends");
    await expect(firstCard.locator(".game-capabilities span")).toHaveText([
      "Boosting",
      "Accounts",
      "Shop",
      "News",
    ]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByText("Services currently unavailable", { exact: true }),
    ).toHaveCount(5);
    await page.screenshot({
      path: info.outputPath(`lineup-${String(width)}.png`),
      fullPage: true,
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.goto(origin + "/games/dota-2");
    await expect(
      page.getByRole("heading", { name: "Dota 2", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Services are not available yet" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Browse all games" }),
    ).toBeVisible();
    await expect(page.getByText("Read customer reviews")).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Activity statistics" }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Choose a service", { exact: true }),
    ).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath(`game-${String(width)}.png`),
      fullPage: true,
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const section of ["?service=boost", "/accounts", "/shop", "/news"]) {
      await page.goto(origin + "/games/dota-2" + section);
      await expect(
        page.getByRole("heading", { name: /is currently unavailable/ }),
      ).toBeVisible();
      await expect(page.locator(".game-service-card")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: /Buy|Pay|Reserve|Order/i }),
      ).toHaveCount(0);
    }
  });
