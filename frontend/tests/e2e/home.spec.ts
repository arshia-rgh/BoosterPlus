import { qualifyCharacters } from "./character-journey";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";

test("hero and showcase reflow without overlapping actions", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const [width, height] of [
    [320, 640],
    [360, 740],
    [390, 844],
    [768, 1024],
    [1024, 768],
    [1440, 900],
    [844, 390],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => {
      scrollTo(0, 0);
    });
    const hero = page.locator(".ascend-hero");
    await expect(hero.locator(".character-art")).toHaveCount(0);
    const geometry = await hero.evaluate((element) => {
      const content = element.querySelector(".hero-content");
      const bottom = element
        .querySelector(".hero-bottom")
        ?.getBoundingClientRect();
      if (!content || !bottom) throw new Error("Missing hero regions");
      return {
        contentBottom:
          content.getBoundingClientRect().bottom -
          parseFloat(getComputedStyle(content).paddingBottom),
        footerTop: bottom.top,
        bottom: element.getBoundingClientRect().bottom,
      };
    });
    expect(geometry.contentBottom).toBeLessThanOrEqual(geometry.footerTop);
    expect(geometry.footerTop).toBeLessThan(geometry.bottom);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await hero.screenshot({
      path: `.cache/hf02-hero-${info.project.name}-${String(width)}.png`,
    });
    const showcase = page.locator(".world-showcase");
    await showcase.scrollIntoViewIfNeeded();
    await expect(
      showcase.getByRole("link", { name: "Browse available games" }),
    ).toBeVisible();
    await showcase.screenshot({
      path: `.cache/hf02-showcase-${info.project.name}-${String(width)}.png`,
    });
  }
  // Text-only enlargement must expand the hero instead of clipping governed copy.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(
    page.getByRole("link", { name: "Explore games", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page
    .locator(".ascend-hero")
    .screenshot({ path: `.cache/hf02-hero-${info.project.name}-text200.png` });
});

async function seek(page: Page, progress: number) {
  await page.locator("#rank-journey").evaluate((scene, value) => {
    const rect = scene.getBoundingClientRect();
    window.scrollTo(
      0,
      rect.top + window.scrollY + (rect.height - window.innerHeight) * value,
    );
  }, progress);
  await expect(page.locator("#rank-journey")).toHaveAttribute(
    "data-progress",
    String(Math.round(progress * 100)),
  );
}
async function opacity(page: Page, selector: string) {
  return page
    .locator(selector)
    .evaluate((element) => Number(getComputedStyle(element).opacity));
}

test("rank journey scrubs smoothly forward/backward and survives resize and navigation", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator("#rank-journey")).toHaveAttribute(
    "data-enhanced",
    "true",
  );
  await expect(page.locator(".hero-content")).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 0, 0)",
  );
  await expect(page.locator(".ascend-hero .character-art")).toHaveCount(0);
  await expect(page.locator(".hero-art img")).toBeVisible();
  await page.screenshot({
    path: `.cache/home-${info.project.name}.png`,
    fullPage: false,
  });
  for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
    await seek(page, progress);
    await expect(
      page.getByRole("heading", { name: "Same player. Different league." }),
    ).toBeInViewport();
    await page.screenshot({
      path: `.cache/rank-${info.project.name}-${String(progress * 100)}.png`,
    });
  }
  expect(await opacity(page, ".rank-finish")).toBe(1);
  expect(await opacity(page, ".rank-start")).toBe(0);
  if (info.project.name === "mobile")
    await page.evaluate(() => {
      scrollBy(0, -275);
    });
  else await page.mouse.wheel(0, -275);
  await expect
    .poll(async () =>
      Number(await page.locator("#rank-journey").getAttribute("data-progress")),
    )
    .toBeLessThan(100);
  await seek(page, 0.5);
  expect(await opacity(page, ".rank-finish")).toBeGreaterThan(0);
  expect(await opacity(page, ".rank-finish")).toBeLessThan(1);
  await seek(page, 0.25);
  expect(await opacity(page, ".rank-start")).toBe(1);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("A viewport is required");
  await page.setViewportSize({ width: viewport.height, height: 500 });
  await expect(page.locator(".journey-sticky")).toHaveCSS(
    "position",
    "relative",
  );
  expect(await opacity(page, ".rank-finish")).toBe(1);
  await page.setViewportSize(viewport);
  await seek(page, 0.75);
  await page.getByRole("link", { name: /find your boost/i }).click();
  await expect(page).toHaveURL(/\/games$/);
  await page.goBack();
  await expect(page.locator("#rank-journey")).toHaveAttribute(
    "data-enhanced",
    "true",
  );
  await seek(page, 0.25);
  expect(await opacity(page, ".rank-start")).toBe(1);
  await page.goto("/#rank-journey");
  await expect(
    page.getByRole("heading", { name: "Same player. Different league." }),
  ).toBeInViewport();
  await qualifyCharacters(page, info.project.name);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("motion preference persists, OS changes are respected and FAQs work with keyboard", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.getByRole("button", { name: "Reduced", exact: true }).click();
  await expect(page.locator("#rank-journey")).not.toHaveAttribute(
    "data-enhanced",
  );
  await expect(page.locator(".journey-sticky")).toHaveCSS("position", "static");
  expect(await opacity(page, ".rank-start")).toBe(1);
  expect(await opacity(page, ".rank-finish")).toBe(1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Reduced", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "System", exact: true }).click();
  await expect(page.getByRole("main")).toHaveAttribute(
    "data-motion",
    "reduced",
  );
  await expect(page.locator("#rank-journey")).not.toHaveAttribute(
    "data-enhanced",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const question = page
    .locator("summary")
    .filter({ hasText: "How does custom boosting work?" });
  await question.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("details[open]")).toContainText("final quote");
  await page.keyboard.press("Enter");
  await expect(page.locator("details[open]")).toHaveCount(0);
  await expect(page.locator(".hero-content")).toHaveCSS("transform", "none");
  await page.screenshot({
    path: `.cache/home-static-${info.project.name}.png`,
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("#rank-journey")).toHaveAttribute(
    "data-enhanced",
    "true",
  );
});

test("no-JS and failed artwork retain readable content, navigation and static rank cards", async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: info.project.use.viewport ?? { width: 1280, height: 720 },
  });
  try {
    const page = await context.newPage();
    await page.route("**/artwork/**", (route) => route.abort());
    await page.goto("http://127.0.0.1:4173/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "YOUR NEXT",
    );
    await expect(page.locator("#rank-journey")).not.toHaveAttribute(
      "data-enhanced",
    );
    await expect(page.locator(".rank-start")).toBeVisible();
    await expect(page.locator(".rank-finish")).toBeVisible();
    await page
      .locator("summary")
      .filter({ hasText: "What is different about fixed packages?" })
      .click();
    await expect(page.locator("details[open]")).toContainText(
      "Payment is required before fulfillment.",
    );
    await page.getByRole("link", { name: /explore games/i }).click();
    await expect(page).toHaveURL(/\/games$/);
  } finally {
    await context.close();
  }
});

