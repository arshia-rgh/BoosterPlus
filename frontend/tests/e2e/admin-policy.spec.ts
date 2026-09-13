import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { z } from "zod";
import { fixture, signIn, enroll } from "./identity-fixtures";
async function publish(page: Page, label: string) {
  await page.getByLabel("Publish this reviewed revision now").check();
  await page.getByLabel("Unique published version").fill(label);
  await page
    .getByLabel("I reviewed the complete content and approve publication.")
    .check();
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname.startsWith("/api/v1/admin/site/") &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Publish reviewed content", exact: true })
    .click();
  expect((await response).status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Published history", exact: true }),
  ).toBeVisible();
}
async function accessible(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
test("@global-policy owner publishes content and retention, customer exports data and reviews deletion", async ({
  page,
  request,
  browser,
}, info) => {
  test.setTimeout(180000);
  await signIn(page, request, fixture(info.project.name, "contentowner"));
  await enroll(page);
  await page.goto("/admin/content");
  await expect(page.getByLabel("Headline", { exact: true })).toBeVisible();
  await page.getByLabel("Headline", { exact: true }).fill("YOUR NEXT\nLEVEL.");
  await page
    .getByLabel("Support hours and timezone")
    .fill("Synthetic test support · UTC");
  await publish(page, "home-" + randomUUID());
  await page.goto("/");
  await expect(
    page.getByText("Synthetic test support · UTC", { exact: true }),
  ).toBeVisible();
  await accessible(page);
  await page.goto("/admin/content");
  await page
    .getByRole("combobox", { name: "Editor", exact: true })
    .selectOption("retention");
  for (const label of [
    "Financial records",
    "Closed disputes",
    "Security audit history",
    "Resolved ordinary support",
    "Grace period after request",
  ]) {
    await page.getByLabel(label + " (days)", { exact: true }).fill("0");
  }
  await page
    .getByLabel("Customer-facing retention and retained-evidence policy")
    .fill(
      "Synthetic test policy: remove eligible profiles and ordinary private content. Preserve financial agreements, dispute evidence, anonymized reviews and audit history. No real customer data.",
    );
  await page
    .getByLabel("Backup retention and deletion policy")
    .fill(
      "Synthetic isolated database with no production backups. No production erasure is asserted.",
    );
  await page
    .getByLabel(
      "I approve preserving financial, dispute and audit evidence as described above.",
    )
    .check();
  await page
    .getByLabel("Enable customer deletion requests under this published policy")
    .check();
  await publish(page, "retention-" + randomUUID());
  await accessible(page);
  await page.screenshot({
    path: info.outputPath("retention-policy.png"),
    fullPage: true,
  });
  const customerContext = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    viewport: page.viewportSize(),
    isMobile: info.project.use.isMobile ?? false,
    hasTouch: info.project.use.hasTouch ?? false,
  });
  const customer = await customerContext.newPage();
  try {
    await signIn(
      customer,
      request,
      "privacy-" + randomUUID() + "@example.test",
    );
    await expect(
      customer.getByRole("button", { name: "Refresh overview", exact: true }),
    ).toBeVisible();
    await customer.goto("/privacy");
    await expect(
      customer.getByRole("button", {
        name: "Request account deletion",
        exact: true,
      }),
    ).toBeVisible();
    const download = customer.waitForEvent("download");
    await customer
      .getByRole("button", { name: "Download selected category", exact: true })
      .click();
    expect((await download).suggestedFilename()).toBe(
      "playora-personal-profile.json",
    );
    await customer
      .getByLabel(
        "I read the current retention policy and request removal of my profile and eligible private content, subject to its retained-evidence and backup rules.",
      )
      .check();
    const requested = customer.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/api/v1/privacy/requests" &&
        r.request().method() === "POST",
    );
    await customer
      .getByRole("button", { name: "Request account deletion", exact: true })
      .click();
    const body = z
      .object({ id: z.string() })
      .parse(await (await requested).json());
    await expect(
      customer.getByText("Status: requested", { exact: true }),
    ).toBeVisible();
    await accessible(customer);
    await customer.screenshot({
      path: info.outputPath("customer-privacy.png"),
      fullPage: true,
    });
    await page.goto("/admin/privacy");
    const card = page.getByRole("article").filter({
      has: page.getByRole("heading", {
        name: "Request " + body.id,
        exact: true,
      }),
    });
    await card
      .getByLabel(
        "I reviewed this action, current policy and retained records.",
      )
      .check();
    await card
      .getByRole("button", { name: "Review privacy request", exact: true })
      .click();
    await expect(
      card.getByText("Status: reviewed", { exact: true }),
    ).toBeVisible();
    await card
      .getByRole("combobox", { name: "Action", exact: true })
      .selectOption("erase");
    await card
      .getByLabel(
        "I reviewed this action, current policy and retained records.",
      )
      .check();
    await card
      .getByRole("button", { name: "Review privacy request", exact: true })
      .click();
    await expect(
      card.getByText("Status: erased pending files", { exact: true }),
    ).toBeVisible();
    await card
      .getByRole("combobox", { name: "Action", exact: true })
      .selectOption("finalize");
    await card
      .getByRole("button", { name: "Review privacy request", exact: true })
      .click();
    await expect(
      card.getByText("Status: completed", { exact: true }),
    ).toBeVisible();
    await customer.reload();
    await expect(
      customer.getByLabel("Email address", { exact: true }),
    ).toBeVisible();
    await accessible(page);
  } finally {
    await customerContext.close();
  }
  for (const route of ["/admin/customers", "/admin/media", "/admin/alerts"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await accessible(page);
  }
  await page.goto("/admin/reports");
  await page
    .getByRole("combobox", { name: "Report", exact: true })
    .selectOption("receipts");
  await page.getByLabel("From date (UTC, inclusive)").fill("2000-01-01");
  await page.getByLabel("Until date (UTC, exclusive)").fill("2100-01-01");
  await page
    .getByRole("button", { name: "Preview report", exact: true })
    .click();
  await expect(page.getByText(/Receipts first recorded/)).toBeVisible();
  await accessible(page);
  await page.goto("/admin/content");
  await page
    .getByRole("combobox", { name: "Editor", exact: true })
    .selectOption("notifications");
  await page
    .getByLabel("Email footer", { exact: true })
    .fill("Synthetic browser support contact hours");
  await publish(page, "notifications-" + randomUUID());
  await accessible(page);
  await page.goto("/admin/content");
  await page
    .getByRole("combobox", { name: "Editor", exact: true })
    .selectOption("legal");
  await page
    .getByLabel("Approved account terms and privacy text")
    .fill(
      "Synthetic published legal terms for isolated browser qualification. This text does not authorize a production launch.",
    );
  const version = "legal-" + randomUUID();
  await publish(page, version);
  await page.goto("/terms");
  await expect(
    page.getByText("Version: " + version, { exact: true }),
  ).toBeVisible();
  await accessible(page);
});
