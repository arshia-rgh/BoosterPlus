import { availabilityJourney } from "./availability-journey";
import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
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
    await (await page.request.get("/api/v1/auth/session")).json(),
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
  await signIn(page, request, fixture(info.project.name, "orderadmin"));
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
    await signIn(buyer, request, fixture(info.project.name, "orders"));
    await expect(
      buyer.getByRole("heading", { name: "Profile", exact: true }),
    ).toBeVisible();
    await buyer.goto(`/games/${slug}/services/boost`);
    await buyer.getByLabel("Play mode (required)").selectOption("solo");
    await buyer.getByLabel("Information to preview").selectOption("order");
    await expect(buyer.getByLabel("Play mode (required)")).toHaveValue("solo");
    await buyer
      .getByLabel("Ordinary instructions")
      .fill("Keep this ordinary note on the original order only");
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
    await buyer
      .getByRole("button", { name: "Submit quote request", exact: true })
      .click();
    await expect(buyer).toHaveURL(/\/orders\/[a-f0-9-]+$/);
    const orderID = buyer.url().split("/").at(-1);
    if (!orderID) throw new Error("Missing order");
    await expect(
      buyer.getByRole("heading", {
        name: "Order journey game · submitted",
        exact: true,
      }),
    ).toBeVisible();
    await accessible(buyer);
    await page.goto("/admin/orders");
    await page.getByLabel("Search game or full order ID").fill(orderID);
    await page
      .getByRole("button", { name: "Filter orders", exact: true })
      .click();
    await page.getByRole("link", { name: new RegExp(orderID) }).click();
    await page
      .getByLabel("Customer-visible explanation")
      .fill("Please select duo before review.");
    await page
      .getByRole("button", { name: "Request clarification", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Order journey game · needs information",
        exact: true,
      }),
    ).toBeVisible();
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
      await page.getByLabel("Pre-discount amount in minor units").fill(amount);
      await page.getByLabel("Quote currency").selectOption("USD");
      await page
        .getByLabel("Agreed scope", { exact: true })
        .fill("Reviewed duo boost");
      await page.getByLabel("Quote explanation").fill(reason);
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
    await buyer
      .getByRole("button", {
        name: "Reorder with current catalog",
        exact: true,
      })
      .click();
    await expect(buyer.getByLabel("Ordinary instructions")).toHaveValue("");
    await expect(buyer.getByLabel("Play mode (required)")).toHaveValue("duo");
    await buyer
      .getByRole("button", { name: "Cancel unpaid order", exact: true })
      .click();
    await expect(
      buyer.getByRole("heading", {
        name: "Order journey game · cancelled",
        exact: true,
      }),
    ).toBeVisible();
    await buyer.goto(`/games/${slug}/packages/starter`);
    await buyer.getByLabel("Play mode (required)").selectOption("solo");
    await buyer
      .getByRole("button", { name: "Check selections", exact: true })
      .click();
    await buyer
      .getByLabel("I accept the terms and fixed package price")
      .check();
    await buyer
      .getByRole("button", { name: "Create package order", exact: true })
      .click();
    await expect(
      buyer.getByRole("region", { name: "Accepted agreement" }),
    ).toContainText("USD 12.34");
    await buyer.goto("/orders");
    await expect(buyer.locator(".order-list li")).toHaveCount(2);
    await accessible(buyer);
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
        stranger.getByRole("heading", { name: "Profile", exact: true }),
      ).toBeVisible();
      expect(
        (await stranger.request.get(`/api/v1/orders/${orderID}`)).status(),
      ).toBe(404);
      expect(
        (
          await stranger.request.get(`/api/v1/admin/orders/${orderID}`)
        ).status(),
      ).toBe(403);
    } finally {
      await strangerContext.close();
    }
  } finally {
    await context.close();
  }
});
