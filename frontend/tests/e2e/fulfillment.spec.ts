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
    await page
      .getByRole("button", { name: "Calculate delivery forecast", exact: true })
      .click();
    await expect(
      page.getByText(/Needs review. Required fulfillment/),
    ).toBeVisible();
    await handoff(accountID);
    await buyer
      .getByLabel("Temporary game login instructions", { exact: true })
      .fill("Synthetic temporary credential for browser qualification only");
    await buyer
      .getByRole("button", { name: "Save temporary game access", exact: true })
      .click();
    await expect(buyer.getByText(/^Status: active/)).toBeVisible();
    await page
      .getByRole("button", { name: "Enable shared coordination", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "This conversation changed",
    );
    await page
      .getByRole("button", { name: "Refresh fulfillment", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Calculate delivery forecast", exact: true })
      .click();
    await expect(page.getByText(/Ready for review/)).toBeVisible();
    await page
      .getByLabel("Delivery estimate reason")
      .fill("Reviewed synthetic calendar and queue");
    await accessible(page);
    const appliedForecast = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname ===
          `/api/v1/admin/fulfillment/${accountID}/forecast/apply` &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Apply delivery forecast", exact: true })
      .click();
    expect((await appliedForecast).status()).toBe(200);
    await expect(
      page.getByRole("button", {
        name: "Apply delivery forecast",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(page.getByText(/Estimated finish window:/)).toHaveCount(1);
    await buyer
      .getByRole("button", { name: "Refresh fulfillment", exact: true })
      .click();
    await expect(buyer.getByText(/Estimated finish window:/)).toBeVisible();
    await expect(
      buyer.getByRole("button", { name: "Apply delivery forecast" }),
    ).toHaveCount(0);
    await accessible(buyer);
    await buyer.screenshot({
      path: `test-results/delivery-${info.project.name}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Enable shared coordination", exact: true })
      .click();
    const shared = page.getByRole("link", {
      name: "Open coordination conversation",
      exact: true,
    });
    await expect(shared).toBeVisible();
    const sharedHref = await shared.getAttribute("href");
    expect(sharedHref).toBeTruthy();
    await shared.click();
    await page.getByLabel("Message audience").selectOption("internal");
    await page
      .getByLabel("Internal note", { exact: true })
      .fill("Internal scope never shared with boosters");
    await page
      .getByRole("button", { name: "Save internal note", exact: true })
      .click();
    await expect(page.locator(".internal-note")).toContainText(
      "Internal scope never shared with boosters",
    );
    await buyer.goto(sharedHref?.replace("/admin/", "/") ?? "/support");
    await buyer
      .getByLabel("Message", { exact: true })
      .fill("Ready to coordinate with assigned staff");
    await buyer
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect(buyer.locator(".message-list")).toContainText(
      "Ready to coordinate with assigned staff",
    );
    await page.goto(`/admin/orders/${accountID}`);
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
      .getByRole("link", {
        name: "Open coordination conversation",
        exact: true,
      })
      .click();
    await expect(staff.locator(".message-list")).toContainText(
      "Ready to coordinate with assigned staff",
    );
    await expect(
      staff.getByText("Internal scope never shared with boosters"),
    ).toHaveCount(0);
    await staff.getByLabel("Message type").selectOption("proof");
    await staff
      .getByLabel("Message", { exact: true })
      .fill("Synthetic completed rank proof");
    await staff
      .getByLabel("Choose image")
      .setInputFiles("tests/fixtures/proof.png");
    await staff
      .getByRole("button", { name: "Upload image", exact: true })
      .click();
    await expect(
      staff.getByText("Image checked and ready to send."),
    ).toBeVisible({ timeout: 30000 });
    await staff
      .getByRole("button", { name: "Publish proof", exact: true })
      .click();
    await expect(staff.locator(".message-list")).toContainText(
      "Published proof",
    );
    await accessible(staff);
    await buyer
      .getByRole("button", { name: "Refresh conversation", exact: true })
      .click();
    await expect(buyer.locator(".message-list")).toContainText(
      "Synthetic completed rank proof",
    );
    await buyer
      .getByRole("button", { name: "Get image download", exact: true })
      .click();
    await expect(
      buyer.getByRole("link", { name: "Download image", exact: true }),
    ).toBeVisible();
    await accessible(buyer);
    await buyer.screenshot({
      path: `test-results/coordination-${info.project.name}.png`,
      fullPage: true,
    });
    await page.goto(sharedHref ?? "/admin/support");
    await page
      .getByRole("button", { name: "Pause booster sharing", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Resume booster sharing", exact: true }),
    ).toBeVisible();
    await expect(
      staff.getByText("Conversation access is unavailable."),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      staff.getByText("Synthetic completed rank proof", { exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Resume booster sharing", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Pause booster sharing", exact: true }),
    ).toBeVisible();
    await staff.goto(
      sharedHref?.replace("/admin/", "/booster/") ?? "/booster/orders",
    );
    await expect(staff.locator(".message-list")).toContainText(
      "Published proof",
    );
    await page.goto(`/admin/orders/${accountID}`);
    await buyer.goto(`/orders/${accountID}`);
    await staff.goto(`/booster/orders/${accountID}`);
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
    await staff.goto("/booster/calendar");
    await staff.getByLabel("Accept new session bookings").check();
    await staff
      .getByLabel("Game capabilities (comma separated)")
      .fill("mobile-legends");
    await staff
      .getByRole("button", { name: "Save calendar profile", exact: true })
      .click();
    await expect(staff.getByLabel("Window start (local time)")).toBeVisible();
    const start = new Date(Date.now() + 2 * 3600_000),
      end = new Date(start.getTime() + 2 * 3600_000);
    await staff
      .getByLabel("Window start (local time)")
      .fill(start.toISOString().slice(0, 16));
    await staff
      .getByLabel("Window end (local time)")
      .fill(end.toISOString().slice(0, 16));
    await staff
      .getByRole("button", { name: "Publish availability", exact: true })
      .click();
    await expect(
      staff.getByRole("button", { name: "Remove window", exact: true }),
    ).toBeVisible();
    await accessible(staff);
    await page.goto("/admin/calendar");
    await page
      .getByLabel("Staff calendar to manage")
      .selectOption(fixture(info.project.name, "workbooster_id"));
    await expect(
      page.getByRole("button", { name: "Remove window", exact: true }),
    ).toBeVisible();
    await accessible(page);
    await assign(togetherID);
    await handoff(togetherID);
    await expect(
      buyer.getByLabel("Temporary game login instructions"),
    ).toHaveCount(0);
    await expect(
      buyer.getByLabel("Available window").locator("option"),
    ).toHaveCount(2);
    await buyer.getByLabel("Available window").selectOption({ index: 1 });
    await buyer
      .getByLabel("Session note", { exact: true })
      .fill("Ready for this play-together session");
    await buyer
      .getByRole("button", { name: "Submit session proposal", exact: true })
      .click();
    await expect(
      buyer.getByRole("heading", { name: "proposed", exact: true }),
    ).toBeVisible();
    await accessible(buyer);
    await staff.goto(`/booster/orders/${togetherID}`);
    await staff
      .getByLabel("Session action reason", { exact: true })
      .fill("Availability confirmed with customer");
    await staff
      .getByRole("button", { name: "Confirm session", exact: true })
      .click();
    await expect(
      staff.getByRole("heading", { name: "confirmed", exact: true }),
    ).toBeVisible();
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
    await staff.screenshot({
      path: `test-results/scheduling-${info.project.name}.png`,
      fullPage: true,
    });
  } finally {
    await buyerContext.close();
    await staffContext.close();
  }
});
