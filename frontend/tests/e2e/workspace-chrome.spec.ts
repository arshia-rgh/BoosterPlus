import { expect, test } from "@playwright/test";

test("workspace shortcuts remain readable with enlarged text and restore drawer focus", async ({
  page,
}) => {
  // Synthetic, read-only layout fixtures. Real identity/permission journeys run separately.
  for (const role of ["customer", "booster"] as const) {
    await page.route("**/api/v1/**", async (route) => {
      const session = {
        user: {
          id: "chrome-fixture",
          email: "chrome@example.test",
          display_name: "Layout reviewer",
          role,
          staff_alias: "Reviewer",
          suspended: false,
          mfa_enabled: role === "booster",
          notify_updates: true,
        },
        csrf_token: "fixture".repeat(10),
        google_enabled: false,
        google_linked: false,
        mfa_required: false,
        capabilities: role === "booster" ? ["account", "booster"] : ["account"],
        terms_version: "fixture",
        terms_url: "/terms",
      };
      await route.fulfill({
        json: new URL(route.request().url()).pathname.endsWith("/auth/session")
          ? session
          : { items: [], orders: [], next: "", next_before: 0, limit: 20 },
      });
    });
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(role === "booster" ? "/booster/orders" : "/orders");
    const navigation = page.getByRole("navigation", {
      name: role === "booster" ? "Booster shortcuts" : "Account shortcuts",
    });
    await expect(navigation).toBeVisible();
    await expect(page.locator(".page-heading .eyebrow")).toHaveText(
      role === "booster" ? "Booster workspace" : "My account",
    );
    expect(
      await page
        .locator(".experience")
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toBe("rgba(0, 0, 0, 0)");
    const ambient = page.locator(".site-ambient");
    expect(
      await ambient.evaluate(
        (el) => getComputedStyle(el, "::before").backgroundImage,
      ),
    ).toContain("ascension-768.jpg");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect
      .poll(() =>
        ambient.evaluate(
          (el) => getComputedStyle(el, "::before").animationName,
        ),
      )
      .toBe("ambient-drift");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect
      .poll(() =>
        ambient.evaluate(
          (el) => getComputedStyle(el, "::before").animationName,
        ),
      )
      .toBe("none");
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    // Measure the longest word as well as the page: overflow checks alone miss
    // labels broken into letter stacks inside artificially narrow grid columns.
    const problems = await navigation
      .locator("a,button")
      .evaluateAll((items) => {
        return items
          .filter((item) => {
            const style = getComputedStyle(item);
            const measure = document.createElement("span");
            measure.style.font = style.font;
            measure.style.whiteSpace = "nowrap";
            measure.textContent =
              item.textContent
                .split(/\s+/)
                .sort((a, b) => b.length - a.length)[0] ?? "";
            document.body.append(measure);
            const width = measure.getBoundingClientRect().width;
            measure.remove();
            return width > item.clientWidth;
          })
          .map((item) => item.textContent);
      });
    expect(problems).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
    const more = navigation.getByRole("button", { name: "More", exact: true });
    await more.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(more).toBeFocused();
    await page.unroute("**/api/v1/**");
  }
});
