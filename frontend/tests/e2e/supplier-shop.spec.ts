import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";
let server: ViteDevServer, origin: string;
test.beforeAll(async () => {
  server = await createServer({
    configFile: false,
    envDir: false,
    root: fileURLToPath(new URL("../fixtures/supplier-shop", import.meta.url)),
    publicDir: fileURLToPath(new URL("../../public", import.meta.url)),
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
    throw new Error("Missing fixture address");
  origin = `http://127.0.0.1:${String(address.port)}`;
});
test.afterAll(async () => {
  await server.close();
});
test("fresh quote, keyboard validation and uncertain reservation retain one request", async ({
  page,
}, info) => {
  await page.goto(
    origin + "/games/example/shop/synthetic-product?stage=uncertain",
  );
  await page.getByRole("button", { name: "Review current price" }).click();
  await expect(page.getByLabel("Player ID")).toBeFocused();
  await page.getByLabel("Player ID").fill("synthetic-player");
  await page.getByLabel("Server", { exact: true }).selectOption("eu");
  await page.getByLabel("Game password").fill("synthetic-password");
  await page.getByLabel("Quantity", { exact: true }).fill("1.5");
  await page.getByRole("button", { name: "Review current price" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Review your order" }),
  ).toBeFocused();
  await expect(page.getByText("USD 17.25", { exact: true })).toBeVisible();
  expect(
    await page
      .getByRole("button", { name: "Edit details" })
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).not.toBe(
    await page
      .getByRole("button", { name: "Go to payment" })
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  );
  // FORMS172: consent sits on its own row above the payment actions.
  const consent = await page
    .getByLabel(
      "I confirm the delivery details, region, price and product terms",
    )
    .boundingBox();
  const pay = await page
    .getByRole("button", { name: "Go to payment" })
    .boundingBox();
  expect(consent && pay).toBeTruthy();
  expect(
    (pay?.y ?? 0) - (consent?.y ?? 0) - (consent?.height ?? 0),
  ).toBeGreaterThan(8);
  expect(
    await page.evaluate(
      () => window.nexusUIRequests.find((r) => r.path.endsWith("/quote"))?.body,
    ),
  ).toEqual({
    release_id: "synthetic-release",
    quantity: "1.5",
  });
  for (const width of [1440, 768, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`purchase-${String(width)}.png`),
      fullPage: true,
    });
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Go to payment" }).click();
  await expect(
    page.getByRole("button", { name: "Check this order" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toBeFocused();
  await expect(page.getByRole("alert")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Edit details" }),
  ).toBeDisabled();
  await page.screenshot({
    path: info.outputPath("uncertain.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Check this order" }).click();
  await expect(
    page.getByRole("heading", { name: "Existing payment destination" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => {
      const requests = window.nexusUIRequests.filter((r) =>
        r.path.endsWith("/supplier-reserve"),
      );
      return (
        requests.length === 2 &&
        JSON.stringify(requests[0]?.body) === JSON.stringify(requests[1]?.body)
      );
    }),
  ).toBe(true);
});
test("expiry blocks payment and session loss clears private values and late reservation", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto(
    origin + "/games/example/shop/synthetic-product?stage=expiry&method=code",
  );
  await page.getByRole("button", { name: "Review current price" }).click();
  await page.getByRole("checkbox").check();
  await page.clock.fastForward(3000);
  await expect(
    page.getByRole("button", { name: "Refresh price" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Go to payment" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Refresh price" }).click();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page.goto(
    origin + "/games/example/shop/synthetic-product?stage=delayed",
  );
  await page.getByLabel("Player ID").fill("synthetic-private");
  await page.getByLabel("Server", { exact: true }).selectOption("eu");
  await page.getByLabel("Game password").fill("synthetic-secret");
  await page.getByRole("button", { name: "Review current price" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Go to payment" }).click();
  await page.evaluate(() => {
    window.expireNexusSession();
    window.finishNexusRequest();
  });
  await expect(
    page.getByRole("link", { name: "Sign in to order" }),
  ).toBeVisible();
  await expect(page.getByLabel("Game password")).toHaveCount(0);
  await expect(page).toHaveURL(/\/games\/example\/shop\/synthetic-product/);
});
test("private codes wrap, expire after reveal and disappear on changed order context", async ({
  page,
}, info) => {
  await page.clock.install();
  await page.goto(origin + "/delivery?method=code");
  await page.clock.fastForward(59000);
  await page.getByRole("button", { name: "Reveal my codes" }).click();
  const codes = page.getByRole("region", { name: "Private delivery codes" });
  await expect(codes).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Redeem code at redeem.example.invalid" }),
  ).toHaveAttribute("rel", "noreferrer noopener");
  await expect(
    page.getByRole("heading", { name: "Your delivery codes" }),
  ).toBeFocused();
  await page.clock.fastForward(2000);
  await expect(codes).toBeVisible();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`codes-${String(width)}.png`),
      fullPage: true,
    });
  }
  await page.clock.fastForward(58000);
  await expect(codes).toHaveCount(0);
  await page.getByRole("button", { name: "Reveal my codes" }).click();
  await page.getByRole("button", { name: "Hide codes" }).click();
  await expect(
    page.getByRole("button", { name: "Reveal my codes" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Reveal my codes" }).click();
  await expect(codes).toBeVisible();
  await page.evaluate(() => {
    window.setNexusDelivery("held");
  });
  await expect(codes).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Delivery needs support review" }),
  ).toBeVisible();
});
test("delivery actions handle errors and reject a foreign verification destination", async ({
  page,
}, info) => {
  await page.goto(origin + "/delivery?state=pending&stage=error");
  await page.getByRole("button", { name: "Check required action" }).click();
  await expect(page.getByRole("alert")).toBeFocused();
  await page.goto(origin + "/delivery?state=pending&stage=unsafe");
  await page.getByRole("button", { name: "Check required action" }).click();
  await expect(
    page.getByText("The action could not be verified. Contact support."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Continue secure verification" }),
  ).toHaveCount(0);
  await page.goto(origin + "/delivery?state=pending");
  await page.getByRole("button", { name: "Check required action" }).click();
  await expect(
    page.getByRole("link", { name: "Continue secure verification" }),
  ).toHaveAttribute("rel", "noreferrer noopener");
  await expect(
    page.getByRole("heading", { name: "Action needed to complete delivery" }),
  ).toBeVisible();
  expect(
    await page
      .getByRole("button", { name: "Refresh delivery" })
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).not.toBe(
    await page
      .getByRole("link", { name: "Continue secure verification" })
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  );
  await page.screenshot({
    path: info.outputPath("verification.png"),
    fullPage: true,
  });
  await page.evaluate(() => {
    window.dispatchEvent(new Event("blur"));
  });
  await expect(
    page.getByRole("link", { name: "Continue secure verification" }),
  ).toHaveCount(0);
});
test("reviewed library prepares a private listing in the real editor", async ({
  page,
}, info) => {
  await page.goto(origin + "/admin/shop/suppliers");
  await expect(
    page.getByLabel("Supplier environment").locator("option"),
  ).toHaveCount(2);
  await page.screenshot({
    path: info.outputPath("private-library.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Prepare listing draft" })
    .first()
    .click();
  await expect(page).toHaveURL(/\/admin\/shop\/synthetic-product$/);
  await expect(
    page.getByRole("heading", { name: "Shop product editor" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Stock", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Publication", exact: true }).click();
  await page.getByRole("button", { name: "Preview saved revision" }).click();
  await expect(
    page.getByRole("article", { name: "Private customer preview" }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("admin-preview.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(() =>
      window.nexusUIRequests
        .filter((r) => r.method === "POST")
        .map((r) => r.path),
    ),
  ).toEqual(["/api/v1/admin/shop/supplier-listings"]);
});
test("linked supplier refresh reads saved version and opens the existing private editor", async ({
  page,
}, info) => {
  await page.goto(origin + "/admin/shop/suppliers?stage=linked");
  await expect(
    page.getByRole("link", { name: "Open listing draft" }),
  ).toHaveAttribute("href", "/admin/shop/synthetic-product");
  await page
    .getByRole("button", { name: "Refresh draft from supplier settings" })
    .click();
  await expect(page).toHaveURL(/\/admin\/shop\/synthetic-product$/);
  await expect(
    page.getByRole("heading", { name: "Shop product editor" }),
  ).toBeVisible();
  const ledger = await page.evaluate(() => window.nexusUIRequests);
  const prepare = ledger.findIndex((r) => r.method === "POST");
  expect(ledger[prepare]?.path).toBe("/api/v1/admin/shop/supplier-listings");
  expect(ledger[prepare]?.body.shop_version).toBe(7);
  expect(
    ledger
      .slice(0, prepare)
      .some(
        (r) =>
          r.method === "GET" &&
          r.path === "/api/v1/admin/shop/products/synthetic-product",
      ),
  ).toBe(true);
  expect(ledger.filter((r) => r.method === "POST")).toHaveLength(1);
  await page.screenshot({
    path: info.outputPath("refreshed-draft.png"),
    fullPage: true,
  });
});
test("unpaid, pending, uncertain, partial and cancelled statuses give truthful next steps", async ({
  page,
}, info) => {
  for (const state of [
    "awaiting_payment",
    "pending",
    "unresolved",
    "partial",
    "cancelled",
  ]) {
    await page.goto(origin + `/delivery?state=${state}&method=account`);
    await expect(
      page.getByRole("button", { name: "Reveal my codes" }),
    ).toHaveCount(0);
    if (state === "partial")
      await expect(
        page.getByText(
          "Delivered 0.5 of 1.5 requested. Support will review the remaining amount.",
        ),
      ).toBeVisible();
    if (state === "awaiting_payment")
      await expect(
        page.getByRole("link", { name: "Go to payment" }),
      ).toHaveAttribute("href", "/orders/synthetic-order?section=payment");
    if (state === "unresolved")
      await expect(
        page.getByText(/This does not mean your order failed/),
      ).toBeVisible();
    if (state !== "pending")
      await expect(
        page.getByRole("button", { name: "Check required action" }),
      ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`${state}.png`),
      fullPage: true,
    });
  }
  for (const state of ["pending", "completed"]) {
    await page.goto(
      origin + `/delivery?state=${state}&method=code&stage=review`,
    );
    await expect(
      page.getByRole("heading", { name: "Delivery needs support review" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /Reveal my codes|Check required action/,
      }),
    ).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath(`${state}-review.png`),
      fullPage: true,
    });
  }
});
test("protected reveal uses the real recent-verification dialog and does not resume after privacy changes", async ({
  page,
}, info) => {
  await page.goto(origin + "/delivery?method=code&stage=reauth");
  await page.getByRole("button", { name: "Reveal my codes" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Private delivery codes" }),
  ).toHaveCount(0);
  await dialog.getByLabel("Six-digit authenticator code").fill("123456");
  await page.screenshot({
    path: info.outputPath("recent-verification.png"),
    fullPage: true,
  });
  await dialog.getByRole("button", { name: "Verify and continue" }).click();
  await expect(
    page.getByRole("region", { name: "Private delivery codes" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        window.nexusUIRequests.filter((r) => r.path.endsWith("/shop/codes"))
          .length,
    ),
  ).toBe(2);
  await page.goto(
    origin + "/delivery?method=account&state=pending&stage=reauth",
  );
  await page.getByRole("button", { name: "Check required action" }).click();
  await expect(dialog).toBeVisible();
  await page.evaluate(() => {
    window.dispatchEvent(new Event("blur"));
  });
  await dialog.getByLabel("Six-digit authenticator code").fill("123456");
  await dialog.getByRole("button", { name: "Verify and continue" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Continue secure verification" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        window.nexusUIRequests.filter((r) => r.path.endsWith("/shop/action"))
          .length,
    ),
  ).toBe(1);
  await page.getByRole("button", { name: "Check required action" }).click();
  await expect(
    page.getByRole("link", { name: "Continue secure verification" }),
  ).toBeVisible();
});
test("combined storefront filters preserve manual products and returning shop context", async ({
  page,
}, info) => {
  await page.goto(origin + "/games/example/shop");
  await expect(page.locator(".shop-card")).toHaveCount(4);
  await expect(
    page.getByRole("heading", { name: "PLAYORA manual product" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Regional digital code" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Filters/ }).click();
  await page.getByLabel("Region", { exact: true }).selectOption("Türkiye");
  await page.getByLabel("Product type").selectOption("Upgrades");
  await page
    .getByLabel("Delivery method", { exact: true })
    .selectOption("account");
  await expect(
    page.getByRole("dialog", { name: "Shop filters" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".shop-card")).toHaveCount(1);
  expect(
    await page.evaluate(
      () =>
        window.nexusUIRequests.filter((r) => r.path.endsWith("/shop/filters"))
          .length,
    ),
  ).toBe(1);
  await page.screenshot({
    path: info.outputPath("browse-filtered.png"),
    fullPage: true,
  });
  await page
    .getByRole("link", { name: /^View details for Example game/ })
    .click();
  await page.getByRole("link", { name: "Back to shop" }).click();
  await page.getByRole("button", { name: /^Filters/ }).click();
  await expect(page.getByLabel("Delivery method", { exact: true })).toHaveValue(
    "account",
  );
  await expect(page.getByLabel("Region", { exact: true })).toHaveValue(
    "Türkiye",
  );
  await page
    .getByLabel("Delivery method", { exact: true })
    .selectOption("manual");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".shop-card")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "PLAYORA manual product" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        window.nexusUIRequests.filter((r) => r.path.endsWith("/shop/filters"))
          .length,
    ),
  ).toBe(2);
});
test("admin list and queue distinguish supplier orders from manual work", async ({
  page,
}, info) => {
  await page.goto(origin + "/admin/shop");
  await expect(
    page.getByText("Example game · Supplier delivery · draft · Revision 1"),
  ).toBeVisible();
  await expect(
    page.getByText("Example game · Manual delivery · draft · Revision 1"),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("admin-products.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Shop delivery queue" }).click();
  await expect(
    page.getByRole("cell", { name: "Supplier delivery", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Unclaimed", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Delivery queue", { exact: true })
    .selectOption("supplier");
  await page.getByRole("button", { name: "Apply queue filters" }).click();
  await expect(
    page.getByRole("cell", { name: "Unclaimed", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /Review shop order/ }),
  ).toHaveAttribute("href", "/admin/orders/supplier-order?section=fulfillment");
  const orderLink = page.getByRole("link", {
    name: "Order supplier",
    exact: true,
  });
  await expect(orderLink).toBeVisible();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await orderLink.scrollIntoViewIfNeeded();
    const box = await orderLink.boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= width).toBeTruthy();
    await orderLink.focus();
    await expect(orderLink).toBeFocused();
    await page.screenshot({
      path: info.outputPath(`supplier-queue-${String(width)}.png`),
      fullPage: true,
    });
  }
  await page.screenshot({
    path: info.outputPath("supplier-queue.png"),
    fullPage: true,
  });
  await orderLink.click();
  await expect(page).toHaveURL(
    origin + "/admin/orders/supplier-order?section=fulfillment",
  );
  await expect(
    page.getByRole("heading", { name: "Existing staff order destination" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      window.nexusUIRequests.filter((r) => r.method === "POST"),
    ),
  ).toEqual([]);
});
test("manual products retain recipient checkout and staff claim and proof submission", async ({
  page,
}, info) => {
  await page.goto(origin + "/games/example/shop/manual-product");
  await page.getByRole("button", { name: "Continue to recipient" }).click();
  await page.getByLabel("Player ID (required)").fill("synthetic-manual-player");
  await page.getByRole("button", { name: "Review purchase" }).click();
  await expect(
    page.getByRole("heading", { name: "Review your purchase" }),
  ).toBeFocused();
  await page.screenshot({
    path: info.outputPath("manual-purchase.png"),
    fullPage: true,
  });
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Reserve and continue to payment" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Existing payment destination" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      window.nexusUIRequests.some((r) =>
        r.path.endsWith("/shop/manual-product/reserve"),
      ),
    ),
  ).toBe(true);
  await page.goto(origin + "/admin/manual-delivery");
  await page
    .getByRole("combobox", { name: "Action", exact: true })
    .selectOption("claim");
  await page
    .getByLabel("Customer-visible update")
    .fill("Starting this synthetic manual delivery.");
  await page.getByRole("button", { name: "Confirm: Claim delivery" }).click();
  await expect(page.getByText("Assigned to you.")).toBeVisible();
  await page
    .getByRole("button", { name: "View my authorized recipient details" })
    .click();
  await expect(
    page.getByText("synthetic-manual-player", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Action", exact: true })
    .selectOption("submit");
  await page
    .getByLabel("Customer-visible update")
    .fill("Synthetic manual delivery is ready for review.");
  await page.getByLabel("Delivery evidence").selectOption("synthetic-proof");
  await page.screenshot({
    path: info.outputPath("manual-proof.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Confirm: Submit delivery for review" })
    .click();
  await expect(
    page
      .getByRole("combobox", { name: "Action", exact: true })
      .locator("option[value='approve']"),
  ).toHaveCount(1);
  expect(
    await page.evaluate(() =>
      window.nexusUIRequests.some(
        (r) =>
          r.path.includes("supplier-reserve") || r.path.includes("/shop/codes"),
      ),
    ),
  ).toBe(false);
});
test("closed and held parent orders override stale supplier availability", async ({
  page,
}, info) => {
  for (const parent of ["cancelled", "expired", "rejected", "on_hold"]) {
    for (const state of ["awaiting_payment", "pending", "completed"]) {
      await page.goto(
        origin + `/delivery?method=code&state=${state}&parent=${parent}`,
      );
      await expect(
        page.getByRole("button", {
          name: /Reveal my codes|Check required action/,
        }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("link", { name: "Go to payment" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("heading", {
          name:
            parent === "expired"
              ? "Order expired"
              : parent === "rejected"
                ? "Order not accepted"
                : parent === "cancelled"
                  ? "Order cancelled"
                  : "Delivery needs support review",
        }),
      ).toBeVisible();
      if (state === "completed")
        await page.screenshot({
          path: info.outputPath(`parent-${parent}.png`),
          fullPage: true,
        });
    }
  }
});

test("published detail prices stay clear before quote and while buying is unavailable", async ({
  page,
}, info) => {
  for (const [id, stage] of [
    ["synthetic-product", "unavailable"],
    ["synthetic-product", "fixed-price"],
    ["manual-product", "ready"],
  ] as const) {
    await page.goto(
      origin + `/games/example/shop/${id}?stage=${stage}&method=id`,
    );
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const price = page.locator(
        ".shop-product-intro .shop-published-price strong",
      );
      await expect(price).toHaveText("USD 5.75");
      const badge = page.locator(".shop-product-intro .shop-region-badge");
      await expect(badge.locator('[data-region="tr"]')).toBeVisible();
      expect(
        await badge
          .locator("img")
          .evaluate((el) => (el as HTMLImageElement).naturalWidth > 0),
      ).toBe(true);
      const flagBox = await badge.locator("img").boundingBox();
      expect(flagBox && flagBox.width <= 26 && flagBox.height <= 20).toBe(true);
      await price.scrollIntoViewIfNeeded();
      expect(
        Number(await price.evaluate((el) => getComputedStyle(el).fontWeight)),
      ).toBeGreaterThanOrEqual(650);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: info.outputPath(`price-${stage}-${String(width)}.png`),
        fullPage: true,
      });
    }
  }
});

test("region badges retain artwork and readable region names on desktop and phone", async ({
  page,
}, info) => {
  for (const [region, flags] of [
    ["Global", ["global"]],
    ["Indonesia", ["id"]],
    ["Singapore / Malaysia", ["sg", "my"]],
    ["Europe", []],
  ] as const) {
    await page.goto(
      origin +
        "/games/example/shop/synthetic-product?stage=unavailable&method=id&badge=" +
        encodeURIComponent(region),
    );
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const intro = page.locator(".shop-product-intro");
      await expect(intro.getByText(region, { exact: true })).toBeVisible();
      await expect(
        intro.locator(".shop-region-badge [data-region]"),
      ).toHaveCount(flags.length);
      for (const flag of flags)
        await expect(intro.locator(`[data-region="${flag}"]`)).toBeVisible();
      const art = intro.getByRole("img", { name: "Mobile Legends artwork" });
      await expect(art).toBeVisible();
      await expect
        .poll(() => art.evaluate((el) => (el as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
      const frame = intro.locator(".shop-artwork-frame");
      await frame.scrollIntoViewIfNeeded();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(
          `region-${region.replaceAll(/[^a-zA-Z]/g, "")}-${String(width)}.png`,
        ),
        fullPage: true,
      });
    }
  }
});

test("manual option price ranges remain readable", async ({ page }, info) => {
  await page.goto(origin + "/games/example/shop/manual-product?stage=range");
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const price = page.locator(".shop-product-intro .shop-published-price");
    await expect(price.locator("strong")).toHaveText("USD 5.75 – 12.34");
    await expect(price.locator("small")).toHaveText("By option");
    await price.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`range-${String(width)}.png`),
      fullPage: true,
    });
  }
});
