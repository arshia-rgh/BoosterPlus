import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";

test.use({ video: { mode: "on", size: { width: 1280, height: 720 } } });
test("qualifies Miya stationary motion, pause, lazy media and graceful failures", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const loaded: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/characters/miya")) loaded.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator("#rank-journey")).toHaveAttribute(
    "data-enhanced",
    "true",
  );
  expect(loaded).toEqual([]);
  const stage = page.locator(".world-stage");
  const scene = page.locator(".world-showcase");
  await stage.scrollIntoViewIfNeeded();
  const art = stage.locator(".miya-art"),
    svg = art.locator("svg");
  await expect(art).toHaveAttribute("data-active", "true");
  await expect(svg.locator("animate")).toHaveCount(2);
  expect(loaded.some((url) => url.endsWith("miya-768.jpg"))).toBe(true);
  await page.screenshot({
    path: `.cache/hf03-${info.project.name}-normal.png`,
  });
  // A real 20-second stationary capture measures the same visible scene for two
  // complete breath cycles. Animation-clock values alone do not prove visual quality.
  const measurement = await svg.evaluate(async (element) => {
    const field = element.querySelector("feDisplacementMap");
    if (!field) throw new Error("Missing continuous field");
    const started = performance.now(),
      samples: number[] = [],
      scale: number[] = [];
    let previous = started;
    await new Promise<void>((resolve) => {
      const frame = () => {
        const now = performance.now();
        samples.push(now - previous);
        previous = now;
        scale.push(field.scale.animVal);
        if (now - started < 20000) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
    samples.sort((a, b) => a - b);
    return {
      duration: performance.now() - started,
      frames: samples.length,
      p95: samples[Math.floor(samples.length * 0.95)],
      min: Math.min(...scale),
      max: Math.max(...scale),
      viewport: [innerWidth, innerHeight],
      media: performance
        .getEntriesByType("resource")
        .filter((item) => item.name.includes("/characters/miya"))
        .map((item) => ({
          name: new URL(item.name).pathname,
          bytes: (item as PerformanceResourceTiming).encodedBodySize,
        })),
    };
  });
  expect(measurement.duration).toBeGreaterThanOrEqual(20000);
  expect(
    measurement.media.reduce((sum, item) => sum + item.bytes, 0),
  ).toBeLessThanOrEqual(210000);
  // Record a native down/up scroll pass while the internal loop keeps running.
  await stage.evaluate(async () => {
    const top = scrollY,
      started = performance.now();
    await new Promise<void>((resolve) => {
      const frame = () => {
        const t = Math.min(1, (performance.now() - started) / 3000);
        scrollTo(0, top + Math.sin(t * Math.PI) * 120);
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  });
  const initial = await svg.evaluate((element) => {
    if (!(element instanceof SVGSVGElement)) throw new Error("Missing SVG rig");
    element.pauseAnimations();
    return element.getCurrentTime();
  });
  await art.screenshot({ path: `.cache/hf03-${info.project.name}-pose-a.png` });
  await svg.evaluate((element, time) => {
    if (!(element instanceof SVGSVGElement)) throw new Error("Missing SVG rig");
    element.setCurrentTime(time + 3.6);
  }, initial);
  await art.screenshot({ path: `.cache/hf03-${info.project.name}-pose-b.png` });
  await svg.evaluate((element) => {
    if (!(element instanceof SVGSVGElement)) throw new Error("Missing SVG rig");
    element.unpauseAnimations();
  });
  expect(measurement.min).toBeLessThan(0.5);
  expect(measurement.max).toBeGreaterThan(11.5);
  await writeFile(
    `.cache/hf03-${info.project.name}-performance.json`,
    JSON.stringify(measurement, null, 2),
  );
  const height = await stage.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  await scene
    .getByRole("button", { name: "Pause motion", exact: true })
    .click();
  await expect(art.locator("animate")).toHaveCount(0);
  await expect(art.locator("image")).not.toHaveAttribute("filter");
  await page.screenshot({
    path: `.cache/hf03-${info.project.name}-static.png`,
  });
  await scene
    .getByRole("button", { name: "World of Warcraft", exact: true })
    .click();
  await expect(stage.locator(".character-art")).toHaveAttribute(
    "data-motion",
    "reduced",
  );
  await scene
    .getByRole("button", { name: "Mobile Legends", exact: true })
    .click();
  await expect(art).toHaveAttribute("data-motion", "reduced");
  expect(
    await stage.evaluate((element) => element.getBoundingClientRect().height),
  ).toBe(height);
  const resume = scene.getByRole("button", {
    name: "Resume motion",
    exact: true,
  });
  const anchorTop = await resume.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  await resume.click();
  await expect
    .poll(async () =>
      Math.abs(
        (await scene
          .getByRole("button", { name: "Pause motion", exact: true })
          .evaluate((element) => element.getBoundingClientRect().top)) -
          anchorTop,
      ),
    )
    // Integer scroll coordinates can land exactly half a CSS pixel away.
    .toBeLessThanOrEqual(0.5);
  await expect(art).toHaveAttribute("data-active", "true");
  await page.locator("#hero-title").scrollIntoViewIfNeeded();
  await expect(art).toHaveAttribute("data-active", "false");
  expect(
    await svg.evaluate((element) => {
      if (!(element instanceof SVGSVGElement))
        throw new Error("Missing SVG rig");
      return element.animationsPaused();
    }),
  ).toBe(true);
  await stage.scrollIntoViewIfNeeded();
  await expect(art).toHaveAttribute("data-active", "true");
  expect(
    await svg.evaluate((element) => {
      if (!(element instanceof SVGSVGElement))
        throw new Error("Missing SVG rig");
      return element.animationsPaused();
    }),
  ).toBe(false);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(art.locator("animate")).toHaveCount(0);
  await expect(
    scene.getByRole("button", { name: "System motion reduced" }),
  ).toBeDisabled();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.route("**/characters/miya-*-field.svg", (route) => route.abort());
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await stage.scrollIntoViewIfNeeded();
  await expect(art.locator("image")).not.toHaveAttribute("filter");
  await expect(art.locator("animate")).toHaveCount(0);
  await expect(
    scene.getByRole("link", { name: /Browse available games/ }),
  ).toBeVisible();
  await page.route("**/characters/miya-768.jpg", (route) => route.abort());
  await page.reload();
  await stage.scrollIntoViewIfNeeded();
  await expect(stage.locator(".character-fallback")).toBeVisible();
  await expect(
    scene.getByRole("link", { name: /Browse available games/ }),
  ).toBeVisible();
});
