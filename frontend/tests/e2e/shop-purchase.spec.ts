import { hostedCheckout } from "./hosted-checkout";
import { integratedCapture, measuredInteraction } from "./integrated-capture";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createHmac } from "node:crypto";
import { signIn, enroll, fixture, authURL } from "./identity-fixtures";
import { sessionSchema } from "../../app/identity/api";
import { settingsSchema, historySchema } from "../../app/payments/model";
test.use({ actionTimeout: 15000 });
async function api(page: Page, path: string, data: unknown) {
  const session = sessionSchema.parse(
    await (await page.request.get(authURL(page, "session"))).json(),
  );
  const out = await page.request.post("/api/v1" + path, {
    data,
    headers: {
      Origin: "http://127.0.0.1:4173",
      "X-CSRF-Token": session.csrf_token,
    },
  });
  expect(out.ok(), path + ": " + String(out.status())).toBe(true);
  return out.json() as Promise<unknown>;
}
async function capture(page: Page, name: string, width: number) {
  for (const size of width === 1440 ? [1440, 768] : [393, 320]) {
    await page.setViewportSize({ width: size, height: 900 });
    if (name === "shop-review") {
      const trigger = page.getByRole("button", { name: /Orders & support/ });
      await trigger.click();
      const panel = page.getByRole(size <= 700 ? "dialog" : "region", {
        name: "Your current orders",
        exact: true,
      });
      await expect(
        panel.getByRole("link", { name: "Chat with support", exact: true }),
      ).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
      await expect(trigger).toBeFocused();
    }
    if (["shop-review", "shop-payment"].includes(name)) {
      const targets =
        name === "shop-review"
          ? [
              page.getByRole("checkbox"),
              page.getByRole("button", {
                name: "Reserve and continue to payment",
              }),
            ]
          : [
              page.getByRole("link", {
                name: "Go to payment",
                exact: true,
              }),
              page.getByRole("button", {
                name: "Refresh payment",
                exact: true,
              }),
            ];
      for (const [index, target] of targets.entries()) {
        await target.evaluate((element) => {
          element.scrollIntoView({ block: "center" });
        });
        await expect
          .poll(() =>
            target.evaluate((element) => {
              const rect = element.getBoundingClientRect();
              return [0.1, 0.5, 0.9].every((x) =>
                [0.1, 0.5, 0.9].every((y) => {
                  const top = document.elementFromPoint(
                    rect.x + rect.width * x,
                    rect.y + rect.height * y,
                  );
                  return (
                    top !== null && (element === top || element.contains(top))
                  );
                }),
              );
            }),
          )
          .toBe(true);
        await page.screenshot({
          path: `.cache/di11-${name}-target-${String(index)}-${String(size)}.png`,
        });
      }
      await page.screenshot({
        path: `.cache/di11-${name}-viewport-${String(size)}.png`,
      });
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.cache/di11-${name}-${String(size)}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width, height: 900 });
}

