import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";

let server: ViteDevServer, origin: string;
test.beforeAll(async () => {
  server = await createServer({
    configFile: false,
    envDir: false,
    root: fileURLToPath(new URL("../fixtures/service-scenes", import.meta.url)),
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
    throw new Error("Missing review address");
  origin = `http://127.0.0.1:${String(address.port)}`;
});
test.afterAll(async () => {
  await server.close();
});

const services = [
  ["boost", "Boost services"],
  ["accounts", "Accounts"],
  ["shop", "In-game shops"],
  ["news", "News and guides"],
  ["payment", "Crypto payment"],
] as const;

for (const width of [320, 390, 1280]) {
  test(`all five scenes and service order at ${String(width)}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin);
    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveText(
      services.map(([, label], i) => `0${String(i + 1)}${label}`),
    );
    for (const [index, [kind]] of services.entries()) {
      await tabs.nth(index).click();
      const panel = page.getByRole("tabpanel");
      const frame = panel.locator(".service-scene");
      await frame.scrollIntoViewIfNeeded();
      await expect(frame).toHaveAttribute("data-image-state", "ready");
      await expect(frame.locator("img")).toHaveAttribute("alt", "");
      expect(
        await frame
          .locator("img")
          .evaluate(
            (image: HTMLImageElement, selectedKind) =>
              image.naturalWidth > 0 &&
              image.currentSrc.includes(`/service-scenes/${selectedKind}-v1-`),
            kind,
          ),
      ).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const box = await frame.boundingBox();
      expect(box).not.toBeNull();
      expect(
        Math.abs((box?.width ?? 0) / (box?.height ?? 1) - 1.6),
      ).toBeLessThan(0.03);
      if (width !== 320)
        await panel.screenshot({
          path: info.outputPath(`${kind}-${String(width)}.png`),
        });
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await panel.getByRole("link", { name: /Choose your game/ }).click();
      await expect(page.locator("#game-selection-title")).toBeFocused();
    }
    await tabs.first().focus();
    await page.keyboard.press("End");
    await expect(tabs.last()).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.first()).toBeFocused();
  });
}

test("failed artwork retains its frame and controls at 320px", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route("**/artwork/service-scenes/**", (route) => route.abort());
  await page.goto(origin);
  const frame = page.locator(".service-scene");
  await frame.scrollIntoViewIfNeeded();
  await expect(frame).toHaveAttribute("data-image-state", "failed");
  const before = await frame.boundingBox();
  await page.getByRole("button", { name: "Next service" }).click();
  await frame.scrollIntoViewIfNeeded();
  await expect(frame).toHaveAttribute("data-image-state", "failed");
  const after = await frame.boundingBox();
  expect(after?.height).toBe(before?.height);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("tabpanel")
    .screenshot({ path: info.outputPath("failed-320.png") });
});

test("service navigation remains usable with reduced motion and enlarged text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(origin);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page.getByRole("tab", { name: /News and guides/ }).click();
  await expect(page.locator(".introduction-news")).toBeVisible();
  expect(
    await page
      .locator(".explorer-content")
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe("none");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
