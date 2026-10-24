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
      new URL("../fixtures/immersive-cards", import.meta.url),
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
  const a = server.httpServer?.address();
  if (!a || typeof a === "string") throw new Error("No review address");
  origin = `http://127.0.0.1:${String(a.port)}`;
});
test.afterAll(async () => {
  await server.close();
});
for (const width of [320, 390, 820, 1440])
  for (const section of ["", "shop", "boost", "accounts", "news"]) {
    test(`${section || "services"} full-image cards and aligned game rail at ${String(width)}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${origin}/games/mobile-legends/${section}`);
      const cards = page.locator(
        section ? ".immersive-card" : ".game-service-card",
      );
      await expect(cards.first()).toBeVisible();
      await cards.last().scrollIntoViewIfNeeded();
      await expect(page.locator(".game-stage h1")).toHaveText(/Mobile Legends/);
      const rail = await page.locator(".game-local-content").boundingBox();
      const hero = await page.locator(".game-stage-copy").boundingBox();
      const faq = await page.locator(".game-faq").boundingBox();
      expect(rail).not.toBeNull();
      expect(hero?.x).toBeCloseTo(rail?.x ?? 0, 0);
      for (const r of [faq]) {
        expect(r?.x).toBeCloseTo(rail?.x ?? 0, 0);
        expect(r?.width).toBeCloseTo(rail?.width ?? 0, 0);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const card of await cards.all()) {
        if (section === "boost") {
          expect(
            await card.evaluate((e) => getComputedStyle(e).paddingLeft),
          ).toBe("0px");
          await expect(card.getByRole("link")).toHaveText(/View package/);
        }
        const bounds = await card.evaluate((e) => {
          const outer = e.getBoundingClientRect();
          return [
            ...e.querySelectorAll("h3, .immersive-copy, .game-service-copy"),
          ].every((child) => {
            const inner = child.getBoundingClientRect();
            return (
              inner.left >= outer.left &&
              inner.right <= outer.right + 1 &&
              inner.bottom <= outer.bottom + 1
            );
          });
        });
        expect(bounds).toBe(true);
        expect(
          await card.evaluate(
            (e) =>
              e.scrollWidth <= e.clientWidth + 2 &&
              e.scrollHeight <= e.clientHeight + 2,
          ),
        ).toBe(true);
      }
      await cards.first().scrollIntoViewIfNeeded();
      await page.locator(".game-local-content").screenshot({
        path: info.outputPath(`${section || "services"}-${String(width)}.png`),
        animations: "disabled",
      });
      if (width === 390 || width === 1440)
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
      const separators = await page
        .locator(".game-local-content,.game-faq")
        .evaluateAll((es) =>
          es.map((e) => ({
            left: getComputedStyle(e, "::before").left,
            right: getComputedStyle(e, "::before").right,
          })),
        );
      expect(separators[0]).toEqual(separators[1]);
    });
  }
test("keyboard card navigation preserves the game shell and reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${origin}/games/mobile-legends/shop`);
  const heading = page.locator(".game-stage h1");
  await heading.evaluate((e) => {
    e.setAttribute("data-original", "yes");
  });
  const link = page.getByRole("link", {
    name: "View details for 86 Diamonds · Global",
  });
  await link.focus();
  await expect(link).toBeFocused();
  await link.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Product details" }),
  ).toBeVisible();
  await expect(heading).toHaveAttribute("data-original", "yes");
});
test("missing artwork, long copy and 200 percent text preserve readable cards", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.route(/\/(catalog-assets|artwork)\//, (r) =>
    r.request().resourceType() === "image" ? r.abort() : r.continue(),
  );
  await page.goto(`${origin}/games/mobile-legends/shop`);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  const card = page.locator(".immersive-card").last();
  await card.scrollIntoViewIfNeeded();
  await expect(card.getByRole("heading")).toBeVisible();
  await expect(
    card.getByText("Ordering temporarily unavailable"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(await card.evaluate((e) => e.scrollHeight <= e.clientHeight + 2)).toBe(
    true,
  );
  await card.screenshot({
    path: info.outputPath("failure-zoom.png"),
    animations: "disabled",
  });
});

for (const width of [390, 1440])
  test(`complete game rail and paused service at ${String(width)}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${origin}/games/mobile-legends?review-states=1`);
    const paused = page.locator(".game-service-card.is-paused");
    await expect(paused).toContainText("Ordering temporarily unavailable");
    await expect(paused).not.toHaveAttribute("href");
    await page.locator(".game-faq").scrollIntoViewIfNeeded();
    await page.locator(".game-stage").scrollIntoViewIfNeeded();
    await page.locator(".game-shell").screenshot({
      path: info.outputPath(`whole-game-${String(width)}.png`),
      animations: "disabled",
    });
    await page.goto(`${origin}/games/mobile-legends/boost?review-states=1`);
    const card = page.locator(".immersive-card").first();
    await expect(card.getByText("USD 25.00 – 35.00")).toBeVisible();
    await expect(card.getByText("EUR 22.00")).toBeVisible();
    await card.screenshot({
      path: info.outputPath(`multi-price-${String(width)}.png`),
      animations: "disabled",
    });
  });

for (const width of [320, 390, 820, 1440, 1920])
  test(`hero artwork bleeds right while copy stays aligned at ${String(width)}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${origin}/games/mobile-legends`);
    const hero = page.locator(".game-stage"),
      art = hero.locator(".game-stage-art"),
      copy = page.locator(".game-stage-copy"),
      rail = page.locator(".game-local-content");
    await expect(art).not.toHaveAttribute("data-image-loading", "true");
    const rb = await rail.boundingBox(),
      cb = await copy.boundingBox(),
      ab = await art.boundingBox();
    expect(cb?.x).toBeCloseTo(rb?.x ?? 0, 0);
    expect(ab?.x).toBeCloseTo(rb?.x ?? 0, 0);
    const edge = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect((ab?.x ?? 0) + (ab?.width ?? 0)).toBeCloseTo(edge, 0);
    expect(ab?.width).toBeGreaterThan(rb?.width ?? 0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await hero.screenshot({
      path: info.outputPath(`hero-${String(width)}.png`),
      animations: "disabled",
    });
    if (width > 700) {
      await page.locator(".game-shell").evaluate((e) => {
        e.setAttribute("data-copy-side", "right");
      });
      const right = await copy.boundingBox();
      expect((right?.x ?? 0) + (right?.width ?? 0)).toBeCloseTo(
        (rb?.x ?? 0) + (rb?.width ?? 0),
        0,
      );
      await hero.screenshot({
        path: info.outputPath(`hero-right-copy-${String(width)}.png`),
        animations: "disabled",
      });
    }
  });
