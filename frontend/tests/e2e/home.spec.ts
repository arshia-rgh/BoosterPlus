import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";
import { fixture } from "./identity-fixtures";

// Keep every viewport assertion and capture in its own original bounded test.
for (const [width, height] of [
  [320, 640],
  [360, 740],
  [390, 844],
  [768, 1024],
  [1280, 900],
  [1440, 900],
  [844, 390],
] as const) {
  test(`equal-game homepage reflows at ${String(width)} by ${String(height)}`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.setViewportSize({ width, height });
    await page.evaluate(() => {
      scrollTo(0, 0);
    });
    await expect(page.locator(".ascend-hero a")).toHaveCount(0);
    await expect(page.locator(".world-showcase, #rank-journey")).toHaveCount(0);
    const boxes = await page.locator(".hero-content").evaluate((element) => {
      const hero = element.closest(".ascend-hero")?.getBoundingClientRect();
      const text = element.getBoundingClientRect();
      if (!hero) throw new Error("Hero missing");
      return {
        top: text.top,
        bottom: text.bottom,
        heroTop: hero.top,
        heroBottom: hero.bottom,
      };
    });
    expect(boxes.top).toBeGreaterThanOrEqual(boxes.heroTop);
    expect(boxes.bottom).toBeLessThanOrEqual(boxes.heroBottom);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.locator(".ascend-hero").screenshot({
      path: `.cache/di04-home-hero-${info.project.name}-${String(width)}.png`,
    });
    await page.locator(".introduction-boost").screenshot({
      path: `.cache/di04-home-boost-${info.project.name}-${String(width)}.png`,
    });
  });
}

test("all homepage introductions reach the picker and enlarged text reflows", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const tabs = page
    .getByRole("tablist", { name: "Explore PLAYORA services" })
    .getByRole("tab");
  await expect(tabs).toHaveCount(5);
  for (let index = 0; index < 5; index++) {
    await tabs.nth(index).click();
    await expect(tabs.nth(index)).toHaveAttribute("aria-selected", "true");
    await page
      .getByRole("tabpanel")
      .getByRole("link", { name: "Choose your game" })
      .click();
    await expect(page.locator("#game-selection-title")).toBeFocused();
    await expect(page.locator("#game-selection-title")).toBeInViewport();
  }
  await expect(page.locator(".discovery-game-card.is-paused a")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page
    .locator(".ascend-hero")
    .screenshot({ path: `.cache/di04-home-${info.project.name}-text200.png` });
});

