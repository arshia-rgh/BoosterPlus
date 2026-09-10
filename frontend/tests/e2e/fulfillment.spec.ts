import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn, enroll, fixture } from "./identity-fixtures";
async function accessible(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
test("paid work supports both modes, narrow booster access and reviewed completion", async ({
  page,
  browser,
  request,
}, info) => {
  test.setTimeout(150000);
  await signIn(page, request, fixture(info.project.name, "workadmin"));
  await enroll(page);
  const buyerContext = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
      viewport: info.project.use.viewport ?? null,
    }),
    staffContext = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
      viewport: info.project.use.viewport ?? null,
    }),
    buyer = await buyerContext.newPage(),
    staff = await staffContext.newPage();
  try {
    await signIn(staff, request, fixture(info.project.name, "workbooster"));
    await enroll(staff);
    await signIn(buyer, request, fixture(info.project.name, "workbuyer"));
    const accountID = fixture(info.project.name, "work_solo"),
      togetherID = fixture(info.project.name, "work_duo");
    async function assign(id: string) {
      await page.goto(`/admin/orders/${id}`);
      await page
        .getByLabel("Assigned staff", { exact: true })
        .selectOption(fixture(info.project.name, "workbooster_id"));
      await page
        .getByLabel("Assignment reason")
        .fill("Reviewed assignment for this synthetic order");
      await page
        .getByRole("button", { name: "Save assignment", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Change assignment" }),
      ).toBeVisible();
    }
    async function handoff(id: string) {
      await buyer.goto(`/orders/${id}`);
      await buyer
        .getByLabel("Player identifier (required)")
        .fill("synthetic-player");
      const refreshed = buyer.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === `/api/v1/fulfillment/${id}` &&
          response.request().method() === "GET" &&
          response.status() === 200,
      );
      await buyer
        .getByRole("button", {
          name: "Save fulfillment information",
          exact: true,
        })
        .click();
      await refreshed;
      await expect(
        buyer.getByLabel("Player identifier (required)"),
      ).toHaveValue("synthetic-player");
    }
    await assign(accountID);
    await handoff(accountID);
    await buyer
      .getByLabel("Temporary game login instructions", { exact: true })
      .fill("Synthetic temporary credential for browser qualification only");
    await buyer
      .getByRole("button", { name: "Save temporary game access", exact: true })
      .click();
    await expect(buyer.getByText(/^Status: active/)).toBeVisible();
    await staff.goto("/booster/orders");
    await staff.getByRole("link", { name: /Fulfillment journey game/ }).click();
    const work = await staff.request.get(
      `/api/v1/booster/fulfillment/${accountID}`,
    );
    expect(work.ok()).toBe(true);
    const raw = await work.text();
    expect(raw).not.toContain("amount_minor");
    expect(raw).not.toContain(fixture(info.project.name, "workbuyer"));
    expect(
      (await staff.request.get(`/api/v1/orders/${accountID}`)).status(),
    ).toBe(404);
    await staff
      .getByRole("button", { name: "Reveal game access", exact: true })
      .click();
    await expect(
      staff.getByText(
        "Synthetic temporary credential for browser qualification only",
        { exact: true },
      ),
    ).toBeVisible();
    await staff
      .getByRole("button", { name: "Hide game access", exact: true })
      .click();
    await staff
      .getByLabel("Customer-visible update", { exact: true })
      .fill("Ready to begin");
    await staff
      .getByRole("button", { name: "Start work", exact: true })
      .click();
    await expect(staff.getByLabel("Progress percent (0–99)")).toBeVisible();
    await staff
      .getByLabel("Customer-visible update", { exact: true })
      .fill("Rank progress reviewed");
    await staff.getByLabel("Progress percent (0–99)").fill("80");
    await staff
      .getByRole("button", { name: "Save progress", exact: true })
      .click();
    await expect(
      staff.getByText(/Status: in_progress · Progress 80%/),
    ).toBeVisible();
    await staff
      .getByLabel("Customer-visible update", { exact: true })
      .fill("Requested work ready for review");
    await staff
      .getByRole("button", {
        name: "Submit completion for review",
        exact: true,
      })
      .click();
    await expect(
      staff.getByText("Completion submitted for administrator review."),
    ).toBeVisible();
    await expect(
      staff.getByRole("button", { name: "Approve completion", exact: true }),
    ).toHaveCount(0);
    await accessible(staff);
    await page
      .getByRole("button", { name: "Refresh fulfillment", exact: true })
      .click();
    await page
      .getByLabel("Customer-visible update", { exact: true })
      .fill("Completion verified by administrator");
    await page
      .getByRole("button", { name: "Approve completion", exact: true })
      .click();
    await expect(
      page.getByText(/Status: completed · Progress 100%/),
    ).toBeVisible();
    await accessible(page);
    await buyer
      .getByRole("button", { name: "Refresh fulfillment", exact: true })
      .click();
    await expect(buyer.getByText(/^Status: deleted/)).toBeVisible();
    await expect(
      buyer.getByLabel("Temporary game login instructions"),
    ).toHaveCount(0);
    await accessible(buyer);
    await buyer.screenshot({
      path: `test-results/fulfillment-${info.project.name}.png`,
      fullPage: true,
    });
    await assign(togetherID);
    await handoff(togetherID);
    await expect(
      buyer.getByLabel("Temporary game login instructions"),
    ).toHaveCount(0);
    await staff.goto(`/booster/orders/${togetherID}`);
    await expect(
      staff.getByRole("button", { name: "Reveal game access", exact: true }),
    ).toHaveCount(0);
    await staff
      .getByLabel("Customer-visible update", { exact: true })
      .fill("Customer is ready to play together");
    await staff
      .getByRole("button", { name: "Start work", exact: true })
      .click();
    await expect(staff.getByLabel("Progress percent (0–99)")).toBeVisible();
    await accessible(staff);
  } finally {
    await buyerContext.close();
    await staffContext.close();
  }
});
