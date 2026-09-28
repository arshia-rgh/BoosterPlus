import { secondaryCapture } from "./secondary-capture";
import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { z } from "zod";
import { fixture, signIn, enroll } from "./identity-fixtures";
async function publish(page: Page, label: string, device: string) {
  await secondaryCapture(
    page,
    `content-${new URL(page.url()).searchParams.get("kind") ?? "home"}-write`,
    device,
  );
  await page
    .getByRole("button", { name: "Save private draft", exact: true })
    .click();
  await expect(
    page.getByText("Request completed.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Preview & publish", exact: true })
    .click();
  await page
    .getByLabel("I reviewed this saved content preview", { exact: true })
    .check();
  await secondaryCapture(
    page,
    `content-${new URL(page.url()).searchParams.get("kind") ?? "home"}-preview`,
    device,
  );
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
    page.getByText("Reviewed content published.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "History", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Published history", exact: true }),
  ).toBeVisible();
  await secondaryCapture(
    page,
    `content-${new URL(page.url()).searchParams.get("kind") ?? "home"}-history`,
    device,
  );
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
  await signIn(
    page,
    request,
    fixture(info.project.name, "contentowner"),
    "/admin/login",
  );
  await enroll(page);
  await page.goto("/admin/content");
  await expect(page.getByLabel("Headline", { exact: true })).toBeVisible();
  await page.getByLabel("Headline", { exact: true }).fill("YOUR NEXT\nLEVEL.");
  await page
    .getByLabel("Support hours and timezone")
    .fill("Synthetic test support · UTC");

  await page.getByLabel("Use reviewed service introductions").check();
  await page
    .getByRole("button", { name: "Save private draft", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Review the content fields" }),
  ).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Fields to check" }),
  ).toBeVisible();
  await page
    .getByRole("list", { name: "Fields to check" })
    .getByRole("link")
    .first()
    .click();
  await expect(page.getByLabel("boost section title")).toBeFocused();
  await page
    .getByRole("region", {
      name: "Homepage services and statistics",
      exact: true,
    })
    .screenshot({ path: info.outputPath("di03-content-validation.png") });
  for (const kind of ["boost", "accounts", "shop", "payment", "news"]) {
    await page.getByLabel(`${kind} section title`).fill(`Reviewed ${kind}`);
    await page
      .getByLabel(`${kind} section description`)
      .fill(`Approved synthetic ${kind} service description.`);
  }
  await page.getByLabel("Use reviewed service introductions").uncheck();
  await page.getByLabel("Use reviewed service introductions").check();
  await expect(page.getByLabel("boost section title")).toHaveValue(
    "Reviewed boost",
  );
  await page
    .getByLabel("Allow source-based public statistics after publication")
    .check();
  const viewport = page.viewportSize();
  for (const width of info.project.name === "desktop" ? [1280, 768] : [320]) {
    await page.setViewportSize({ width, height: 900 });
    await accessible(page);
    await page
      .getByRole("region", {
        name: "Homepage services and statistics",
        exact: true,
      })
      .screenshot({
        path: info.outputPath(`di03-content-${String(width)}.png`),
      });
  }
  await page.getByLabel("boost section title").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: info.outputPath(`di03-content-viewport-${info.project.name}.png`),
    scale: "css",
  });
  if (viewport) await page.setViewportSize(viewport);
  await publish(page, "home-" + randomUUID(), info.project.name);
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
  await publish(page, "retention-" + randomUUID(), info.project.name);
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
      .getByRole("button", { name: "Recheck holds and retention", exact: true })
      .click();
    await expect(
      card.getByText("Status: reviewed", { exact: true }),
    ).toBeVisible();
    await card
      .getByRole("combobox", { name: "Action", exact: true })
      .selectOption("erase");
    await expect(
      card.getByLabel(
        "I reviewed this action, current policy and retained records.",
      ),
    ).not.toBeChecked();
    await secondaryCapture(page, "privacy-erase", info.project.name);
    await card
      .getByLabel(
        "I reviewed this action, current policy and retained records.",
      )
      .check();
    await card
      .getByRole("button", { name: "Erase eligible data", exact: true })
      .click();
    await expect(
      card.getByText("Status: erased pending files", { exact: true }),
    ).toBeVisible();
    await card
      .getByRole("combobox", { name: "Action", exact: true })
      .selectOption("finalize");
    await expect(
      card.getByLabel(
        "I reviewed this action, current policy and retained records.",
      ),
    ).not.toBeChecked();
    await secondaryCapture(page, "privacy-finalize", info.project.name);
    await card
      .getByLabel(
        "I reviewed this action, current policy and retained records.",
      )
      .check();
    await card
      .getByRole("button", { name: "Confirm file purge", exact: true })
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
  await publish(page, "notifications-" + randomUUID(), info.project.name);
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
  await page
    .getByRole("button", { name: "Add policy section", exact: true })
    .click();
  await page.getByLabel("Policy kind").focus();
  await page.getByLabel("Policy kind").selectOption("privacy");
  await expect(page.getByLabel("Policy kind")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Policy section title")).toBeFocused();
  await page
    .getByLabel("Policy section title")
    .fill("Reviewed privacy details");
  await page
    .getByLabel("Policy section text")
    .fill("Synthetic approved privacy details for an isolated test only.");
  const version = "legal-" + randomUUID();
  await publish(page, version, info.project.name);
  await page.goto("/how-it-works");
  await expect(
    page.getByRole("heading", { name: "How PLAYORA works.", exact: true }),
  ).toBeVisible();
  await secondaryCapture(page, "how-it-works", info.project.name);
  await page.goto("/terms?version=" + version);
  await expect(
    page.getByRole("heading", {
      name: "Reviewed privacy details",
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("di03-historical-policy.png"),
    fullPage: true,
  });
  await expect(
    page.getByText("Version: " + version, { exact: true }),
  ).toBeVisible();
  await secondaryCapture(page, "policy-version", info.project.name);
  await page
    .getByRole("link", { name: "Reviewed privacy details", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/policies/privacy\\?version=${version}`),
  );
  await expect(
    page.getByRole("heading", {
      name: "Reviewed privacy details",
      exact: true,
    }),
  ).toBeVisible();
  await secondaryCapture(page, "policy-section", info.project.name);
  await page.emulateMedia({ media: "print" });
  await expect(
    page.getByRole("region", { name: "Page motion" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Policy contents" }),
  ).not.toBeVisible();
  await page.screenshot({
    path: `.cache/di13-policy-print-${info.project.name}.png`,
    fullPage: true,
  });
  await page.emulateMedia({ media: "screen" });

  await page
    .getByRole("link", {
      name: "Read the current published version",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/policies\/privacy$/);
  await page.goto("/policies/refunds?version=" + version);
  await expect(
    page.getByRole("heading", {
      name: "This policy is unavailable.",
      exact: true,
    }),
  ).toBeVisible();
  await secondaryCapture(page, "policy-unavailable", info.project.name);
  await page
    .getByRole("button", { name: "Retry this policy", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/policies/refunds\\?version=${version}`),
  );

  await accessible(page);
});
