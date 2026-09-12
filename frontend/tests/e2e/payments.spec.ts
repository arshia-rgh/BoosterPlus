import { createHmac } from "node:crypto";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn, enroll, fixture } from "./identity-fixtures";
test("staff publishes checkout policy and customer pays through verified provider evidence", async ({
  page,
  browser,
  request,
}, info) => {
  test.setTimeout(120000);
  await signIn(page, request, fixture(info.project.name, "payadmin"));
  await enroll(page);
  await page.goto("/admin/finance");
  await page
    .getByLabel("Policy title")
    .fill("Synthetic browser payment agreement");
  await page
    .getByLabel("Customer payment policy")
    .fill(
      "Synthetic sandbox payment terms for this automated browser journey only.",
    );
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
    ).toHaveAttribute("href", "https://sandbox.nowpayments.io/payment/?iid=1", {
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
  } finally {
    await customerContext.close();
  }
});
