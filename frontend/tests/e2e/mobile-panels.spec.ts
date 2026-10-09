import { expect, test, type Page } from "@playwright/test";

// Read-only layout fixtures; real authentication/orders run in their own journeys.
async function panelSession(
  page: Page,
  portal: "customer" | "booster" | "admin",
) {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/me/overview") {
      await route.fulfill({
        json: {
          attention: [],
          active: [],
          upcoming: [],
          messages: [],
          more_messages: false,
          more_attention: false,
          more_active: false,
          more_upcoming: false,
        },
      });
      return;
    }
    await route.fulfill({
      json: path.endsWith("/session")
        ? {
            user: {
              id: "mobile-fixture",
              email: "mobile@example.test",
              display_name: "Mobile reviewer",
              portal,
              role: portal === "admin" ? "owner" : portal,
              staff_alias: "Reviewer",
              suspended: false,
              mfa_enabled: portal !== "customer",
              notify_updates: true,
            },
            portal,
            csrf_token: "fixture".repeat(10),
            google_enabled: false,
            google_linked: false,
            mfa_required: false,
            capabilities: ["self", portal === "customer" ? "account" : portal],
            terms_version: "fixture",
            terms_url: "/terms",
          }
        : { items: [], orders: [], next: "", next_before: 0, limit: 20 },
    });
  });
}
async function reflows(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
  const inputs = page.locator(
    "main input:not([type=checkbox]):not([type=radio]), main select, main textarea",
  );
  for (const input of await inputs.all()) {
    if (await input.isVisible())
      expect(
        await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      ).toBeGreaterThanOrEqual(16);
  }
}
for (const portal of ["customer", "booster", "admin"] as const) {
  test(`${portal} mobile queue keeps filters compact, navigation usable and text readable`, async ({
    page,
  }) => {
    await panelSession(page, portal);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(portal === "customer" ? "/orders" : `/${portal}/orders`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const filters = page.locator(
      portal === "admin" ? ".order-filters" : ".orders-filters",
    );
    await expect(filters).toBeVisible();
    expect((await filters.boundingBox())?.height).toBeLessThan(390);
    if (portal === "admin") {
      const more = page.locator(".order-advanced-filters");
      await expect(more).not.toHaveAttribute("open", "");
      await more.getByText("More filters", { exact: true }).click();
      await page
        .getByLabel("Game slug", { exact: true })
        .fill("mobile-legends");
      await page
        .getByRole("button", { name: "Filter orders", exact: true })
        .click();
      await expect(page).toHaveURL(/game=mobile-legends/);
      await expect(page.getByLabel("Game slug", { exact: true })).toBeVisible();
      await expect(page.getByLabel("Game slug", { exact: true })).toHaveValue(
        "mobile-legends",
      );
      await page
        .getByRole("button", { name: "Clear order filters", exact: true })
        .click();
      await expect(more).not.toHaveAttribute("open", "");
    } else {
      await expect(page.locator(".minimal-header > nav")).toBeHidden();
      const nav = page.locator(".account-mobile-nav");
      const boxes = await nav.locator("a,button").evaluateAll((items) =>
        items.map((item) => {
          const r = item.getBoundingClientRect();
          return { top: r.top, height: r.height };
        }),
      );
      expect(boxes).toHaveLength(4);
      expect(boxes[0]?.top).toBe(boxes[1]?.top);
      expect(boxes[2]?.top).toBe(boxes[3]?.top);
      expect(boxes.every((box) => box.height >= 44)).toBe(true);
      const more = nav.getByRole("button", { name: "More", exact: true });
      await more.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(more).toBeFocused();
    }
    for (const [width, height] of [
      [320, 740],
      [768, 1024],
      [844, 390],
    ] as const) {
      await page.setViewportSize({ width, height });
      await reflows(page);
    }
    await page.setViewportSize({ width: 320, height: 740 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await reflows(page);
    if (portal === "customer") {
      await expect(
        page.locator("#customer-activity-slot .activity-trigger"),
      ).toBeVisible();
      const logo = await page.locator(".site-header .brand-logo").boundingBox();
      expect(logo?.width).toBeGreaterThanOrEqual(96);
      expect(logo?.height).toBeGreaterThan(16);
      expect(
        (
          await page
            .locator("#customer-activity-slot .activity-trigger")
            .boundingBox()
        )?.height,
      ).toBeLessThan(100);
    }
    const menu = page.getByRole("button", {
      name: portal === "admin" ? "Menu" : "More",
      exact: true,
    });
    await menu.click();
    const close = page.getByRole("dialog").getByRole("button", {
      name: portal === "admin" ? "Close menu" : "Close",
      exact: true,
    });
    await expect(close).toBeVisible();
    expect((await close.boundingBox())?.height).toBeLessThan(120);
    await reflows(page);
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
    await page.setViewportSize({ width: 768, height: 1024 });
    await reflows(page);
    expect(
      await page
        .getByLabel("Search game or full order ID", { exact: true })
        .evaluate((input) => {
          if (!(input instanceof HTMLInputElement)) return false;
          const label = input.labels?.item(0);
          if (!label) return false;
          const word = document.createElement("span");
          word.style.font = getComputedStyle(label).font;
          word.style.whiteSpace = "nowrap";
          word.textContent =
            label.textContent
              .split(/\s+/)
              .sort((a, b) => b.length - a.length)[0] ?? "";
          document.body.append(word);
          const readable =
            word.getBoundingClientRect().width <= label.clientWidth;
          word.remove();
          return readable;
        }),
    ).toBe(true);
  });
}