test("@global-policy customer purchases shop item and staff reviews scanned manual delivery", async ({
  page,
  browser,
  request,
}, info) => {
  test.setTimeout(240000);
  await signIn(
    page,
    request,
    fixture(info.project.name, "shopworker"),
    "/admin/login",
  );
  await enroll(page);
  const policy = settingsSchema.parse(
    await (await page.request.get("/api/v1/admin/finance/policy")).json(),
  );
  if (!policy.published)
    await api(page, "/admin/finance/policy", {
      version: policy.version,
      action: "publish",
      data: {
        label: "Synthetic browser shop payment terms",
        text: "Synthetic test only. No real payment or commercial offer.",
        currencies: ["USD"],
        routes: [
          { code: "usdttrc20", label: "Synthetic USDT TRON", network: "trx" },
        ],
        fee_mode: "merchant",
        rate_mode: "fixed",
        window_minutes: 30,
        remedies: {
          cancellation: "Synthetic cancellation review terms.",
          partial_work: "Synthetic partial work review terms.",
          no_show: "Synthetic no show review terms.",
          missed_target: "Synthetic missed target review terms.",
          refund_basis: "Synthetic exact received funds basis.",
          refund_fees: "Synthetic approved fee treatment.",
          dispute_hours: 168,
          appeal_hours: 48,
          max_appeals: 1,
        },
      },
    });
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    viewport: info.project.use.viewport ?? null,
    isMobile: info.project.use.isMobile ?? false,
    hasTouch: info.project.use.hasTouch ?? false,
  });
  const buyer = await context.newPage();
  try {
    await signIn(buyer, request, fixture(info.project.name, "shopbuyer"));
    await expect(
      buyer.getByText("Your next step, in one place.", { exact: true }),
    ).toBeVisible();
    const slug = fixture(info.project.name, "shop_slug"),
      width = info.project.name === "desktop" ? 1440 : 393;
    await buyer.goto(`/games/${slug}/shop`);
    await expect(buyer.getByText("From USD 12.34")).toBeVisible();
    await capture(buyer, "shop-browse", width);
    await buyer
      .getByRole("link", { name: "View Synthetic fixture item" })
      .click();
    await expect(
      buyer.getByRole("heading", { name: "Choose your options" }),
    ).toBeVisible();
    await capture(buyer, "shop-options", width);
    await buyer.getByRole("button", { name: "Continue to recipient" }).click();
    await buyer
      .getByLabel("Player identifier (required)")
      .fill("synthetic-player-only");
    await capture(buyer, "shop-recipient", width);
    await measuredInteraction(
      buyer,
      `shop-review-${info.project.name}`,
      async () => {
        await buyer.getByRole("button", { name: "Review purchase" }).click();
        await expect(buyer.getByText("Total: USD 12.34")).toBeVisible();
      },
    );
    await capture(buyer, "shop-review", width);
    await integratedCapture(
      buyer,
      `shop-review-${info.project.name}`,
      buyer.getByLabel(
        "I confirm the recipient, compatibility, price and delivery terms",
      ),
    );
    await buyer
      .getByLabel(
        "I confirm the recipient, compatibility, price and delivery terms",
      )
      .check();
    await buyer
      .getByRole("button", { name: "Reserve and continue to payment" })
      .click();
    await expect(buyer).toHaveURL(/\/orders\/[^/]+\?section=payment$/);
    const order = new URL(buyer.url()).pathname.split("/").at(-1) ?? "";
    await buyer
      .getByLabel("Payment asset and network")
      .selectOption("usdttrc20");
    await buyer
      .getByLabel("I accept this payment policy and the agreed order price")
      .check();
    const payment = await hostedCheckout(buyer);
    const providerLink = buyer.getByRole("link", {
      name: "Go to payment",
      exact: true,
    });
    await expect(providerLink).toHaveAttribute(
      "href",
      `https://nowpayments.io/payment/?iid=${payment}`,
    );
    await expect(providerLink).toHaveAttribute("rel", "noreferrer");
    await expect(
      buyer.getByRole("img", { name: "QR code for the payment address" }),
    ).toHaveCount(0);
    await expect(
      buyer.getByRole("button", { name: "Copy address", exact: true }),
    ).toHaveCount(0);
    await expect(
      buyer.getByText(
        "Returning from the provider does not confirm payment. This page updates from verified provider evidence.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      buyer.getByRole("region", { name: "Received funds", exact: true }),
    ).toContainText(
      "No received funds recorded. A payment link or provider redirect is not a receipt.",
    );
    await capture(buyer, "shop-payment", width);
    await integratedCapture(
      buyer,
      `shop-payment-${info.project.name}`,
      providerLink,
    );
    const body = JSON.stringify({
      payment_id: payment,
      payment_status: "finished",
    });
    const sig = createHmac("sha512", "synthetic-payment-ipn-secret-for-tests")
      .update(body)
      .digest("hex");
    const signal = await request.post("/api/v1/webhooks/payments/nowpayments", {
      data: body,
      headers: { "Content-Type": "application/json", "X-Nowpayments-Sig": sig },
    });
    expect(signal.status()).toBe(204);
    await expect
      .poll(
        async () =>
          historySchema.parse(
            await (
              await buyer.request.get(`/api/v1/orders/${order}/payments`)
            ).json(),
          ).receipts.length,
        { timeout: 30000 },
      )
      .toBe(1);
    await page.goto("/admin/shop/orders?queue=ready");
    await expect(
      page.getByRole("link", {
        name: `Review shop order ${order.slice(0, 8)}`,
      }),
    ).toBeVisible();
    await capture(page, "shop-queue", width);
    await page
      .getByRole("link", { name: `Review shop order ${order.slice(0, 8)}` })
      .click();
    await page
      .getByRole("combobox", { name: "Action", exact: true })
      .selectOption("claim");
    await page
      .getByLabel("Customer-visible update")
      .fill("Starting synthetic manual delivery for this isolated order.");
    await page.getByRole("button", { name: "Confirm: Claim delivery" }).click();
    await expect(page.getByText("Assigned to you.")).toBeVisible();
    if (
      await page
        .getByRole("button", { name: "Review current delivery" })
        .isVisible()
    )
      await page
        .getByRole("button", { name: "Review current delivery" })
        .click();
    await page
      .getByRole("combobox", { name: "Action", exact: true })
      .selectOption("hold");
    await page
      .getByLabel("Customer-visible update")
      .fill("Draft retained while reviewing customer messages.");
    const tabs = page.getByRole("navigation", { name: "Order sections" });
    await tabs
      .getByRole("link", { name: "Messages & proof", exact: true })
      .click();
    await page
      .getByRole("link", { name: "← Shop fulfillment queue", exact: true })
      .click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Keep your order drafts?" }),
    ).toBeFocused();
    await capture(page, "shop-leave-guard", width);
    await page
      .getByRole("button", { name: "Stay on order", exact: true })
      .click();
    await tabs.getByRole("link", { name: "Fulfillment", exact: true }).click();
    await expect(page.getByLabel("Customer-visible update")).toHaveValue(
      "Draft retained while reviewing customer messages.",
    );
    await page
      .getByRole("combobox", { name: "Action", exact: true })
      .selectOption("");
    await page
      .getByRole("button", { name: "View my authorized recipient details" })
      .click();
    await expect(
      page.getByText("synthetic-player-only", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Hide recipient details" }).click();
    await capture(page, "shop-delivery", width);
    await tabs
      .getByRole("link", { name: "Messages & proof", exact: true })
      .click();
    await page.getByLabel("Message type").selectOption("proof");
    await page
      .getByLabel("Message", { exact: true })
      .fill("Synthetic delivered item proof.");
    await page
      .getByLabel("Choose image")
      .setInputFiles("tests/fixtures/proof.png");
    await page
      .getByRole("button", { name: "Upload image", exact: true })
      .click();
    await expect(
      page.getByText("Image checked and ready to send."),
    ).toBeVisible({ timeout: 30000 });
    await page
      .getByRole("button", { name: "Publish proof", exact: true })
      .click();
    await expect(page.locator(".message-list")).toContainText(
      "Synthetic delivered item proof.",
    );
    await tabs.getByRole("link", { name: "Fulfillment", exact: true }).click();
    await page
      .getByRole("combobox", { name: "Action", exact: true })
      .selectOption("submit");
    await page
      .getByLabel("Customer-visible update")
      .fill("Delivery evidence is ready for staff review.");
    await page
      .getByRole("combobox", { name: "Delivery evidence", exact: true })
      .selectOption({ index: 1 });
    await capture(page, "shop-evidence", width);
    await page
      .getByRole("button", { name: "Confirm: Submit delivery for review" })
      .click();
    await page
      .getByRole("combobox", { name: "Action", exact: true })
      .selectOption("approve");
    await page
      .getByLabel("Customer-visible update")
      .fill("Reviewed scanned evidence and confirmed delivery.");
    await page
      .getByRole("button", { name: "Confirm: Approve completed delivery" })
      .click();
    await expect(
      page.getByText(
        "Delivery actions are unavailable for the current order state.",
      ),
    ).toBeVisible();
    await buyer.goto(`/orders/${order}?section=delivery`);
    await expect(
      buyer
        .getByRole("region", { name: "Shop delivery" })
        .getByText("completed", { exact: true }),
    ).toHaveCount(2);
    await capture(buyer, "shop-complete", width);
  } finally {
    await context.close();
  }
});
