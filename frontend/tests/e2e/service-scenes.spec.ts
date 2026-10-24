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

for (const width of [320, 390, 820, 1440]) {
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
      // Guard against later shared-image CSS silently restoring letterboxing.
      for (const scene of [frame, panel.locator(".scene-backdrop")]) {
        expect(
          await scene
            .locator("img")
            .evaluate((e) => getComputedStyle(e).objectFit),
        ).toBe("cover");
        const imageBounds = await scene.locator("img").boundingBox();
        const frameBounds = await scene.boundingBox();
        expect(imageBounds?.width).toBeGreaterThanOrEqual(
          (frameBounds?.width ?? 0) - 1,
        );
        expect(imageBounds?.height).toBeGreaterThanOrEqual(
          (frameBounds?.height ?? 0) - 1,
        );
      }
      const backdrop = await panel.locator(".scene-backdrop").boundingBox();
      expect(backdrop?.height).toBeCloseTo(
        (await panel.locator(".explorer-content").boundingBox())?.height ?? 0,
        0,
      );
      if (width > 650) {
        for (const [peekIndex, direction] of ["previous", "next"].entries()) {
          const peek = page.locator(`.peek-${direction}`);
          const adjacent = services[(index + (peekIndex === 0 ? 4 : 1)) % 5];
          if (!adjacent) throw new Error("Missing adjacent service fixture");
          await expect(peek).toHaveAccessibleName(`Explore ${adjacent[1]}`);
          await expect(peek.locator(".peek-scene")).toHaveAttribute(
            "data-image-state",
            "ready",
          );
          expect(
            await peek
              .locator("img")
              .evaluate((e: HTMLImageElement) => getComputedStyle(e).objectFit),
          ).toBe("cover");
          await expect(peek.locator("img")).toHaveAttribute(
            "src",
            new RegExp(`${adjacent[0]}-v1-`),
          );
          const imageBox = await peek.locator("img").boundingBox();
          const peekBox = await peek.boundingBox();
          expect(imageBox?.height).toBeCloseTo((peekBox?.height ?? 0) - 2, 0);
        }
      } else {
        expect(
          await frame.evaluate((e) => getComputedStyle(e).maskImage),
        ).toContain("linear-gradient");
      }
      expect(
        await frame
          .locator("img")
          .evaluate((e) => getComputedStyle(e).objectPosition),
      ).toBe(width <= 650 ? "50% 16%" : "50% 43%");
      const box = await frame.boundingBox();
      expect(box).not.toBeNull();
      const content = await panel.locator(".explorer-content").boundingBox();
      expect(box?.width).toBeCloseTo(content?.width ?? 0, 0);
      expect(box?.y).toBeCloseTo(content?.y ?? 0, 0);
      expect(box?.height).toBeGreaterThan(290);
      if (width !== 320)
        await page.locator(".explorer-stage").screenshot({
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
  const frame = page.getByRole("tabpanel").locator(".service-scene");
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
      .locator(".service-scene img")
      .evaluate((e) => getComputedStyle(e).transitionDuration),
  ).toBe("0s");
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

test("adjacent artwork survives a later shared stylesheet and keyboard navigation", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(origin);
  await page.addStyleTag({
    content:
      ".loading-image-frame img.loading-image-content { object-fit: contain; }",
  });
  const next = page.locator(".peek-next");
  await next.scrollIntoViewIfNeeded();
  await next.focus();
  await expect(next).toBeFocused();
  await next.press("Enter");
  await expect(page.getByRole("tab", { name: /Accounts/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await next.hover();
  await expect(next.locator(".peek-scene")).toHaveAttribute(
    "data-image-state",
    "ready",
  );
  expect(
    await next.locator("img").evaluate((e) => getComputedStyle(e).objectFit),
  ).toBe("cover");
  expect(
    await page
      .locator(".service-scene img")
      .evaluate((e) => getComputedStyle(e).objectFit),
  ).toBe("cover");
  await page.locator(".explorer-stage").screenshot({
    path: info.outputPath("peek-hover-focus-1440.png"),
    animations: "disabled",
  });
});
