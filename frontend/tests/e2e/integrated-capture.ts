import { writeFile } from "node:fs/promises";
import { expect, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Short-height and enlarged-text fixture evidence, not physical device/AT testing. */
export async function integratedCapture(
  page: Page,
  name: string,
  action: Locator,
) {
  const original = page.viewportSize();
  const font = await page
    .locator("html")
    .evaluate((element) => element.style.fontSize);
  try {
    await page.setViewportSize({ width: 320, height: 450 });
    for (const size of [100, 200]) {
      await page.locator("html").evaluate((element, value) => {
        element.style.fontSize = `${String(value)}%`;
      }, size);
      const activeSection = page.locator(
        ".record-sticky-context .record-sections [aria-current]",
      );
      if (await activeSection.count()) {
        await expect
          .poll(async () =>
            activeSection.evaluate((link) => {
              const nav = link.parentElement?.getBoundingClientRect();
              const rect = link.getBoundingClientRect();
              return (
                !!nav &&
                rect.left >= nav.left - 1 &&
                rect.right <= nav.right + 1
              );
            }),
          )
          .toBe(true);
      }
      await expect(action).toBeVisible();
      await action.evaluate((element) => {
        element.scrollIntoView({ block: "center" });
      });
      await action.focus();
      await expect(action).toBeFocused();
      await page.screenshot({
        path: `.cache/di15-${name}-short-text${String(size)}-attempt.png`,
      });
      const overflow = await page.evaluate(() => ({
        width: innerWidth,
        scroll: Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ),
        outside: Array.from(
          document.querySelectorAll("main *, .record-shell *"),
        )
          .filter((element) => {
            const r = element.getBoundingClientRect();
            return r.width > 0 && r.right > innerWidth + 1;
          })
          .slice(0, 15)
          .map((element) => ({
            tag: element.tagName,
            class: element.className,
            right: element.getBoundingClientRect().right,
            width: element.getBoundingClientRect().width,
          })),
      }));
      expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(
        overflow.width,
      );
      expect(
        await action.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          for (const horizontal of [0.1, 0.5, 0.9]) {
            for (const vertical of [0.1, 0.5, 0.9]) {
              const x = rect.left + rect.width * horizontal,
                y = rect.top + rect.height * vertical;
              const hit = document.elementFromPoint(x, y);
              if (!(
                x >= 0 &&
                x < innerWidth &&
                y >= 0 &&
                y < innerHeight &&
                hit !== null &&
                (element === hit || element.contains(hit))
              ))
                return false;
            }
          }
          return true;
        }),
      ).toBe(true);
      expect(
        await action.evaluate((element) => {
          const label =
            element instanceof HTMLInputElement && element.type === "checkbox"
              ? (element.closest("label") ?? element)
              : element;
          const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
          let text = walker.nextNode();
          while (text) {
            for (const match of (text.textContent ?? "").matchAll(
              /[A-Za-z]{4,}/g,
            )) {
              const range = document.createRange();
              range.setStart(text, match.index);
              range.setEnd(text, match.index + match[0].length);
              if (range.getClientRects().length > 1) return false;
            }
            text = walker.nextNode();
          }
          return true;
        }),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: `.cache/di15-${name}-short-text${String(size)}.png`,
      });
    }
  } finally {
    await page.locator("html").evaluate((element, value) => {
      element.style.fontSize = value;
    }, font);
    if (original) await page.setViewportSize(original);
  }
}

/** Local fixture latency, including browser automation; never a field percentile. */
export async function measuredInteraction(
  page: Page,
  name: string,
  work: () => Promise<void>,
) {
  const started = performance.now();
  await work();
  const elapsed = performance.now() - started;
  const documentMetrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as
      PerformanceNavigationTiming | undefined;
    const resources = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];
    return {
      documentLoadMs: nav?.loadEventEnd ?? null,
      responseMs: nav?.responseEnd ?? null,
      resourceCount: resources.length,
      transferredBytes: resources.reduce((sum, r) => sum + r.transferSize, 0),
      encodedBytes: resources.reduce((sum, r) => sum + r.encodedBodySize, 0),
    };
  });
  await writeFile(
    `.cache/di15-performance-${name}.json`,
    JSON.stringify(
      {
        name,
        interactionMs: elapsed,
        ...documentMetrics,
        note: "Local fixture, warm browser possible; zero transfer entries may be cached/unexposed. Includes automation/assertion overhead. Document metrics belong to the last document navigation, not necessarily this SPA section.",
      },
      null,
      2,
    ),
  );
}
