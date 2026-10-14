import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";
let server: ViteDevServer, origin: string;
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  listing = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
test.beforeAll(async () => {
  server = await createServer({
    configFile: false,
    envDir: false,
    root: fileURLToPath(new URL("../fixtures/selling-flow", import.meta.url)),
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
    throw new Error("Missing isolated preview");
  origin = `http://127.0.0.1:${String(address.port)}`;
});
test.afterAll(async () => {
  await server.close();
});
for (const width of [320, 390, 768, 1280]) {
  test(`seller next step, secure handover and admin listing return at ${String(width)}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${origin}/sell/${id}?stage=accepted`);
    await expect(
      page.getByRole("heading", { name: "Share account access securely" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Before this account can go live" }),
    ).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath("seller-next.png"),
      fullPage: true,
    });
    await page
      .getByRole("link", { name: "Share account access", exact: true })
      .click();
    await page
      .getByLabel("Protected transfer details")
      .fill("synthetic isolated access");
    await page.getByLabel("Protected details expiry").fill("2027-10-16T12:00");
    await page
      .getByRole("button", { name: "Store protected transfer" })
      .click();
    await expect(
      page.getByText("Secure account details received.", { exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Overview", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "PLAYORA is preparing your listing" }),
    ).toBeVisible();
    await page.goto(
      `${origin}/admin/submissions/${id}?stage=listing_missing_handover`,
    );
    await expect(
      page.getByRole("heading", { name: "Waiting for secure account access" }),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath("admin-next.png"),
      fullPage: true,
    });
    await page
      .getByRole("link", { name: "Continue listing", exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/admin/accounts/${listing}\\?section=details$`),
    );
    await page
      .getByRole("link", { name: "Continue to images", exact: true })
      .click();
    await page
      .getByRole("link", { name: "Continue to buyer terms", exact: true })
      .click();
    await page
      .getByRole("link", {
        name: "Continue to preview & publication",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("button", { name: "Publish account listing" }),
    ).toBeDisabled();
    await page
      .getByRole("link", { name: "Share account access securely", exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/admin/submissions/${id}\\?section=handover$`),
    );
    await expect(
      page.getByRole("button", { name: "Verify ownership control" }),
    ).toHaveCount(0);
    await page
      .getByRole("link", { name: "← Account listing", exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/admin/accounts/${listing}\\?section=publication$`),
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath("listing-blockers.png"),
      fullPage: true,
    });
  });
  test(`submission and publication readiness at ${String(width)}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${origin}/sell/${id}?stage=draft&section=details`);
    const submit = page.getByRole("button", {
      name: "Save and submit for review",
    });
    await submit.click();
    await expect(
      page.getByLabel(
        "I control this account and have authority to submit it for review",
      ),
    ).toBeFocused();
    await page
      .getByLabel(
        "I control this account and have authority to submit it for review",
      )
      .check();
    await page
      .getByLabel("Private account title")
      .fill("My account for review");
    await page.screenshot({
      path: info.outputPath("intake.png"),
      fullPage: true,
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await submit.click();
    await expect(page).toHaveURL(/section=overview$/);
    await expect(
      page.getByRole("heading", { name: "Your account is in review" }),
    ).toBeVisible();
    await page.goto(
      `${origin}/admin/accounts/${listing}?stage=ready&section=publication`,
    );
    const publish = page.getByRole("button", {
      name: "Publish account listing",
    });
    await expect(publish).toBeDisabled();
    await page.getByRole("button", { name: "Show listing preview" }).click();
    await page
      .getByLabel(
        "I reviewed every public field and selected image, with permission to publish, and removed private information",
      )
      .check();
    await expect(publish).toBeEnabled();
    await publish.click();
    await expect(page.getByText(/This account is live/)).toBeVisible();
    await page.screenshot({
      path: info.outputPath("published.png"),
      fullPage: true,
    });
  });
}
test("progress states remain truthful and recoverable", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [stage, title] of [
    ["needs_information", "Update the requested details"],
    ["offered", "Review your sale proposal"],
    ["expired", "The proposal has expired"],
    ["expired_handover", "Update expired account details"],
    ["returned", "Update access before relisting"],
    ["published", "Live in Accounts"],
    ["reserved", "A buyer is checking out"],
    ["sold", "Your account has sold"],
    ["unavailable", "Listing paused with this game"],
    ["error", "Sale progress unavailable"],
  ] as const) {
    await page.goto(`${origin}/sell/${id}?stage=${stage}`);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`${stage}.png`),
      fullPage: true,
    });
  }
  await page.goto(
    `${origin}/admin/accounts/${listing}?stage=incomplete&section=publication`,
  );
  await expect(
    page.getByRole("link", { name: "Complete listing details", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Complete listing details", exact: true })
    .click();
  await expect(page.getByLabel("Public account title")).toBeVisible();
});

test("new listing and new submission return to an explicit next step", async ({
  page,
}) => {
  await page.goto(`${origin}/admin/submissions/${id}?stage=accepted`);
  await page
    .getByRole("button", { name: "Prepare listing", exact: true })
    .click();
  await page.getByRole("link", { name: "← Account sale", exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(`/admin/submissions/${id}\\?section=overview$`),
  );
  await page.goto(`${origin}/sell/new?stage=draft`);
  await page
    .getByRole("button", { name: "Choose Mobile Legends", exact: true })
    .click();
  await page.getByLabel("Private account title").fill("New synthetic account");
  await page
    .getByRole("button", { name: "Continue to account details", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/sell/${id}\\?section=details$`));
  await expect(page.getByLabel("Account notes (optional)")).toBeVisible();
});