test("homepage respects transfer and layout-shift budgets under production CSP", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const supported = PerformanceObserver.supportedEntryTypes;
    const result = {
      cls: supported.includes("layout-shift") ? 0 : null,
      lcp: supported.includes("largest-contentful-paint") ? 0 : null,
      violations: [] as string[],
    };
    Object.defineProperty(window, "homeLabMetrics", { value: result });
    if (result.cls !== null)
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            hadRecentInput: boolean;
            value: number;
          };
          if (!shift.hadRecentInput && result.cls !== null)
            result.cls += shift.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    if (result.lcp !== null)
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) result.lcp = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    document.addEventListener("securitypolicyviolation", (event) => {
      result.violations.push(event.violatedDirective);
    });
  });
  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toContain(
    "style-src 'self'",
  );
  await expect(page.locator(".hero-content")).toHaveCSS("opacity", "1");
  await expect
    .poll(() =>
      page
        .locator(".hero-art img")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(page.locator("#rank-journey")).toHaveAttribute(
    "data-enhanced",
    "true",
  );
  await seek(page, 0.5);
  await seek(page, 1);
  const frameIntervals = await page
    .locator("#rank-journey")
    .evaluate(async (scene) => {
      const rect = scene.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const travel = rect.height - window.innerHeight;
      return new Promise<number[]>((resolve) => {
        const samples: number[] = [];
        let previous = 0;
        let frame = 0;
        const tick = (now: number) => {
          if (previous) samples.push(now - previous);
          previous = now;
          window.scrollTo(0, top + travel * (0.25 + frame / 40));
          frame += 1;
          if (frame < 25) requestAnimationFrame(tick);
          else resolve(samples);
        };
        requestAnimationFrame(tick);
      });
    });
  const report = await page.evaluate(() => {
    const metrics = (
      window as unknown as Window & {
        homeLabMetrics: {
          cls: number | null;
          lcp: number | null;
          violations: string[];
        };
      }
    ).homeLabMetrics;
    const resources = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];
    return {
      ...metrics,
      viewport: [innerWidth, innerHeight],
      bytes: resources.reduce((sum, item) => sum + item.encodedBodySize, 0),
      remoteResources: resources.filter(
        (item) => new URL(item.name).origin !== location.origin,
      ).length,
      image: resources
        .filter((item) => item.name.includes("/artwork/"))
        .map((item) => ({
          path: new URL(item.name).pathname,
          bytes: item.encodedBodySize,
        })),
    };
  });
  if (info.project.use.browserName === "chromium")
    expect(report.cls).not.toBeNull();
  if (report.cls !== null) expect(report.cls).toBeLessThanOrEqual(0.1);
  expect(report.bytes).toBeLessThan(1024 * 1024);
  expect(report.remoteResources).toBe(0);
  expect(report.violations).toEqual([]);
  expect(report.image).toHaveLength(1);
  const characterBytes = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((item) => item.name.includes("/characters/"))
      .reduce(
        (sum, item) =>
          sum + (item as PerformanceResourceTiming).encodedBodySize,
        0,
      ),
  );
  expect(characterBytes).toBeGreaterThan(0);
  expect(characterBytes).toBeLessThan(200_000);
  const evidence = JSON.stringify(
    {
      profile: `Local production SSR, unthrottled ${info.project.use.browserName ?? "chromium"}; unsupported performance metrics are null, not field Web Vitals`,
      ...report,
      frameIntervals,
    },
    null,
    2,
  );
  await writeFile(`.cache/home-lab-${info.project.name}.json`, evidence);
  await info.attach(`homepage-lab-${info.project.name}`, {
    body: evidence,
    contentType: "application/json",
  });
});
