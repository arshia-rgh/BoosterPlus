import { authURL } from "./identity-fixtures";
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
import { submissionSchema } from "../../app/submissions/model";
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
async function action(page: Page, label: string, path: string) {
  const response = page.waitForResponse(
    (r) => r.request().method() === "POST" && r.url().endsWith(path),
  );
  await page.getByRole("button", { name: label, exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(
    page.getByText("Refreshing submission…", { exact: true }),
  ).toHaveCount(0);
}
test("seller drafts, clarification and review stay private and create no commercial agreement", async ({
  page,
  browser,
  request,
}, info) => {
  test.setTimeout(150000);
  await signIn(
    page,
    request,
    fixture(info.project.name, "selleradmin"),
    "/admin/login",
  );
  await enroll(page);
  const slug = `intake-${info.project.name}-${randomUUID()}`,
    config = emptyConfiguration(`Intake ${info.project.name}`),
    privateTitle = `Private synthetic ${info.project.name} account`;
  config.reviewed = true;
  config.intake = {
    name: "Ownership review",
    description: "Synthetic account intake only.",
    fields: [
      {
        ...emptyField("region"),
        key: "region",
        label: "Account region",
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
  await api(page, `/admin/catalog/games/${draft.id}/publish`, {
    revision: draft.revision,
  });
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    viewport: info.project.use.viewport ?? null,
  });
  try {
    const seller = await context.newPage();
    await signIn(seller, request, fixture(info.project.name, "seller"));
    await expect(
      seller.getByText("Your next step, in one place.", { exact: true }),
    ).toBeVisible();
    await seller.goto("/sell");
    await accessible(seller);
    await seller
      .getByRole("link", { name: "Start an account submission" })
      .click();
    await seller
      .getByRole("button", {
        name: `Submit Intake ${info.project.name} account`,
        exact: true,
      })
      .click();
    await seller.getByLabel("Private account title").fill(privateTitle);
    await accessible(seller);
    await seller.getByRole("button", { name: "Create private draft" }).click();
    await expect(seller).toHaveURL(/\/sell\/[a-f0-9-]+$/);
    const id = seller.url().split("/").at(-1);
    if (!id) throw new Error("Missing submission ID");
    await seller
      .getByRole("link", { name: "Account details", exact: true })
      .click();
    const submit = seller.getByRole("button", {
      name: "Submit saved account for review",
    });
    const submitRequests: string[] = [];
    seller.on("request", (request) => {
      if (
        request.method() === "POST" &&
        request.url().endsWith(`/submissions/${id}/submit`)
      )
        submitRequests.push(request.url());
    });
    await submit.click();
    const ownership = seller.getByLabel("Ownership and control information");
    const authority = seller.getByLabel(
      "I control this account and have authority to submit it for review",
    );
    await expect(ownership).toBeFocused();
    await expect(ownership).toBeInViewport();
    await expect(ownership).toHaveAttribute("aria-invalid", "true");
    await expect(ownership).toHaveAccessibleDescription(
      "Describe how you obtained and control the account and relevant restrictions. Do not include login or recovery information. Describe your ownership using 1–2,000 characters.",
    );
    await expect(authority).toHaveAttribute("aria-invalid", "true");
    await expect(authority).toHaveAccessibleDescription(
      "Confirm your authority to submit this account for review.",
    );
    await expect(
      seller.getByText("Describe your ownership using 1–2,000 characters.", {
        exact: true,
      }),
    ).toBeVisible();
    expect(submitRequests).toHaveLength(0);
    await ownership.fill("I created and control this synthetic account.");
    await authority.check();
    await expect(submit).toBeDisabled();
    await action(seller, "Save account draft", `/submissions/${id}/edit`);
    await expect(submit).toBeEnabled();
    const requiredRegion = seller.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().endsWith(`/submissions/${id}/submit`),
    );
    await submit.click();
    expect((await requiredRegion).status()).toBe(422);
    const region = seller.getByLabel("Account region (required)");
    await expect(region).toBeFocused();
    await expect(region).toBeInViewport();
    await expect(region).toHaveAttribute("aria-invalid", "true");
    await expect(region).toHaveAccessibleDescription("This field is required.");
    await expect(
      seller.getByRole("link", {
        name: "Account region: This field is required.",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      seller.getByText("This field is required.", { exact: true }),
    ).toBeVisible();
    expect(submitRequests).toHaveLength(1);
    await region.fill("Synthetic region");
    await expect(region).not.toHaveAttribute("aria-invalid", "true");
    await seller.screenshot({
      path: `.cache/seller-intake-${info.project.name}.png`,
      fullPage: true,
    });
    await expect(submit).toBeDisabled();
    await action(seller, "Save account draft", `/submissions/${id}/edit`);
    await expect(submit).toBeEnabled();
    await action(
      seller,
      "Submit saved account for review",
      `/submissions/${id}/submit`,
    );
    await expect(
      seller.getByRole("heading", {
        name: "Private account details",
        exact: true,
      }),
    ).toBeVisible();
    await accessible(seller);
    await page.goto("/admin/submissions");
    await page.getByRole("link", { name: privateTitle, exact: true }).click();
    await accessible(page);
    await page
      .getByLabel("Seller-visible review reason")
      .fill("Please explain account restrictions.");
    await action(
      page,
      "Request account information",
      `/admin/submissions/${id}/clarify`,
    );
    await expect(
      page.getByRole("button", { name: "Request account information" }),
    ).toHaveCount(0);
    await seller
      .getByRole("button", { name: "Refresh submission", exact: true })
      .click();
    await seller
      .getByLabel("Ownership and control information")
      .fill("Synthetic account has no restrictions.");
    await action(seller, "Save account draft", `/submissions/${id}/edit`);
    await expect(submit).toBeEnabled();
    await action(
      seller,
      "Submit saved account for review",
      `/submissions/${id}/submit`,
    );
    await expect(
      seller.getByRole("heading", {
        name: "Private account details",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Refresh submission", exact: true })
      .click();
    await page
      .getByLabel("Seller-visible review reason")
      .fill("Review complete. Commercial terms remain pending.");
    await action(
      page,
      "Approve review pending terms",
      `/admin/submissions/${id}/approve_review`,
    );
    await expect(
      page.getByRole("button", { name: "Approve review pending terms" }),
    ).toHaveCount(0);
    await seller
      .getByRole("button", { name: "Refresh submission", exact: true })
      .click();
    await expect(seller.locator(".record-status .status")).toHaveText(
      "Review approved · commercial terms pending",
    );
    const accepted = submissionSchema.parse(
      await (await seller.request.get(`/api/v1/submissions/${id}`)).json(),
    );
    expect(accepted.submission.state).toBe("approved_pending_terms");
    await accessible(seller);
    await seller.screenshot({
      path: `test-results/intake-${info.project.name}.png`,
      fullPage: true,
    });
    await seller
      .getByRole("link", { name: "Messages & evidence", exact: true })
      .click();
    await expect(seller.locator(".chat-title")).toContainText(
      "Private seller review · Needs staff reply",
    );
    await accessible(seller);
    await seller.goto(`/sell/${id}`);
    await seller.getByText("Submission options", { exact: true }).click();
    await seller
      .getByRole("button", { name: "Withdraw account submission", exact: true })
      .click();
    await expect(
      seller.getByRole("button", { name: "Confirm account withdrawal" }),
    ).toBeVisible();
    await action(
      seller,
      "Confirm account withdrawal",
      `/submissions/${id}/withdraw`,
    );
    await expect(
      seller.getByRole("button", { name: "Withdraw account submission" }),
    ).toHaveCount(0);
    const strangerContext = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
    });
    try {
      const stranger = await strangerContext.newPage();
      await signIn(
        stranger,
        request,
        fixture(info.project.name, "sellerother"),
      );
      await expect(
        stranger.getByText("Your next step, in one place.", { exact: true }),
      ).toBeVisible();
      expect(
        (await stranger.request.get(`/api/v1/submissions/${id}`)).status(),
      ).toBe(404);
      expect(
        (
          await stranger.request.get(`/api/v1/admin/submissions/${id}`)
        ).status(),
      ).toBe(401);
      expect(
        (
          await stranger.request.get(
            `/api/v1/conversations/${accepted.conversation_id}`,
          )
        ).status(),
      ).toBe(404);
    } finally {
      await strangerContext.close();
    }
  } finally {
    await context.close();
  }
});
