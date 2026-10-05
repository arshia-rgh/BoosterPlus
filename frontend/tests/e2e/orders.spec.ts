import { integratedCapture, measuredInteraction } from "./integrated-capture";
import { secondaryCapture } from "./secondary-capture";
import { authURL } from "./identity-fixtures";
import { qualifyOrderWorkspace } from "./order-workspace-journey";
import { availabilityJourney } from "./availability-journey";
import { randomUUID } from "node:crypto";
import { test, expect, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn, enroll, fixture } from "./identity-fixtures";
import { sessionSchema } from "../../app/identity/api";
import {
  emptyConfiguration,
  emptyField,
  draftSchema,
} from "../../app/catalog/model";
import { detailSchema } from "../../app/orders/model";
async function api(page: Page, path: string, body: unknown) {
  const session = sessionSchema.parse(
    await (await page.request.get(authURL(page, "session"))).json(),
  );
  const response = await page.request.post("/api/v1" + path, {
    data: body,
    headers: {
      Origin: "http://127.0.0.1:4173",
      "X-CSRF-Token": session.csrf_token,
    },
  });
  expect(response.ok()).toBe(true);
  return response.json() as Promise<unknown>;
}
async function accessible(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}
test("customers submit, revise, accept, cancel and reorder; staff issues immutable quotes", async ({
  page,
  browser,
  request,
}, info) => {
  test.setTimeout(150000);
  await signIn(
    page,
    request,
    fixture(info.project.name, "orderadmin"),
    "/admin/login",
  );
  await enroll(page);
  const slug = `order-${info.project.name}-${randomUUID()}`,
    config = emptyConfiguration("Order journey game");
  config.name = "Order journey game";
  config.reviewed = true;
  config.services = [
    {
      key: "boost",
      name: "Rank boost",
      description: "Synthetic test service",
      evaluator: "manual-review-v1",
      fields: [
        {
          ...emptyField("mode"),
          key: "mode",
          label: "Play mode",
          type: "select",
          stage: "estimate",
          required: true,
          options: [
            { key: "solo", label: "Solo", units: 0 },
            { key: "duo", label: "Duo", units: 0 },
          ],
          reference: "",
          help: "",
          unit: "",
          min: "",
          max: "",
          step: "",
          max_length: 0,
        },
        {
          ...emptyField("note"),
          key: "note",
          label: "Ordinary instructions",
          type: "short_text",
          stage: "order",
          required: false,
          options: [],
          reference: "",
          help: "Do not enter credentials.",
          unit: "",
          min: "",
          max: "",
          step: "",
          max_length: 100,
        },
      ],
      rules: [],
    },
  ];
  config.services[0]?.fields.push({
    ...emptyField("screenshot"),
    label: "Rank screenshot",
    type: "attachment",
    stage: "order",
  });
  config.packages = [
    {
      key: "starter",
      name: "Starter pack",
      description: "Synthetic fixed pack",
      service: "boost",
      variants: [
        {
          key: "standard",
          name: "Standard",
          currency: "USD",
          amount_minor: "1234",
          capacity: 2,
          delivery_min_hours: 1,
          delivery_max_hours: 24,
          required_fields: ["mode"],
        },
      ],
    },
  ];
  const draft = draftSchema.parse(
    await api(page, "/admin/catalog/games", { slug, configuration: config }),
  );
  const published = draftSchema.parse(
    await api(page, `/admin/catalog/games/${draft.id}/publish`, {
      revision: draft.revision,
    }),
  );
  expect(published.published).toBe(true);
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    viewport: info.project.use.viewport ?? null,
  });
  const buyer = await context.newPage();
  try {
    await buyer.goto(`/games/${slug}/services/boost`);
    await buyer.getByLabel("Play mode (required)").selectOption("duo");
    await buyer
      .getByRole("button", { name: "Continue to order information →" })
      .click();
    await buyer
      .getByRole("button", { name: "Check selections", exact: true })
      .click();
    await buyer
      .getByLabel("Ordinary instructions")
      .fill("Private text must not survive sign-in");
    await buyer
      .getByRole("button", { name: "Check selections", exact: true })
      .click();
    await buyer
      .getByRole("link", { name: "Sign in and complete verification" })
      .click();
    await expect(buyer).toHaveURL(/\/login\?returnTo=/);
    const entry = buyer.url();
    await signIn(buyer, request, fixture(info.project.name, "orders"), entry);
    await expect(buyer).toHaveURL(
      new RegExp(`/games/${slug}/services/boost\\?step=review$`),
    );
    await expect(buyer.getByLabel("Play mode (required)")).toHaveValue("duo");
    await buyer
      .getByRole("button", { name: "Continue to order information →" })
      .click();
    await expect(buyer.getByLabel("Ordinary instructions")).toHaveValue("");
    await expect(
      buyer.getByRole("region", { name: "Submit order" }),
    ).toHaveCount(0);
    await buyer
      .getByRole("button", { name: "Check selections", exact: true })
      .click();
    await expect(
      buyer.getByLabel("I accept the terms and request a final quote"),
    ).not.toBeChecked();
    await expect(
      buyer.getByRole("button", { name: "Submit quote request", exact: true }),
    ).toBeDisabled();
    await buyer.goto(`/games/${slug}/services/boost`);
    await buyer.getByLabel("Play mode (required)").selectOption("solo");
    await expect(
      buyer.getByRole("complementary", { name: "Selection summary" }),
    ).toContainText("Solo");
    await accessible(buyer);
    await buyer.getByRole("button", { name: "Reduced", exact: true }).click();
    await expect(buyer.locator(".experience")).toHaveAttribute(
      "data-motion",
      "reduced",
    );
    await buyer
      .getByRole("button", { name: "Continue to order information →" })
      .click();
    await expect(buyer.getByLabel("Play mode (required)")).toHaveCount(0);
    await expect(
      buyer.getByRole("complementary", { name: "Selection summary" }),
    ).toContainText("Solo");
    await buyer
      .getByLabel("Ordinary instructions")
      .fill("Keep this ordinary note on the original order only");
    await expect(
      buyer.getByRole("complementary", { name: "Selection summary" }),
    ).not.toContainText("Keep this ordinary note");
    await buyer
      .getByLabel("Choose rank screenshot")
      .setInputFiles("tests/fixtures/proof.png");
    await expect(
      buyer.getByRole("button", { name: "Check selections", exact: true }),
    ).toBeDisabled();
    await buyer
      .getByRole("button", { name: "Upload image", exact: true })
      .click();
    await expect(
      buyer.getByText("Image checked and ready to send."),
    ).toBeVisible();
    await expect(
      buyer.getByRole("button", { name: "Check selections", exact: true }),
    ).toBeEnabled();
    await accessible(buyer);
    await buyer.screenshot({
      path: `.cache/di05-intake-${info.project.name}.png`,
      fullPage: true,
    });
    await buyer.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await buyer.screenshot({
      path: `.cache/r03-estimator-${info.project.name}.png`,
      fullPage: true,
    });
    await buyer
      .getByRole("button", { name: "Save to favorites", exact: true })
      .click();
    await expect(
      buyer.getByRole("button", { name: "Saved to favorites" }),
    ).toBeVisible();
    await buyer
      .getByRole("button", { name: "Check selections", exact: true })
      .click();
    await buyer
      .getByLabel("I accept the terms and request a final quote")
      .check();
    // Persist the order but lose its response, then recover after a full reload.
    await buyer.route(
      "**/api/v1/orders",
      async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        expect(route.request().postDataJSON()).toMatchObject({
          answers: { screenshot: [expect.any(String)] },
        });
        const response = await route.fetch();
        expect(response.ok()).toBe(true);
        await expect(
          buyer.getByRole("region", { name: "Interrupted request" }),
        ).toHaveCount(0);
        await route.abort("failed");
      },
      { times: 1 },
    );
    await buyer
      .getByRole("button", { name: "Submit quote request", exact: true })
      .click();
    await expect(buyer).toHaveURL(/request=[a-f0-9-]+/);
    await expect(
      buyer.getByRole("heading", { name: "Your request was saved" }),
    ).toBeVisible();
    await buyer.reload();
    await expect(
      buyer.getByRole("heading", { name: "Your request was saved" }),
    ).toBeVisible();
    await expect(
      buyer.getByRole("heading", { name: "Your request was saved" }),
    ).toBeFocused();
    await buyer.screenshot({
      path: `.cache/di05-recovery-${info.project.name}.png`,
      fullPage: true,
    });
    await accessible(buyer);
    await buyer.getByRole("link", { name: "View your saved order" }).click();
    await expect(buyer).toHaveURL(/\/orders\/[a-f0-9-]+$/);
    const orderID = buyer.url().split("/").at(-1);
    if (!orderID) throw new Error("Missing order");
    await expect(
      buyer.getByRole("heading", {
        name: "Order journey game · submitted",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      buyer.locator('.order-steps [aria-current="step"]'),
    ).toHaveText("Request received");
    await expect(buyer.locator(".experience")).toHaveAttribute(
      "data-motion",
      "reduced",
    );
    await buyer.screenshot({
      path: `.cache/r03-order-${info.project.name}.png`,
      fullPage: true,
    });
    await accessible(buyer);
    const buyerSession = sessionSchema.parse(
      await (await buyer.request.get(authURL(buyer, "session"))).json(),
    );
    await page.goto(
      `/admin/media?customer=${buyerSession.user?.id ?? ""}&state=ready`,
    );
    await page
      .getByRole("link", { name: "View source order", exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/admin/orders/${orderID}\\?section=request`),
    );
    await secondaryCapture(page, "intake-source-order", info.project.name);
    await page
      .getByRole("link", { name: "Messages & proof", exact: true })
      .click();
    await page.getByRole("link", { name: /Back to media directory/ }).click();
    await expect(page).toHaveURL(/\/admin\/media\?.*state=ready/);
    await page.goto("/admin/orders");
    await page.getByLabel("Search game or full order ID").fill(orderID);
    await page
      .getByRole("button", { name: "Filter orders", exact: true })
      .click();
    await page.getByRole("link", { name: new RegExp(orderID) }).click();
    await page
      .getByRole("link", { name: "Request & decisions", exact: true })
      .click();
    await page
      .getByLabel("Customer-visible explanation")
      .fill("Please select duo before review.");
    await secondaryCapture(page, "request-decisions", info.project.name);
    await integratedCapture(
      page,
      `request-decisions-${info.project.name}`,
      page.getByRole("button", { name: "Request clarification", exact: true }),
    );
    await page
      .getByRole("button", { name: "Request clarification", exact: true })
      .click();
    await expect(page.locator(".record-status .status")).toHaveText(
      "needs information",
    );
    await buyer
      .getByRole("button", { name: "Refresh order", exact: true })
      .click();
    await expect(
      buyer.getByText("Please select duo before review."),
    ).toBeVisible();
    await buyer
      .getByRole("button", { name: "Revise request", exact: true })
      .click();
    await buyer.getByLabel("Play mode (required)").selectOption("duo");
    await buyer
      .getByRole("button", { name: "Check selections", exact: true })
      .click();
    await buyer
      .getByRole("button", { name: "Save revised request", exact: true })
      .click();
    await expect(
      buyer.getByRole("heading", {
        name: "Order journey game · submitted",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Refresh order", exact: true })
      .click();
    async function quote(amount: string, reason: string) {
      await page
        .getByRole("link", { name: "Quote & agreement", exact: true })
        .click();
      await page.getByLabel("Pre-discount amount in minor units").fill(amount);
      await page.getByLabel("Quote currency").selectOption("USD");
      await page
        .getByLabel("Agreed scope", { exact: true })
        .fill("Reviewed duo boost");
      await page.getByLabel("Quote explanation").fill(reason);
      await measuredInteraction(
        page,
        `admin-quote-${info.project.name}`,
        async () => {
          await page
            .getByRole("button", { name: "Preview quote", exact: true })
            .click();
          await expect(
            page.getByLabel(
              "I reviewed the customer-visible price, scope, deadline and terms",
            ),
          ).toBeVisible();
        },
      );
      await integratedCapture(
        page,
        `admin-quote-${info.project.name}`,
        page.getByLabel(
          "I reviewed the customer-visible price, scope, deadline and terms",
        ),
      );
      await page
        .getByLabel(
          "I reviewed the customer-visible price, scope, deadline and terms",
        )
        .check();
      await page
        .getByRole("button", { name: "Issue quote", exact: true })
        .click();
    }
    await quote("2000", "Initial reviewed scope");
    await expect(
      page.getByRole("heading", { name: "Current quote · revision 1" }),
    ).toBeVisible();
    await quote("2200", "Updated scope confirmed");
    await expect(
      page.getByRole("heading", { name: "Current quote · revision 2" }),
    ).toBeVisible();
    await accessible(page);
    await buyer
      .getByRole("button", { name: "Refresh order", exact: true })
      .click();
    await expect(
      buyer.getByRole("heading", { name: "Current quote · revision 2" }),
    ).toBeVisible();
    await expect(
      buyer.getByRole("button", { name: "Accept quote", exact: true }),
    ).toBeDisabled();
    await buyer.getByLabel("I accept this quote and its terms").check();
    await buyer
      .getByRole("button", { name: "Accept quote", exact: true })
      .click();
    await buyer
      .locator('[data-order-section="Accepted agreement"] > summary')
      .click();
    await expect(
      buyer.getByRole("heading", { name: "Accepted agreement", exact: true }),
    ).toBeVisible();
    await expect(
      buyer.getByRole("region", { name: "Accepted agreement" }),
    ).toContainText("USD 22.00");
    const accepted = detailSchema.parse(
      await (await buyer.request.get(`/api/v1/orders/${orderID}`)).json(),
    );
    expect(accepted.contract?.payment_state).toBe("unissued");
    expect(accepted.order.state).toBe("awaiting_payment");
    await accessible(buyer);
    await page.screenshot({
      path: `.cache/admin-order-${info.project.name}.png`,
      fullPage: true,
    });
    await buyer.screenshot({
      path: `.cache/order-${info.project.name}.png`,
      fullPage: true,
    });
    await buyer.getByText("Selections & reorder", { exact: true }).click();
    await buyer
      .getByRole("button", {
        name: "Reorder with current catalog",
        exact: true,
      })
      .click();
    await expect(buyer.getByLabel("Ordinary instructions")).toHaveValue("");
    await expect(buyer.getByLabel("Play mode (required)")).toHaveValue("duo");
    await buyer.getByText("Cancel this unpaid order", { exact: true }).click();
    await buyer
      .getByRole("button", { name: "Cancel unpaid order", exact: true })
      .click();
    await expect(
      buyer.getByRole("heading", {
        name: "Order journey game · cancelled",
        exact: true,
      }),
    ).toBeVisible();
    // Hold application scripts to reproduce a slow first load: server-rendered
    // controls must remain disabled instead of accepting choices React loses.
    let resumeScripts = () => {};
    const scriptsReady = new Promise<void>((resolve) => {
      resumeScripts = resolve;
    });
    const holdScripts = async (route: Route) => {
      await scriptsReady;
      await route.continue();
    };
    await buyer.route("**/assets/*.js", holdScripts);
    try {
      await buyer.goto(`/games/${slug}/packages/starter`, {
        waitUntil: "commit",
      });
      await expect(buyer.getByLabel("Play mode (required)")).toBeDisabled();
      await expect(
        buyer.getByRole("button", { name: "Check selections", exact: true }),
      ).toBeDisabled();
      await buyer
        .locator(".dynamic-form")
        .screenshot({ path: info.outputPath("package-preparing.png") });
    } finally {
      resumeScripts();
    }
    await expect(buyer.getByLabel("Play mode (required)")).toBeEnabled();
    await buyer.unroute("**/assets/*.js", holdScripts);
    await buyer.getByLabel("Play mode (required)").selectOption("solo");
    await expect(
      buyer.getByRole("complementary", { name: "Selection summary" }),
    ).toContainText("Solo");
    await buyer
      .locator(".dynamic-form")
      .screenshot({ path: info.outputPath("package-ready.png") });
    await buyer
      .getByRole("button", { name: "Check selections", exact: true })
      .click();
    await buyer
      .getByLabel("I accept the terms and fixed package price")
      .check();
    await buyer
      .getByRole("button", { name: "Create package order", exact: true })
      .click();
    await buyer
      .locator('[data-order-section="Accepted agreement"] > summary')
      .click();
    await expect(
      buyer.getByRole("region", { name: "Accepted agreement" }),
    ).toContainText("USD 12.34");
    await buyer.goto("/orders");
    await expect(buyer.locator(".order-list li")).toHaveCount(2);
    await expect(buyer.locator(".order-list")).toContainText(
      "Accepted total · USD 12.34",
    );
    await expect(buyer.locator(".order-list")).toContainText(
      "Check payment instructions",
    );
    await buyer.screenshot({
      path: `.cache/r03-orders-${info.project.name}.png`,
      fullPage: true,
    });
    await accessible(buyer);
    await qualifyOrderWorkspace(buyer, info.project.name);
    await buyer.goto("/favorites");
    await expect(
      buyer.getByRole("link", {
        name: "Order journey game / Rank boost",
        exact: true,
      }),
    ).toBeVisible();
    await accessible(buyer);
    await buyer
      .getByRole("button", {
        name: "Remove Order journey game / Rank boost",
        exact: true,
      })
      .click();
    await expect(buyer.getByText(/No saved offers yet/)).toBeVisible();
    await availabilityJourney(
      page,
      buyer,
      browser,
      request,
      published,
      fixture(info.project.name, "orders"),
      info.project.name,
    );
    const strangerContext = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
    });
    try {
      const stranger = await strangerContext.newPage();
      await signIn(stranger, request, fixture(info.project.name, "orderother"));
      await expect(
        stranger.getByText("Your next step, in one place.", { exact: true }),
      ).toBeVisible();
      expect(
        (await stranger.request.get(`/api/v1/orders/${orderID}`)).status(),
      ).toBe(404);
      expect(
        (
          await stranger.request.get(`/api/v1/admin/orders/${orderID}`)
        ).status(),
      ).toBe(401);
    } finally {
      await strangerContext.close();
    }
  } finally {
    await context.close();
  }
});
