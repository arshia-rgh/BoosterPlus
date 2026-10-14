import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";
import {
  fixtureDefaults,
  fixturePolicy,
  fixtureSession,
} from "../fixtures/seller-offer/data";

let server: ViteDevServer, origin: string;
test.beforeAll(async () => {
  server = await createServer({
    configFile: false,
    envDir: false,
    root: fileURLToPath(new URL("../fixtures/seller-offer", import.meta.url)),
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
    throw new Error("Missing isolated address");
  origin = `http://127.0.0.1:${String(address.port)}`;
});
test.afterAll(async () => {
  await server.close();
});

for (const width of [320, 390, 768, 1280]) {
  test(`seller proposal surfaces field and generic failures and preserves retry at ${String(width)}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 });
    let policyMode = "ready",
      failure = "field",
      calls = 0;
    const offers: unknown[] = [];
    const requests: unknown[] = [];
    await page.route("**/api/v1/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      const send = (json: unknown, status = 200) =>
        route.fulfill({ json, status });
      if (path.endsWith("/session")) return send(fixtureSession);
      if (path.endsWith("/finance/policy")) {
        if (policyMode === "error")
          return send({ code: "internal_error" }, 503);
        return send(
          policyMode === "empty" ? { published: null } : fixturePolicy,
        );
      }
      if (path.endsWith("/account-agreement-defaults"))
        return send(fixtureDefaults);
      if (path.endsWith("/offers")) {
        if (route.request().method() === "GET") return send({ offers });
        calls++;
        const input = route.request().postDataJSON() as {
          terms: unknown;
          expires_at: string;
        };
        requests.push(input);
        if (failure === "field")
          return send(
            {
              code: "resale_invalid",
              issues: [
                {
                  path: "terms.currency",
                  message:
                    "Choose a payout asset and network from the published payment policy. Refresh payout routes and select again.",
                },
              ],
            },
            422,
          );
        if (failure === "bare") return send({ code: "resale_invalid" }, 422);
        const offer = {
          id: "synthetic-offer",
          submission_id: "synthetic-submission",
          version: 1,
          terms: input.terms,
          expires_at: input.expires_at,
          state: "offered",
          accepted_at: null,
          control_verified_at: null,
          created_at: new Date().toISOString(),
        };
        offers.push(offer);
        return send(offer);
      }
      return send({ code: "not_found" }, 404);
    });
    await page.goto(origin + "/admin/submissions/synthetic-submission");
    const picker = page.getByLabel("Payout asset and network");
    await expect(picker).toBeEnabled();
    await expect(picker.locator("option")).toHaveCount(2);
    await page
      .getByRole("button", { name: "Use approved consignment terms" })
      .click();
    await expect(picker).toHaveValue("");
    await picker.selectOption(JSON.stringify(["usdtbsc", "bsc"]));
    await expect(
      page.getByText("Selected route: USDT · BNB Smart Chain (BEP-20)", {
        exact: true,
      }),
    ).toBeVisible();
    await page.getByLabel("Agreed account base price (USD)").fill("100");
    await page.getByLabel("Crypto units per USD").fill("1");
    await page
      .getByLabel("Conversion quote source")
      .fill("Synthetic test quote");
    await page
      .getByLabel("Conversion quote time")
      .fill(new Date(Date.now() - 60000).toISOString().slice(0, 16));
    const submit = page.getByRole("button", {
      name: "Propose exact seller terms",
    });
    await submit.click();
    await expect(picker).toBeFocused();
    await expect(picker).toHaveAttribute("aria-invalid", "true");
    await expect(picker).toBeInViewport();
    await page.screenshot({
      path: info.outputPath(`field-${String(width)}.png`),
      fullPage: true,
    });
    failure = "bare";
    for (let i = 2; i <= 3; i++) {
      await submit.click();
      await expect.poll(() => calls).toBe(i);
      const alert = page.getByRole("alert");
      await expect(alert).toHaveText(/The seller offer was not sent/);
      await expect(alert.locator("..")).toBeFocused();
      await expect(alert).toBeInViewport();
    }
    expect(requests[0]).toEqual(requests[1]);
    expect(requests[1]).toEqual(requests[2]);
    await expect(
      page.getByLabel("Agreed account base price (USD)"),
    ).toHaveValue("100");
    await page.screenshot({
      path: info.outputPath(`bare-${String(width)}.png`),
      fullPage: true,
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);

    policyMode = "error";
    await page.getByRole("button", { name: "Refresh payout routes" }).click();
    await expect(submit).toBeDisabled();
    await expect(
      page.getByText(/Payout routes could not be loaded/),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`unavailable-${String(width)}.png`),
      fullPage: true,
    });
    policyMode = "empty";
    await page.getByRole("button", { name: "Refresh payout routes" }).click();
    await expect(page.getByText(/No payout route is published/)).toBeVisible();
    await expect(submit).toBeDisabled();
    policyMode = "ready";
    await page.getByRole("button", { name: "Refresh payout routes" }).click();
    await expect(submit).toBeEnabled();
    await expect(
      page.getByLabel("Agreed account base price (USD)"),
    ).toHaveValue("100");
    failure = "success";
    await submit.click();
    await expect(
      page.getByText("Offer: offered", { exact: true }),
    ).toBeVisible();
    expect(calls).toBe(4);
    await page.screenshot({
      path: info.outputPath(`offered-${String(width)}.png`),
      fullPage: true,
    });
  });
}
