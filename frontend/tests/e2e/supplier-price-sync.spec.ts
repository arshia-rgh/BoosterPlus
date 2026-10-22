import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";

declare global {
  interface Window {
    priceRequests: { path: string; method: string; body: unknown }[];
  }
}
// Synthetic self-hosted fixture; no backend, supplier, account data or external request.
let server: ViteDevServer, origin: string;
test.beforeAll(async () => {
  server = await createServer({
    configFile: false,
    envDir: false,
    cacheDir: fileURLToPath(
      new URL(
        `../../.cache/price-sync-${process.env.TEST_WORKER_INDEX ?? "0"}`,
        import.meta.url,
      ),
    ),
    root: fileURLToPath(new URL("../fixtures/price-sync", import.meta.url)),
    publicDir: fileURLToPath(new URL("../../public", import.meta.url)),
    appType: "spa",
    server: {
      host: "127.0.0.1",
      port: 0,
      fs: { allow: [fileURLToPath(new URL("../../../", import.meta.url))] },
    },
    logLevel: "error",
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string")
    throw new Error("Missing preview address");
  origin = `http://127.0.0.1:${String(address.port)}`;
});
test.afterAll(async () => {
  await server.close();
});
const noOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const section = (page: Page) => page.locator("section.price-checks").first();
async function open(page: Page, stage = "mixed", width = 1440) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${origin}/admin/shop?stage=${stage}`);
  await expect(section(page).getByRole("heading", { level: 2 })).toBeVisible();
}
const shots = process.env.PRICE_SYNC_SHOTS;
async function shot(page: Page, name: string) {
  if (shots)
    await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

for (const width of [320, 390, 768, 1440]) {
  test(`price alerts lead Shop products without overflow at ${String(width)}px`, async ({
    page,
  }) => {
    await open(page, "mixed", width);
    const checks = section(page);
    await expect(
      checks.getByRole("heading", { level: 2, name: "6 price alerts" }),
    ).toBeVisible();
    // D1: the section is the first child, before the intro and creation.
    expect(
      await page.evaluate(
        () =>
          document.querySelector(".shop-editor")?.firstElementChild?.className,
      ),
    ).toBe("price-checks");
    await expect(checks.locator(".price-alerts > li h3")).toHaveText([
      "Diamonds · Türkiye",
      /^Supercalifragilistic/,
      "86 Diamonds · Global",
      "Twilight Pass bundle",
      "Starlight Membership · Philippines",
      "Weekly Diamond Pass · Indonesia",
    ]);
    await expect(checks).toContainText("Checks every 8 hours. Last check:");
    expect(await noOverflow(page)).toBe(true);
    for (const box of await checks.locator(".price-actions > *").all()) {
      const size = await box.boundingBox();
      expect(size?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    // One filled primary per item; wrapped rows start on the item's left edge.
    const layout = await page.evaluate(() =>
      [...document.querySelectorAll(".price-alerts > li")].map((item) => {
        const actions = [...item.querySelectorAll(".price-actions > *")];
        const left = item.getBoundingClientRect().left;
        return {
          primary: actions.filter((node) => !node.hasAttribute("data-variant"))
            .length,
          margins: actions.every(
            (node) => getComputedStyle(node).marginLeft === "0px",
          ),
          rowStarts: actions
            .filter(
              (node, index) =>
                index === 0 ||
                node.getBoundingClientRect().top >
                  (actions[index - 1]?.getBoundingClientRect().top ?? 0) + 1,
            )
            .map((node) =>
              Math.round(node.getBoundingClientRect().left - left),
            ),
        };
      }),
    );
    // Our price stays beside the supplier cost it is compared with.
    const amounts = await page.evaluate(() =>
      [...document.querySelectorAll(".price-alerts .price-amounts")].map(
        (list) => {
          const pairs = [...list.children].map((pair) =>
            pair.getBoundingClientRect(),
          );
          return {
            width: list.getBoundingClientRect().width,
            sideBySide: (pairs[1]?.top ?? 0) === (pairs[0]?.top ?? 0),
          };
        },
      ),
    );
    for (const list of amounts) {
      expect(list.width).toBeLessThanOrEqual(448.5);
      expect(list.sideBySide).toBe(width >= 480);
    }
    for (const item of layout) {
      expect(item.primary).toBe(1);
      expect(item.margins).toBe(true);
      expect(new Set(item.rowStarts).size).toBe(1);
    }
    const results = await new AxeBuilder({ page })
      .include("section.price-checks")
      .analyze();
    expect(results.violations).toEqual([]);
    await shot(page, `mixed-${String(width)}`);
  });
}

test("overridden prices show exact old and new supplier costs", async ({
  page,
}) => {
  await open(page);
  const plain = section(page)
    .locator("li")
    .filter({ hasText: "86 Diamonds · Global" });
  await expect(plain.getByText("Supplier price changed")).toBeVisible();
  await expect(plain).toContainText("Your fixed price was not changed.");
  await expect(plain.locator("dt")).toHaveText(["Supplier cost", "Your price"]);
  await expect(plain.locator("dd").first()).toHaveText(
    "USD 1.005 → to USD 1.20",
  );
  await expect(plain.locator("dd").nth(1)).toHaveText("USD 12.34");
  await expect(plain.locator(".price-actions > *")).toHaveText([
    "Keep my price for 86 Diamonds · Global",
    "Change fixed price for 86 Diamonds · Global",
    "Open product for 86 Diamonds · Global",
  ]);
  await expect(plain.getByText(/below the new supplier cost/)).toHaveCount(0);
  const below = section(page)
    .locator("li")
    .filter({ hasText: "Twilight Pass bundle" });
  await expect(below.locator("dt").first()).toHaveText(
    "Supplier cost for 5 units",
  );
  await expect(below).toContainText(
    "Your price is below the new supplier cost.",
  );
  await expect(below.locator(".price-actions > *").first()).toHaveText(
    "Change fixed price for Twilight Pass bundle",
  );
  await expect(
    below.getByRole("link", { name: /Change fixed price/ }),
  ).toHaveAttribute("href", /\/admin\/shop\/suppliers\?q=mlbb%3Adiamonds%3A/);
  // Problems that block sales offer no dismissal.
  const blocked = section(page)
    .locator("li")
    .filter({ hasText: "Diamonds · Türkiye" });
  await expect(blocked.getByRole("button")).toHaveCount(0);
  await expect(section(page)).toContainText(
    "choose Refresh draft from supplier settings",
  );
});

test("keeping a price moves focus to the next alert and announces it", async ({
  page,
}) => {
  await open(page);
  const checks = section(page);
  await checks
    .getByRole("button", { name: /Keep my price for 86 Diamonds/ })
    .click();
  await expect(
    checks.getByRole("heading", { level: 3, name: "Twilight Pass bundle" }),
  ).toBeFocused();
  await expect(checks.locator(".price-feedback")).toHaveText(
    "Kept your price for 86 Diamonds · Global.",
  );
  await expect(
    checks.getByRole("heading", { level: 2, name: "5 price alerts" }),
  ).toBeVisible();
  // The last item moves focus back to the previous one.
  await checks
    .getByRole("button", { name: /Dismiss for Weekly Diamond Pass/ })
    .click();
  await expect(
    checks.getByRole("heading", {
      level: 3,
      name: "Starlight Membership · Philippines",
    }),
  ).toBeFocused();
  await expect(checks.locator(".price-feedback")).toHaveText(
    "Alert dismissed for Weekly Diamond Pass · Indonesia.",
  );
});

test("the only alert returns focus to the section heading", async ({
  page,
}) => {
  await open(page, "single");
  const checks = section(page);
  await checks.getByRole("button", { name: /Keep my price/ }).click();
  await expect(
    checks.getByRole("heading", { level: 2, name: "Supplier price checks" }),
  ).toBeFocused();
  await expect(checks).toContainText("No alerts.");
  await shot(page, "single-after");
});

test("a stale alert asks for a reload; other failures keep the alert", async ({
  page,
}) => {
  await open(page, "conflict");
  const checks = section(page);
  await checks
    .getByRole("button", { name: /Keep my price for 86 Diamonds/ })
    .click();
  await expect(checks).toContainText("This alert changed since you loaded it.");
  const reload = checks.getByRole("button", { name: "Reload alerts" });
  await expect(reload).toBeFocused();
  // A repeat acknowledgement could only conflict again until reloaded.
  await expect(
    checks.getByRole("button", { name: /Keep my price for 86 Diamonds/ }),
  ).toBeDisabled();
  await shot(page, "conflict");
  await reload.click();
  await expect(checks.locator(".price-feedback")).toHaveText(
    "Alerts reloaded.",
  );
  await expect(checks.getByRole("heading", { level: 2 })).toBeFocused();
  await open(page, "ack-error");
  await section(page)
    .getByRole("button", { name: /Keep my price for 86 Diamonds/ })
    .click();
  await expect(section(page).locator(".price-error")).toBeFocused();
  await expect(
    section(page).getByRole("heading", {
      level: 3,
      name: "86 Diamonds · Global",
    }),
  ).toBeVisible();
});

test("schedule, run and loading states stay quiet and truthful", async ({
  page,
}) => {
  await open(page, "many");
  await shot(page, "state-many");
  await expect(section(page)).toContainText("63 price alerts");
  await expect(section(page)).toContainText(
    "Showing the 50 oldest of 63 alerts.",
  );
  await open(page, "quiet");
  await expect(section(page)).not.toHaveAttribute("data-prominent", "true");
  await expect(section(page)).toContainText("No alerts. Checks every 8 hours.");
  const recent = section(page).locator("details");
  await expect(recent).not.toHaveAttribute("open");
  await recent.locator("summary").click();
  await expect(recent).toContainText("Customer price USD 10.00 → to USD 10.50");
  await expect(recent).toContainText(
    "Supplier cost for 2 units USD 3.00 → to USD 2.80",
  );
  await shot(page, "quiet-open");
  await open(page, "fresh");
  await shot(page, "state-fresh");
  await expect(section(page)).toContainText(
    "No alerts. No price check has run yet.",
  );
  await expect(section(page).locator("details")).toHaveCount(0);
  await open(page, "off");
  await shot(page, "state-off");
  await expect(section(page)).toContainText("Automatic price checks are off.");
  await expect(section(page)).toContainText("2 price alerts");
  await open(page, "running");
  await shot(page, "state-running");
  await expect(section(page)).toContainText("Checking supplier prices now");
  await open(page, "failed");
  await shot(page, "state-failed");
  await expect(section(page)).toContainText(
    "couldn't reach the supplier. Prices were not changed.",
  );
  await open(page, "stopped");
  await shot(page, "state-stopped");
  await expect(section(page)).toContainText(
    "didn't finish. Prices were not changed.",
  );
  await page.goto(`${origin}/admin/shop?stage=loading`);
  await expect(
    page.getByRole("status").filter({ hasText: "Loading price alerts…" }),
  ).toBeVisible();
  await page.goto(`${origin}/admin/shop?stage=error`);
  await expect(
    page.getByText("Price alerts couldn't be loaded."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry price alerts" }),
  ).toBeVisible();
  await shot(page, "state-error");
  // The product list is never blocked by the alerts read.
  await expect(
    page.getByRole("heading", { name: "Products", exact: true }),
  ).toBeVisible();
});

test("product rows carry alert and automatic update badges", async ({
  page,
}) => {
  await open(page);
  const rows = page.locator(".shop-list > li");
  await expect(
    rows.filter({ hasText: "86 Diamonds · Global" }).locator(".price-badges"),
  ).toContainText(/Supplier price changed\s*Price updated \d/);
  await expect(
    rows.filter({ hasText: "172 Diamonds" }).locator(".price-badges"),
  ).toHaveText(/^Price updated/);
  await expect(
    rows.filter({ hasText: "manual coaching" }).locator(".price-badges"),
  ).toHaveCount(0);
});

for (const status of [
  "override_changed",
  "requirements_changed",
  "unavailable",
]) {
  test(`the editor shows the ${status} notice above its toolbar`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(`${origin}/admin/shop/synthetic-product?status=${status}`);
    const notice = page.locator("section.price-editor");
    await expect(notice).toBeVisible();
    expect(
      await page.evaluate(() => {
        const box = document.querySelector("section.price-editor");
        return !!box?.nextElementSibling?.classList.contains("shop-toolbar");
      }),
    ).toBe(true);
    await expect(
      notice.getByRole("link", { name: /Open product/ }),
    ).toHaveCount(0);
    expect(await noOverflow(page)).toBe(true);
    await shot(page, `editor-${status}`);
    if (status === "override_changed") {
      await notice.getByRole("button", { name: /Keep my price/ }).click();
      await expect(page.getByText("Your price was kept.")).toBeFocused();
      await shot(page, "editor-after-keep");
    }
  });
}

test("the editor notes a recent automatic update quietly", async ({ page }) => {
  await page.goto(`${origin}/admin/shop/synthetic-product?status=repriced`);
  await expect(page.locator(".price-editor-recent")).toContainText(
    "Price updated automatically on",
  );
  await expect(page.locator("section.price-editor")).toHaveCount(0);
  await shot(page, "editor-repriced");
});

test("the supplier catalog opens on the alert's product reference", async ({
  page,
}) => {
  await page.goto(`${origin}/admin/shop/suppliers?q=mlbb:diamonds:86`);
  await expect(
    page.getByRole("textbox", { name: /search/i }).first(),
  ).toHaveValue("mlbb:diamonds:86");
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.priceRequests.some((r) =>
          r.path.includes("/library?q=mlbb%3Adiamonds%3A86"),
        ),
      ),
    )
    .toBe(true);
});
