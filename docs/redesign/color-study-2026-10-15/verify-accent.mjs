// Focused regression for the owner's additive-color requirement. Local fixture only.
import { chromium } from "../../../frontend/node_modules/@playwright/test/index.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true });
const root = new URL("./", import.meta.url);
const results = [];
const homeOnly = process.argv.includes("--home-only");
const pages = homeOnly
  ? ["home"]
  : ["home", "game", "boost", "customer", "admin", "booster", "states"];
await mkdir(new URL("previews/accent/", root), { recursive: true });
try {
  for (const width of [1440, 390]) {
    for (const name of pages) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(
        `http://127.0.0.1:4196/screen.html?page=${name}&palette=current`,
        { waitUntil: "networkidle" },
      );
      await page.locator("h1").waitFor();
      await page.evaluate(() => document.fonts.ready);
      const read = () =>
        page.evaluate(() => {
          const properties = [
            "backgroundColor",
            "backgroundImage",
            "fontFamily",
            "fontSize",
            "fontWeight",
            "lineHeight",
          ];
          const surfaces = [...document.querySelectorAll("*")].map((el) => {
            const style = getComputedStyle(el);
            return [
              el.tagName,
              ...properties.map((property) => style[property]),
            ];
          });
          const protectedColors = [
            ...document.querySelectorAll(
              ".button,.home-button,.status,.sample-state,.field-error,input[aria-invalid],h1,h2,h3,h4,h5,h6,h1 *,h2 *,h3 *,h4 *,h5 *,h6 *,.public-metric strong,.package-card-price",
            ),
          ].map((el) => {
            const style = getComputedStyle(el);
            return [
              el.className,
              style.color,
              style.backgroundColor,
              style.borderColor,
            ];
          });
          const scrims = [
            ...document.querySelectorAll(
              ".site-ambient,.game-stage,.hero-veil,.game-backdrop>div",
            ),
          ].map((el) => {
            const style = getComputedStyle(el, "::after");
            return [el.className, style.backgroundColor, style.backgroundImage];
          });
          return { surfaces, protectedColors, scrims };
        });
      const before = await read();
      if (
        width === 1440 &&
        ["home", "game", "customer", "admin"].includes(name)
      ) {
        await page.screenshot({
          path: new URL(`previews/accent/current-${name}.jpg`, root).pathname,
          type: "jpeg",
          quality: 85,
          animations: "disabled",
        });
      }
      await page.evaluate(() => {
        document.documentElement.dataset.palette = "green-champagne";
      });
      const after = await read();
      assert.deepEqual(
        after,
        before,
        `${name}/${width}: original surfaces, typography, buttons or semantic colors changed`,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
      );
      assert.deepEqual(errors, []);
      const changes = await page.evaluate(
        () =>
          [...document.querySelectorAll("*")].filter(
            (el) => getComputedStyle(el).color === "rgb(231, 199, 138)",
          ).length,
      );
      assert.ok(changes > 0, `${name}: no champagne detail`);
      assert.ok(
        await page.evaluate(() =>
          window.__previewRequests.every((request) => request.method === "GET"),
        ),
      );
      if (
        width === 1440 &&
        ["home", "game", "customer", "admin"].includes(name)
      ) {
        await page.screenshot({
          path: new URL(`previews/accent/green-champagne-${name}.jpg`, root)
            .pathname,
          type: "jpeg",
          quality: 85,
          animations: "disabled",
        });
      }
      results.push({
        page: name,
        width,
        originalSurfacesAndTypography: true,
        primaryActionsAndSemanticsUnchanged: true,
        headingsAndPricesUnchanged: true,
        errors,
        overflow: false,
        champagneElements: changes,
      });
      await page.close();
    }
  }
  await writeFile(
    new URL(
      homeOnly
        ? "previews/accent/headline-results.json"
        : "previews/accent/results.json",
      root,
    ),
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(
    `${results.length} original-theme preservation checks passed; comparison captures saved.`,
  );
} finally {
  await browser.close();
}
