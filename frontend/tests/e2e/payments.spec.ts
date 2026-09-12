import { resaleJourney } from "./resale-journey";
import { createHmac } from "node:crypto";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn, enroll, fixture } from "./identity-fixtures";
test("staff publishes policy and verifies customer payment, dispute and refund", async ({
  page,
  browser,
  request,
}, info) => {
  test.setTimeout(300000);
  await signIn(page, request, fixture(info.project.name, "payadmin"));
  await enroll(page);
  await page.goto("/admin/finance");
  await page
    .getByLabel("Policy title")
    .fill("Synthetic browser payment agreement");
  await page
    .getByLabel("Customer payment policy")
    .fill(
      "Synthetic fixture payment terms for this automated browser journey only.",
    );
  for (const label of [
    "Cancellation terms",
    "Partial work terms",
    "No-show terms",
    "Missed target terms",
    "Refund calculation terms",
    "Refund fee terms",
  ]) {
    await page
      .getByLabel(label, { exact: true })
      .fill("Synthetic operator-approved terms for this automated test only.");
  }
  await page.getByLabel("Dispute window in hours (1–8760)").fill("168");
  await page.getByLabel("Appeal window in hours (0–720)").fill("48");
  await page.getByLabel("Maximum appeals (0–3)").fill("1");
  await page.getByLabel("Processing fees paid by").selectOption("merchant");
  await page.getByLabel("Exchange rate policy").selectOption("fixed");
  await page
    .getByLabel("Local checkout window in minutes (15–1440)")
    .fill("30");
  await page.getByLabel("USD", { exact: true }).check();
  await page.getByRole("button", { name: "Add asset and network" }).click();
  await page.getByLabel("NOWPayments asset code").fill("usdttrc20");
  await page.getByLabel("Customer label").fill("Test USDT TRON");
  await page.getByLabel("Network identifier").fill("trx");
  await page.getByRole("button", { name: "Publish payment policy" }).click();
  await expect(page.getByText("Revision 2", { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const customerContext = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    viewport: info.project.use.viewport ?? null,
    isMobile: info.project.use.isMobile ?? false,
    hasTouch: info.project.use.hasTouch ?? false,
  });
  const customer = await customerContext.newPage();
  try {
    await signIn(customer, request, fixture(info.project.name, "paybuyer"));
    await expect(
      customer.getByRole("heading", { name: "Profile", exact: true }),
    ).toBeVisible();
    const id = fixture(info.project.name, "pay_order");
    await customer.goto(`/orders/${id}`);
    await customer
      .getByLabel("Payment asset and network")
      .selectOption("usdttrc20");
    await customer
      .getByLabel("I accept this payment policy and the agreed order price")
      .check();
    await customer
      .getByRole("button", { name: "Create secure checkout" })
      .click();
    await expect(
      customer.getByRole("link", { name: "Continue to NOWPayments" }),
    ).toHaveAttribute("href", "https://nowpayments.io/payment/?iid=1", {
      timeout: 20000,
    });
    const invalid = await request.post(
      "/api/v1/webhooks/payments/nowpayments",
      {
        data: { payment_id: "1" },
        headers: { "X-Nowpayments-Sig": "0".repeat(128) },
      },
    );
    expect(invalid.status()).toBe(400);
    const body = JSON.stringify({
      payment_id: "1",
      payment_status: "finished",
    });
    const signature = createHmac(
      "sha512",
      "synthetic-payment-ipn-secret-for-tests",
    )
      .update(body)
      .digest("hex");
    for (let i = 0; i < 2; i++) {
      const signal = await request.post(
        "/api/v1/webhooks/payments/nowpayments",
        {
          data: body,
          headers: {
            "Content-Type": "application/json",
            "X-Nowpayments-Sig": signature,
          },
        },
      );
      expect(signal.status()).toBe(204);
    }
    await expect(
      customer
        .getByText("Payment verified and allocated to your order.", {
          exact: true,
        })
        .first(),
    ).toBeVisible({ timeout: 25000 });
    await expect(
      customer.getByText("12.34000001 USDTTRC20", { exact: true }),
    ).toBeVisible();
    expect(
      (await new AxeBuilder({ page: customer }).analyze()).violations,
    ).toEqual([]);
    expect(
      await customer.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect((await customer.request.get("/api/v1/admin/finance")).status()).toBe(
      403,
    );
    await page.getByLabel("Payment filter").selectOption("");
    await expect(
      page.getByRole("link", { name: `Order ${id.slice(0, 8)}` }),
    ).toBeVisible();
    await customer.getByLabel("Review reason").selectOption("cancellation");
    await customer
      .getByLabel("Describe your case")
      .fill("Please cancel the unused service and review a partial refund.");
    await customer
      .getByRole("button", { name: "Open service case", exact: true })
      .click();
    await expect(
      customer.getByRole("heading", { name: "cancellation · open" }),
    ).toBeVisible();
    await page.goto(`/admin/orders/${id}`);
    await page
      .getByLabel("Case message")
      .fill(
        "We reviewed the unused work and propose cancellation with this refund.",
      );
    await page.getByLabel("Case outcome").selectOption("cancel");
    await page.getByRole("button", { name: "Propose case decision" }).click();
    await expect(
      page.getByRole("heading", { name: "cancellation · decided" }),
    ).toBeVisible();
    await page.getByLabel("Refund source receipt").selectOption({ index: 1 });
    await page.getByLabel("Exact refund crypto amount").fill("4.00000001");
    await page
      .getByLabel("Refund proposal terms")
      .fill("Synthetic exact unused-service refund; no additional test fees.");
    await page
      .getByRole("button", { name: "Propose refund", exact: true })
      .click();
    await expect(
      page.getByText("Status: recipient pending", { exact: true }),
    ).toBeVisible();
    await customer
      .getByRole("button", { name: "Refresh refunds", exact: true })
      .click();
    await customer
      .getByLabel("Refund destination address")
      .fill("synthetic-browser-recipient");
    await customer
      .getByLabel("Refund memo or destination tag")
      .fill("synthetic-memo");
    await customer
      .getByLabel(
        "I accept these refund terms and confirm this address, network and memo",
      )
      .check();
    await customer
      .getByRole("button", { name: "Confirm refund recipient" })
      .click();
    await expect(
      customer.getByText("Status: verified", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Refresh refunds", exact: true })
      .click();
    await expect(
      page.getByText("Status: verified", { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Refund authorization reason")
      .fill(
        "Owner approves this exact customer-confirmed destination and amount.",
      );
    await page.getByRole("button", { name: "Approve exact refund" }).click();
    await expect
      .poll(
        async () => {
          await page
            .getByRole("button", { name: "Refresh refunds", exact: true })
            .click();
          return await page
            .getByLabel("NOWPayments authenticator code")
            .count();
        },
        { timeout: 20000 },
      )
      .toBe(1);
    await page
      .getByLabel("Refund authorization reason")
      .fill("Authorize the independently verified outgoing transfer.");
    await page.getByLabel("NOWPayments authenticator code").fill("123456");
    await page
      .getByRole("button", { name: "Authorize provider transfer" })
      .click();
    await expect
      .poll(
        async () => {
          await page
            .getByRole("button", { name: "Refresh refunds", exact: true })
            .click();
          return await page
            .getByText("Status: confirmed", { exact: true })
            .count();
        },
        { timeout: 20000 },
      )
      .toBe(1);
    await customer
      .getByRole("button", { name: "Refresh cases and order", exact: true })
      .click();
    await expect(
      customer.getByRole("heading", { name: "cancellation · decided" }),
    ).toBeVisible();
    await customer
      .getByLabel("Case message")
      .fill("I accept the confirmed refund and the cancellation resolution.");
    await customer
      .getByRole("button", { name: "Accept resolution and close case" })
      .click();
    await expect(
      customer.getByRole("heading", { name: "cancellation · closed" }),
    ).toBeVisible();
    await expect(
      customer.getByText("Status: confirmed", { exact: true }),
    ).toBeVisible();
    expect(
      (await new AxeBuilder({ page: customer }).analyze()).violations,
    ).toEqual([]);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  } finally {
    await customerContext.close();
  }
  await test.step("Seller offer, public inventory and paid ownership delivery", async () => {
    await resaleJourney(page, browser, request, info);
  });
});
