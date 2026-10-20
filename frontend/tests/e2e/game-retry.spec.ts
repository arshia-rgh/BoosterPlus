import { expect, test } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";
let server: ViteDevServer, origin: string;
test.beforeAll(async () => {
  server = await createServer({
    configFile: false,
    envDir: false,
    root: fileURLToPath(new URL("../fixtures/game-retry", import.meta.url)),
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
test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({ status: 503, json: { code: "unavailable" } }),
  );
});
test.afterEach(async ({ page }, info) => {
  await info.attach("synthetic-retry-events", {
    body: JSON.stringify(await page.evaluate(() => window.gameRetryAudit)),
    contentType: "application/json",
  });
});
for (const mode of [
  "immediate",
  "delayed",
  "repeat",
  "render-delayed",
  "render-error",
]) {
  test(`keyboard retry keeps game context and focuses committed content: ${mode}`, async ({
    page,
  }, info) => {
    const url = `${origin}/games/example/reviews?mode=${mode}#details`;
    await page.goto(url);
    const identity = page.getByRole("heading", { level: 1 });
    await expect(identity).toHaveText("Example game");
    await identity.evaluate((el) => {
      el.setAttribute("data-original", "true");
    });
    const retry = page.getByRole("button", { name: "Retry this section" });
    await retry.focus();
    await expect(retry).toBeFocused();
    await page.keyboard.press("Enter");
    if (mode === "repeat") {
      await expect(
        page.getByRole("heading", { name: "This section could not load" }),
      ).toBeFocused();
      await retry.focus();
      await page.keyboard.press("Enter");
    }
    if (mode === "delayed") {
      await expect(
        page.getByRole("button", { name: "Loading section…" }),
      ).toBeDisabled();
      await page.evaluate(() => {
        window.finishGameRetry();
      });
    }
    if (mode === "render-delayed") {
      await page.waitForFunction(() =>
        window.gameRetryAudit.includes("render:waiting"),
      );
      await page.evaluate(() => {
        window.finishGameRender();
      });
    }
    const recovered = page.getByRole("heading", {
      name:
        mode === "render-error"
          ? "This section could not load"
          : "Game reviews",
    });
    await expect(recovered).toBeFocused();
    await expect(recovered).toHaveAttribute("tabindex", "-1");
    await expect(recovered).toBeInViewport();
    await expect(identity).toHaveAttribute("data-original", "true");
    await expect(page).toHaveURL(url);
    expect(await page.evaluate(() => history.state as unknown)).toEqual({
      key: "fixture",
      idx: 0,
      usr: { shopSearch: "region=global" },
    });
    expect(
      await page.evaluate(
        () =>
          window.gameRetryAudit.filter((event) => event.startsWith("loader:"))
            .length,
      ),
    ).toBe(mode === "repeat" ? 3 : 2);
    await page.screenshot({ path: info.outputPath(`${mode}.png`) });
  });
}
test("navigation cancels pending retry focus", async ({ page }, info) => {
  await page.goto(`${origin}/games/example/reviews?mode=delayed`);
  await page.getByRole("button", { name: "Retry this section" }).click();
  await expect(
    page.getByRole("button", { name: "Loading section…" }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Back to game services" }).click();
  const section = page.getByRole("heading", { name: "Choose a service" });
  await expect(section).toBeFocused();
  const other = page.getByRole("link", { name: "← All games" });
  await other.focus();
  await page.evaluate(() => {
    window.finishGameRetry();
  });
  await expect(section).toBeVisible();
  await expect(other).toBeFocused();
  await page.screenshot({ path: info.outputPath("navigate-away.png") });
});
