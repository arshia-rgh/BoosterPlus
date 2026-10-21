import { expect, type Page } from "@playwright/test";

/** In the isolated browser provider only, invoice ID equals synthetic payment ID.
 * Intercept the entire provider navigation before clicking: no external request,
 * invoice or funds movement is made by this helper. */
export async function hostedCheckout(page: Page): Promise<string> {
  const returnURL = page.url();
  if (new URL(returnURL).origin !== "http://127.0.0.1:4173")
    throw new Error("Hosted checkout helper is fixture-only");
  await page.route("https://nowpayments.io/**", async (route) => {
    const url = new URL(route.request().url());
    if (
      url.pathname !== "/payment/" ||
      !/^[1-9][0-9]*$/.test(url.searchParams.get("iid") ?? "")
    ) {
      await route.abort();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html lang='en'><title>Synthetic provider</title><body><h1>Isolated hosted checkout</h1><p>No real payment is available.</p></body></html>",
    });
  });
  await page.getByRole("button", { name: "Go to payment" }).click();
  await expect(page).toHaveURL(
    /^https:\/\/nowpayments\.io\/payment\/\?iid=[1-9][0-9]*$/,
    { timeout: 30000 },
  );
  await expect(
    page.getByRole("heading", { name: "Isolated hosted checkout" }),
  ).toBeVisible();
  const paymentID = new URL(page.url()).searchParams.get("iid");
  if (!paymentID) throw new Error("Missing synthetic provider reference");
  await page.goto(returnURL);
  await expect(page.getByRole("link", { name: "Go to payment" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Payment verified", exact: true }),
  ).toHaveCount(0);
  return paymentID;
}
