import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function fitsViewport(page: Page) {
  const problems = await page.evaluate(() => {
    const issues: string[] = [];
    if (document.documentElement.scrollWidth > innerWidth + 1)
      issues.push("Page overflows viewport");
    for (const element of document.querySelectorAll(
      ".site-header a, main input, main select, main textarea, main button, main h1",
    )) {
      // Firefox can retain geometry for descendants of closed details; only
      // rendered controls participate. Open disclosures are checked below too.
      if (!element.checkVisibility({ visibilityProperty: true })) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width && (rect.left < -1 || rect.right > innerWidth + 1))
        issues.push(
          element.tagName +
            ": " +
            (element.getAttribute("aria-label") ??
              element.textContent.slice(0, 60)),
        );
    }
    const links = [...document.querySelectorAll(".site-header a")]
      .map((e) => e.getBoundingClientRect())
      .filter((r) => r.width);
    for (const [index, a] of links.entries())
      for (const b of links.slice(index + 1)) {
        if (
          Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
        )
          issues.push("Header links overlap");
      }
    return issues;
  });
  expect(problems).toEqual([]);
}

test("shared layouts reflow with long labels, narrow screens and enlarged text", async ({
  page,
}, info) => {
  for (const route of ["/account", "/admin", "/booster"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("textbox", {
        name: route === "/account" ? "Email address" : "Work email address",
        exact: true,
      }),
    ).toBeVisible();
    const termsLinks = page.getByRole("link", {
      name: "account terms",
      exact: true,
    });
    // This real-API fixture intentionally has no Google provider. Its single
    // offered sign-in method must retain a visible, keyboard-accessible consent.
    await expect(
      page.getByText(
        "Google sign-in is currently unavailable. Continue with email.",
      ),
    ).toBeVisible();
    await expect(termsLinks).toHaveCount(1);
    for (const link of await termsLinks.all()) {
      // Inline consent links must be recognizable without hover or color.
      await expect(link).toHaveCSS("text-decoration-line", "underline");
      await link.focus();
      await expect(link).toBeFocused();
      await expect(link).toHaveCSS("text-decoration-line", "underline");
    }
    for (const width of [320, 360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await fitsViewport(page);
      if (width < 581)
        await expect(
          page.locator(".site-header .desktop-nav-link"),
        ).toBeHidden();
    }
    await page.setViewportSize({ width: 320, height: 900 });
    await page.getByText("Lost access to your email?", { exact: true }).click();
    await expect(
      page.getByRole("button", {
        name: "Send recovery verification code",
        exact: true,
      }),
    ).toBeVisible();
    await fitsViewport(page);
    await page.getByText("Lost access to your email?", { exact: true }).click();
    // Synthetic copy stress only: no auth/session or business state is replaced.
    await page.locator("main h1").evaluate((e) => {
      e.textContent =
        "Account and communication preferences " + "LongReference".repeat(8);
    });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await fitsViewport(page);
    await page.evaluate(() => {
      document.documentElement.style.removeProperty("font-size");
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `.cache/ux01-${route.slice(1)}-${info.project.name}-320.png`,
      fullPage: true,
    });
  }
});

test("public browsing reflows through width and landscape changes", async ({
  page,
}) => {
  for (const route of ["/", "/games", "/accounts", "/login"]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    for (const width of [320, 360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await fitsViewport(page);
    }
    await page.setViewportSize({ width: 844, height: 390 });
    await fitsViewport(page);
    await page.setViewportSize({ width: 320, height: 900 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await fitsViewport(page);
    await page.evaluate(() => {
      document.documentElement.style.removeProperty("font-size");
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});
