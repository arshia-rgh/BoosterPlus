import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("workspace loading stays readable and fills its panel at every width", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/v1/auth/session", async () => {
    // Leave the session pending to inspect the real Identity/PanelState integration.
  });
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/admin/catalog");
    await expect(
      page.getByRole("heading", { name: "Checking your sign-in" }),
    ).toBeVisible();
    const panel = page.locator('.ui-panel-state[data-kind="loading"]');
    await expect(panel.getByRole("status")).toHaveCount(1);
    const geometry = await panel
      .locator(".ui-skeleton")
      .evaluate((element) => ({
        width: element.getBoundingClientRect().width,
        available: element.parentElement?.getBoundingClientRect().width ?? 0,
        line: element.querySelector("span")?.getBoundingClientRect().width ?? 0,
        animation: getComputedStyle(element).animationName,
        overflow: document.documentElement.scrollWidth > window.innerWidth,
      }));
    expect(geometry.width).toBeCloseTo(geometry.available, 0);
    expect(geometry.line).toBeGreaterThan(70);
    expect(geometry.animation).toBe("none");
    expect(geometry.overflow).toBe(false);
    await expect(panel.locator(".ui-skeleton")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  }
});

test("missing-page recovery preserves workspace and responds to connection changes", async ({
  page,
  context,
}) => {
  for (const [path, label, destination] of [
    ["/missing", "Return to My account", "/account"],
    ["/booster/missing", "Return to Booster workspace", "/booster"],
    ["/admin/missing", "Return to Administration", "/admin"],
  ] as const) {
    const response = await page.goto(`${path}?detail=private-fixture-marker`);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "This page isn’t available.",
    );
    await expect(
      page.getByRole("link", { name: label, exact: true }),
    ).toHaveAttribute("href", destination);
    await expect(page.getByText("private-fixture-marker")).toHaveCount(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await context.setOffline(true);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Check your connection.",
    );
    await expect(
      page.getByRole("button", { name: "Reload page" }),
    ).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "This page isn’t available.",
    );
  }
});

test("session recovery respects server cooldown and keeps a retry busy until it finishes", async ({
  page,
}) => {
  let reads = 0;
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/auth/session", async (route) => {
    reads++;
    if (reads === 1) {
      await route.fulfill({
        status: 429,
        headers: { "Retry-After": "3" },
        json: { code: "rate_limited" },
      });
      return;
    }
    await pending;
    await route.fulfill({
      json: {
        user: null,
        csrf_token: "fixture".repeat(10),
        google_enabled: false,
        google_linked: false,
        mfa_required: false,
        capabilities: [],
        terms_version: "fixture",
        terms_url: "/terms",
      },
    });
  });
  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: "Please wait before trying again" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("UTC");
  const retry = page.getByRole("button", { name: "Retry connection" });
  await expect(retry).toBeDisabled();
  await page.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
  });
  expect(reads).toBe(1);
  await expect(retry).toBeEnabled();
  await retry.click();
  await expect(
    page.getByRole("button", { name: "Checking connection…" }),
  ).toBeDisabled();
  await page.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
  });
  expect(reads).toBe(2);
  release?.();
  await expect(
    page.getByRole("button", { name: "Send verification code" }),
  ).toBeVisible();
});
