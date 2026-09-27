import { authURL } from "./identity-fixtures";
import { createHmac, randomUUID } from "node:crypto";
import {
  expect,
  type Page,
  type Browser,
  type APIRequestContext,
  type TestInfo,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn, fixture } from "./identity-fixtures";
import { sessionSchema } from "../../app/identity/api";
import {
  draftSchema,
  emptyConfiguration,
  emptyField,
} from "../../app/catalog/model";
import { submissionSchema } from "../../app/submissions/model";
import { settingsSchema } from "../../app/payments/model";
import { listingSchema, publicListingSchema } from "../../app/resale/model";
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
  expect(response.ok(), `${path}: ${String(response.status())}`).toBe(true);
  return response.json() as Promise<unknown>;
}
async function accessible(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
export async function resaleJourney(
  page: Page,
  browser: Browser,
  request: APIRequestContext,
  info: TestInfo,
) {
  const policy = settingsSchema.parse(
    await (await page.request.get("/api/v1/admin/finance/policy")).json(),
  );
  if (!policy.published)
    throw new Error(
      "The preceding payment journey must publish the synthetic merchant policy",
    );
  const config = emptyConfiguration(`Resale ${info.project.name}`),
    slug = `resale-${info.project.name}-${randomUUID()}`;
  config.reviewed = true;
  config.review_policy = {
    content:
      "Synthetic review policy permits critical feedback and excludes private data, spam and abuse.",
    fields: [],
    rules: [],
  };
  config.intake = {
    name: "Synthetic account review",
    description: "Synthetic private ownership review",
    fields: [
      {
        ...emptyField("region"),
        key: "region",
        label: "Region",
        stage: "order",
        type: "short_text",
        max_length: 80,
        required: true,
      },
    ],
    rules: [],
  };
  const draft = draftSchema.parse(
    await api(page, "/admin/catalog/games", { slug, configuration: config }),
  );
  const published = draftSchema.parse(
    await api(page, `/admin/catalog/games/${draft.id}/publish`, {
      revision: draft.revision,
    }),
  );
  const sellerContext = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
      viewport: info.project.use.viewport ?? null,
    }),
    buyerContext = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
      viewport: info.project.use.viewport ?? null,
    });
  try {
    const seller = await sellerContext.newPage(),
      buyer = await buyerContext.newPage();
    await signIn(seller, request, fixture(info.project.name, "resaleseller"));
    await signIn(buyer, request, fixture(info.project.name, "resalebuyer"));
    let submission = submissionSchema.parse(
      await api(seller, "/submissions", {
        request_key: randomUUID(),
        slug,
        release_id: published.current_release,
        title: "Synthetic seller private ownership",
      }),
    );
    const id = submission.submission.id;
    submission = submissionSchema.parse(
      await api(seller, `/submissions/${id}/edit`, {
        version: submission.submission.version,
        title: submission.submission.title,
        answers: { region: "Synthetic region" },
        ownership_notes: "I created and control this synthetic account.",
        ownership_declared: true,
      }),
    );
    submission = submissionSchema.parse(
      await api(seller, `/submissions/${id}/submit`, {
        version: submission.submission.version,
        note: "",
      }),
    );
    await api(page, `/admin/submissions/${id}/approve_review`, {
      version: submission.submission.version,
      note: "Synthetic independent ownership review completed.",
    });
    await page.goto(`/admin/submissions/${id}`);
    await page
      .getByLabel("Seller payment arrangement")
      .selectOption("consignment");
    await page.getByLabel("Seller payout asset code").fill("usdttrc20");
    await page.getByLabel("Seller payout network", { exact: true }).fill("trx");
    await page.getByLabel("Exact net seller crypto amount").fill("10.00000001");
    for (const label of [
      "Seller proceeds basis",
      "Fees and deductions",
      "Seller ownership requirements",
      "Seller dispute terms",
      "Seller withdrawal terms",
    ])
      await page
        .getByLabel(label, { exact: true })
        .fill(
          `Synthetic explicit ${label.toLowerCase()} accepted for browser qualification.`,
        );
    await page.getByLabel("Payout deadline hours after eligibility").fill("72");
    await page
      .getByLabel("Seller offer expires")
      .fill(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
    await page
      .getByRole("button", { name: "Propose exact seller terms" })
      .click();
    await expect(
      page.getByText("Offer: offered", { exact: true }),
    ).toBeVisible();
    await accessible(page);
    await seller.goto(`/sell/${id}`);
    await seller.screenshot({
      path: `.cache/seller-offer-${info.project.name}.png`,
      fullPage: true,
    });
    await seller
      .getByLabel("Seller agreement decision note")
      .fill("I accept the exact synthetic agreement and timing.");
    await seller
      .getByLabel("I confirm these exact terms and this decision")
      .check();
    // Acceptance is followed by an authoritative read. Wait for that read,
    // then assert the rendered result; a five-second DOM wait can end mid-fetch.
    const [refreshedOffers] = await Promise.all([
      seller.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          new URL(response.url()).pathname ===
            `/api/v1/submissions/${id}/offers`,
      ),
      seller.getByRole("button", { name: "Accept seller agreement" }).click(),
    ]);
    expect(refreshedOffers.ok()).toBe(true);

    await expect(
      seller.getByText("Offer: accepted", { exact: true }),
    ).toBeVisible();
    await seller
      .getByLabel("Protected transfer details")
      .fill("synthetic seller-origin ownership bundle");
    await seller
      .getByLabel("Protected details expiry")
      .fill(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16));
    await seller
      .getByRole("button", { name: "Store protected transfer" })
      .click();
    await expect(seller.getByLabel("Protected transfer details")).toHaveValue(
      "",
    );
    await page.reload();
    await page
      .getByRole("button", { name: "Reveal protected details" })
      .click();
    await expect(
      page.getByText("synthetic seller-origin ownership bundle", {
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Hide protected details" }).click();
    await page
      .getByLabel("Seller agreement decision note")
      .fill("Verified synthetic ownership control independently.");
    await page
      .getByLabel("I confirm these exact terms and this decision")
      .check();
    await page
      .getByRole("button", { name: "Verify ownership control" })
      .click();
    await page.getByRole("button", { name: "Open inventory listing" }).click();
    await expect(page).toHaveURL(/\/admin\/accounts\/[a-f0-9-]+$/);
    const title = `Reviewed account ${info.project.name}`;
    for (const [label, value] of [
      ["Public account title", title],
      [
        "Public account description",
        "Synthetic public account with reviewed ownership and clean private handoff.",
      ],
      ["Public region", "Synthetic region"],
      ["Public rank", "Mythic"],
      ["Price currency", "USD"],
      ["Exact price in minor units", "1234"],
    ] as const)
      await page.getByLabel(label, { exact: true }).fill(value);
    for (const label of [
      "Buyer sale terms",
      "Buyer transfer requirements",
      "Buyer dispute terms",
      "Buyer acknowledgement terms",
    ])
      await page
        .getByLabel(label, { exact: true })
        .fill(
          `Synthetic explicit ${label.toLowerCase()} displayed for this account.`,
        );
    await page.getByLabel("Buyer dispute window hours").fill("48");
    await page.getByLabel("Earliest delivery hours").fill("1");
    await page.getByLabel("Latest delivery hours").fill("24");
    await page
      .getByLabel(
        "I reviewed every public field and selected image, with permission to publish, and removed private information",
      )
      .check();
    const publication = page.waitForResponse(
      (r) => r.request().method() === "POST" && r.url().endsWith("/publish"),
    );
    await page.getByRole("button", { name: "Publish account listing" }).click();
    const item = listingSchema.parse(await (await publication).json());
    await expect(
      page.getByText("Inventory state: published", { exact: true }),
    ).toBeVisible();
    await accessible(page);
    await buyer.goto("/accounts");
    const filterTrigger = buyer.getByRole("button", {
      name: "Filter accounts",
      exact: true,
    });
    if (info.project.name === "mobile") {
      await filterTrigger.click();
      await expect(
        buyer.getByRole("dialog", { name: "Account filters" }),
      ).toBeVisible();
      await buyer.keyboard.press("Escape");
      await expect(filterTrigger).toBeFocused();
      await filterTrigger.click();
    }
    await buyer.getByLabel("Search accounts", { exact: true }).fill(title);
    await buyer.getByRole("button", { name: "Apply account filters" }).click();
    await expect(buyer).toHaveURL(/search=/);
    await expect(
      buyer.getByRole("link", { name: title, exact: true }),
    ).toBeVisible();
    await expect(
      buyer.getByRole("region", { name: "Applied account filters" }),
    ).toContainText(title);
    await expect(buyer.locator(".market-result-count")).toBeFocused();
    await buyer.screenshot({
      path: `.cache/marketplace-${info.project.name}.png`,
      fullPage: true,
    });
    await accessible(buyer);
    await buyer.getByRole("link", { name: title, exact: true }).click();
    await buyer.getByRole("link", { name: "← Account marketplace" }).click();
    if (info.project.name === "mobile") await filterTrigger.click();
    await expect(
      buyer.getByLabel("Search accounts", { exact: true }),
    ).toHaveValue(title);
    if (info.project.name === "mobile")
      await buyer
        .getByRole("button", { name: "Close filters", exact: true })
        .click();
    await buyer.getByRole("link", { name: title, exact: true }).click();
    // Isolated reviewed-image responses qualify the native gallery without uploading private evidence.
    const listingURL = `**/api/v1/accounts/${item.id}`;
    await buyer.route(listingURL, async (route) => {
      const response = await route.fetch();
      const listing = publicListingSchema.parse(await response.json());
      await route.fulfill({
        response,
        json: {
          ...listing,
          images: [0, 1].map(
            (index) =>
              `/api/v1/accounts/${item.id}/images/${String(index)}?release=${listing.release_id}`,
          ),
        },
      });
    });
    await buyer.route(
      `**/api/v1/accounts/${item.id}/images/*?release=*`,
      async (route) => {
        await route.fulfill({
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480"><rect width="720" height="480" fill="#153c29"/><text x="90" y="240" fill="#d5edda" font-size="32">Synthetic reviewed screenshot</text></svg>',
        });
      },
    );
    await buyer.reload();
    await buyer.getByRole("button", { name: "View screenshot 2" }).click();
    await expect(
      buyer.getByText("Reviewed screenshot 2 of 2", { exact: true }),
    ).toBeVisible();
    await buyer.getByRole("button", { name: "Enlarge screenshot" }).click();
    await expect(
      buyer.getByRole("dialog", { name: "Enlarged account screenshot" }),
    ).toBeVisible();
    await accessible(buyer);
    await buyer.keyboard.press("Escape");
    await expect(
      buyer.getByRole("button", { name: "Enlarge screenshot" }),
    ).toBeFocused();
    await buyer
      .getByRole("button", { name: "Save to favorites", exact: true })
      .click();
    await expect(
      buyer.getByText("Saved to favorites", { exact: true }),
    ).toBeVisible();
    await buyer
      .getByText("Availability notifications", { exact: true })
      .click();
    await buyer
      .getByLabel(
        "Email me about matching account availability. I can unsubscribe at any time.",
      )
      .check();
    await buyer
      .getByRole("button", { name: "Save account alert", exact: true })
      .click();
    await expect(buyer.getByText(/Account alert saved/)).toBeVisible();
    await buyer.screenshot({
      path: `.cache/account-product-${info.project.name}.png`,
      fullPage: true,
    });
    await accessible(buyer);
    await expect(
      buyer.getByText("synthetic seller-origin ownership bundle"),
    ).toHaveCount(0);
    await buyer
      .getByLabel(
        "I accept this account's price, sale, transfer, dispute and acknowledgement terms and the site terms",
      )
      .check();
    await buyer
      .getByRole("button", { name: "Reserve and continue to payment" })
      .click();
    await expect(buyer).toHaveURL(/\/orders\/[a-f0-9-]+$/);
    const order = buyer.url().split("/").at(-1);
    if (!order) throw new Error("Missing account order");
    await buyer
      .getByRole("navigation", { name: "Order sections" })
      .getByRole("link", { name: "Payment", exact: true })
      .click();
    await buyer
      .getByLabel("Payment asset and network")
      .selectOption("usdttrc20");
    await buyer
      .getByLabel("I accept this payment policy and the agreed order price")
      .check();
    await buyer.getByRole("button", { name: "Create secure checkout" }).click();
    const instructions = buyer.getByRole("region", {
      name: "Provider deposit instructions",
    });
    await expect(
      instructions.getByRole("heading", {
        name: "Send your payment",
        exact: true,
      }),
    ).toBeVisible({ timeout: 20000 });
    const paymentID = await instructions.locator("p code").first().innerText();
    if (!/^[1-9][0-9]*$/.test(paymentID))
      throw new Error("Missing payment reference");
    const body = JSON.stringify({
        payment_id: paymentID,
        payment_status: "finished",
      }),
      signature = createHmac("sha512", "synthetic-payment-ipn-secret-for-tests")
        .update(body)
        .digest("hex");
    expect(
      (
        await request.post("/api/v1/webhooks/payments/nowpayments", {
          data: body,
          headers: {
            "Content-Type": "application/json",
            "X-Nowpayments-Sig": signature,
          },
        })
      ).status(),
    ).toBe(204);
    await expect(
      buyer.getByRole("heading", { name: /^Payment verified/ }),
    ).toBeVisible({ timeout: 25000 });
    await buyer
      .getByRole("navigation", { name: "Order sections" })
      .getByRole("link", { name: "Delivery", exact: true })
      .click();
    await page.goto(`/admin/orders/${order}?section=fulfillment`);
    await page
      .getByLabel("Protected transfer details")
      .fill("synthetic distinct buyer ownership bundle");
    await page
      .getByLabel("Protected details expiry")
      .fill(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16));
    const stored = page.waitForResponse(
      (r) => r.request().method() === "POST" && r.url().endsWith("/secret"),
    );
    await page
      .getByRole("button", { name: "Store protected transfer" })
      .click();
    expect((await stored).status()).toBe(200);
    await page
      .getByLabel("Buyer ownership checklist")
      .fill(
        "Change ownership settings and verify your access using this checklist.",
      );
    await page
      .getByLabel("I verified the buyer bundle and ownership checklist")
      .check();
    await page.getByRole("button", { name: "Deliver account access" }).click();
    await expect(
      page.getByText("Handoff: delivered", { exact: true }),
    ).toBeVisible();
    await buyer
      .getByRole("button", { name: "Refresh account delivery" })
      .click();
    await buyer
      .getByRole("button", { name: "Reveal protected details" })
      .click();
    await expect(
      buyer.getByText("synthetic distinct buyer ownership bundle", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      buyer.getByText("synthetic seller-origin ownership bundle"),
    ).toHaveCount(0);
    await buyer.getByRole("button", { name: "Hide protected details" }).click();
    await buyer
      .getByLabel("Your acknowledgement note")
      .fill("I received and tested ownership using the agreed checklist.");
    await buyer
      .getByLabel(
        "I received and tested account access and accept the acknowledgement terms",
      )
      .check();
    await buyer
      .getByRole("button", { name: "Acknowledge account received" })
      .click();
    await expect(
      buyer.getByText("Handoff: acknowledged", { exact: true }),
    ).toBeVisible();
    await buyer.reload();
    await buyer.getByLabel("Purchase rating").selectOption("1");
    await buyer
      .getByLabel("Purchase feedback")
      .fill("Synthetic account delivery could be clearer.");
    await buyer.getByLabel("I accept this review publication policy").check();
    await buyer
      .getByRole("button", {
        name: "Submit review for moderation",
        exact: true,
      })
      .click();
    await expect(
      buyer.getByText("Pending moderation · 1/5", { exact: true }),
    ).toBeVisible();
    await accessible(buyer);
    await seller.goto(`/accounts/${item.id}`);
    await expect(
      seller.getByRole("button", { name: "Reserve and continue to payment" }),
    ).toHaveCount(0);
    expect(
      (
        await seller.request.post(
          `/api/v1/account-orders/${order}/secret/reveal`,
          {
            data: {},
            headers: {
              Origin: "http://127.0.0.1:4173",
              "X-CSRF-Token": sessionSchema.parse(
                await (await seller.request.get("/api/v1/auth/session")).json(),
              ).csrf_token,
            },
          },
        )
      ).status(),
    ).toBe(404);
    await page.goto("/admin/finance?view=payouts");
    await expect(
      page.getByRole("heading", { name: "Seller payout obligations" }),
    ).toBeVisible();
    await accessible(page);
  } finally {
    await sellerContext.close();
    await buyerContext.close();
  }
}
