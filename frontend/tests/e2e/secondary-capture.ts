import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
export async function secondaryCapture(
  page: Page,
  name: string,
  device: string,
) {
  const original = page.viewportSize();
  for (const width of device === "desktop" ? [1440, 768] : [393, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () =>
          Math.max(
            document.body.scrollWidth,
            document.documentElement.scrollWidth,
          ) <= innerWidth,
      ),
    ).toBe(true);
    const png = await page.screenshot({
      path: `.cache/di13-${name}-${String(width)}.png`,
      fullPage: true,
    });
    expect(png.readUInt32BE(16)).toBeLessThanOrEqual(
      Math.ceil(await page.evaluate(() => innerWidth * devicePixelRatio)) + 1,
    );
  }
  if (original) await page.setViewportSize(original);
}
