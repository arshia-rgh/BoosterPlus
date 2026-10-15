// Run after serve.mjs. Captures the isolated preview only; never visits production.
import { chromium } from "../../../frontend/node_modules/@playwright/test/index.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const root = new URL("./", import.meta.url);
await mkdir(new URL("previews/", root), { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const palette of ["glacier", "iris", "champagne"]) {
    for (const name of ["home", "game", "customer", "admin"]) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
        reducedMotion: "reduce",
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(
        `http://127.0.0.1:4196/screen.html?page=${name}&palette=${palette}`,
        { waitUntil: "networkidle" },
      );
      await page.locator("h1").waitFor();
      if (name === "game") {
        await page.locator(".game-panel").scrollIntoViewIfNeeded();
        await page.evaluate(() => {
          const element = document.querySelector(".game-panel");
          scrollTo({ top: element.getBoundingClientRect().top + scrollY - 20 });
        });
      }
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          [...document.images]
            .filter((image) => image.getBoundingClientRect().top < innerHeight)
            .map((image) => image.decode().catch(() => {})),
        );
      });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      assert.equal(overflow, false);
      assert.deepEqual(errors, []);
      const requests = await page.evaluate(() => window.__previewRequests);
      assert.ok(requests.every((request) => request.method === "GET"));
      await page.screenshot({
        path: new URL(`previews/${palette}-${name}.jpg`, root).pathname,
        type: "jpeg",
        quality: 85,
        animations: "disabled",
      });
      results.push({ palette, page: name, overflow, errors, mutations: 0 });
      await page.close();
    }
  }
  await writeFile(
    new URL("previews/capture-results.json", root),
    JSON.stringify(results, null, 2) + "\n",
  );
  const comparison = await browser.newPage({
    viewport: { width: 1800, height: 1200 },
    deviceScaleFactor: 1,
  });
  await comparison.goto("http://127.0.0.1:4196/comparison.html", {
    waitUntil: "networkidle",
  });
  await comparison.screenshot({
    path: new URL("previews/comparison.jpg", root).pathname,
    type: "jpeg",
    quality: 90,
    fullPage: true,
  });
  console.log("12 preview captures passed; comparison sheet saved.");
} finally {
  await browser.close();
}