test("game discovery keeps the hero through services, account browsing, reload and history", async ({
  page,
}, info) => {
  const slug = fixture(info.project.name, "discovery_mlbb");
  await page.goto(`/games/${slug}`);
  const hero = page.getByRole("heading", { level: 1, name: "Mobile Legends" });
  await expect(
    page.getByRole("heading", { name: "Featured for your game" }),
  ).toBeVisible();
  const top = await page.locator(".public-metrics").boundingBox();
  const offer = await page.locator(".featured-offers").boundingBox();
  const chooser = await page.locator(".game-services").boundingBox();
  expect(top?.y).toBeLessThan(offer?.y ?? 0);
  expect(offer?.y).toBeLessThan(chooser?.y ?? 0);
  await hero.evaluate((element) => {
    element.dataset.identity = "preserved";
  });
  await page
    .locator(".game-service-card")
    .filter({ hasText: "Boosting" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Boosting for Mobile Legends" }),
  ).toBeFocused();
  await expect(hero).toHaveAttribute("data-identity", "preserved");
  await expect(
    page.getByRole("heading", { name: "Boosting highlights" }),
  ).toBeVisible();
  await expect(page.locator(".game-service-grid")).toHaveCount(0);
  await page.getByRole("link", { name: "← Back to choose a service" }).click();
  await page
    .locator(".game-service-card")
    .filter({ hasText: "Accounts" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Find your next account" }),
  ).toBeFocused();
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(hero).toHaveAttribute("data-identity", "preserved");
  await expect(page.locator(".featured-offers")).toHaveCount(0);
  await page
    .getByLabel("Search accounts", { exact: true })
    .fill("no matching fixture");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/search=no\+matching\+fixture/);
  await expect(
    page.getByRole("heading", { name: "Find your next account" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Find your next account" }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Find your next account" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "← Back to choose a service" }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

for (const game of ["mlbb", "wow", "lol", "valorant", "dota", "wildrift"]) {
  test(`game ${game} framing remains accessible across viewports`, async ({
    page,
  }, info) => {
    await page.goto(
      `/games/${fixture(info.project.name, `discovery_${game}`)}`,
    );
    for (const width of [1280, 768, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator(".game-stage-art")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await page.locator(".game-stage").screenshot({
        path: `.cache/di04-game-${game}-${info.project.name}-${String(width)}.png`,
      });
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}

test("device motion and FAQ keyboard controls remain usable without preference UI", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.getByRole("main")).toHaveAttribute("data-motion", "full");
  await expect(
    page.getByRole("button", { name: /background motion|device motion/i }),
  ).toHaveCount(0);
  await expect(
    page.getByText("How these statistics are measured", { exact: true }),
  ).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("main")).toHaveAttribute(
    "data-motion",
    "reduced",
  );
  await page.reload();
  await expect(page.getByRole("main")).toHaveAttribute(
    "data-motion",
    "reduced",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const question = page.locator(".home-faq summary").first();
  await question.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".home-faq details[open]")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(page.locator(".home-faq details[open]")).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: `.cache/di04-home-static-${info.project.name}.png`,
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.getByRole("main")).toHaveAttribute("data-motion", "full");
});

test("no-JS and failed artwork preserve readable content and native game anchors", async ({
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
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.locator(".home-faq summary").first().click();
    await expect(page.locator(".home-faq details[open]")).toHaveCount(1);
    await page.getByRole("link", { name: "Choose your game" }).first().click();
    await expect(page).toHaveURL(/#game-selection$/);
    await expect(page.locator("#game-selection-title")).toBeInViewport();
    await page
      .locator(
        `a[href="/games/${fixture(info.project.name, "discovery_mlbb")}"]`,
      )
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Mobile Legends" }),
    ).toBeVisible();
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
  await page.locator(".introduction-boost").scrollIntoViewIfNeeded();
  const frameIntervals = await page
    .locator(".introduction-boost")
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
  expect(characterBytes).toBe(0);
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

test("public evidence states and manual review carousel remain clear and keyboard operable", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let failed = true;
  await page.route("**/api/v1/site/metrics", (route) =>
    route.fulfill({
      status: failed ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        failed
          ? { code: "unavailable" }
          : {
              metrics: [
                {
                  key: "active",
                  label: "Active orders",
                  definition:
                    "Synthetic measured evidence for this isolated presentation check",
                  state: "insufficient_sample",
                  value: 3,
                  period_end: "2026-09-26T12:00:00Z",
                  refreshed_at: "2026-09-26T12:00:00Z",
                },
              ],
            },
      ),
    }),
  );
  await page.route("**/api/v1/public/reviews", (route) =>
    route.fulfill({
      status: failed ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        failed
          ? { code: "unavailable" }
          : {
              items: Array.from({ length: 8 }, (_, index) => ({
                slug: "synthetic",
                game: `Fixture game ${String(index + 1)}`,
                review: {
                  id: `review-${String(index)}`,
                  rating: index % 2 ? 1 : 5,
                  body: "Synthetic feedback used only to verify this carousel. The complete customer text remains accessible from its review page.",
                  feedback: [],
                  response: "",
                  policy_content: "Fixture policy",
                  purchase_status:
                    index === 0 ? "refund_recorded" : "verified_purchase",
                  published_at: "2026-09-26T12:00:00Z",
                  updated_at: "2026-09-26T12:00:00Z",
                },
              })),
            },
      ),
    }),
  );
  await page.goto("/");
  await expect(
    page.getByText("Reviews are temporarily unavailable."),
  ).toBeVisible();
  await expect(page.locator(".public-metric strong")).toHaveText([
    "—",
    "—",
    "—",
  ]);
  failed = false;
  await page.getByRole("button", { name: "Refresh activity" }).click();
  await expect(page.getByText("Not enough eligible records")).toBeVisible();
  await page.getByRole("button", { name: "Try reviews again" }).click();
  await expect(
    page.getByRole("button", { name: "Previous reviews" }),
  ).toBeDisabled();
  await expect(page.locator(".review-track li")).toHaveCount(8);
  await expect(
    page.getByText(/Purchase status changed after this feedback/),
  ).toBeVisible();
  await page
    .locator(".home-reviews")
    .screenshot({ path: `.cache/di04-reviews-${info.project.name}.png` });
  const next = page.getByRole("button", { name: "Next reviews" });
  for (let i = 0; i < 8; i++) {
    if (await next.isDisabled()) break;
    const before = await page
      .locator(".review-track")
      .evaluate((element) => element.scrollLeft);
    await next.click();
    await expect
      .poll(() =>
        page.locator(".review-track").evaluate((element) => element.scrollLeft),
      )
      .toBeGreaterThan(before);
    const atEnd = await page
      .locator(".review-track")
      .evaluate(
        (element) =>
          element.scrollLeft + element.clientWidth >= element.scrollWidth - 2,
      );
    if (atEnd) {
      await expect(next).toBeDisabled();
      break;
    }
  }
  await expect(next).toBeDisabled();
  const previous = page.getByRole("button", { name: "Previous reviews" });
  await previous.focus();
  await page.keyboard.press("Enter");
  await expect(next).toBeEnabled();
  await page.locator(".review-track").focus();
  await expect(page.locator(".review-track")).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
