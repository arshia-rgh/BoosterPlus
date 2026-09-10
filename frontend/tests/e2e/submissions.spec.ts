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
  await signIn(page, request, fixture(info.project.name, "selleradmin"));
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
      seller.getByRole("heading", { name: "Profile", exact: true }),
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
    const submit = seller.getByRole("button", {
      name: "Submit saved account for review",
    });
    await submit.click();
    await expect(
      seller.getByText("region: This field is required.", { exact: true }),
    ).toBeVisible();
    await seller
      .getByLabel("Account region (required)")
      .fill("Synthetic region");
    await seller
      .getByLabel("Ownership and control information")
      .fill("I created and control this synthetic account.");
    await seller
      .getByLabel(
        "I control this account and have authority to submit it for review",
      )
      .check();
    await expect(submit).toBeDisabled();
    await action(seller, "Save account draft", `/submissions/${id}/edit`);
    await expect(submit).toBeEnabled();
    await action(
      seller,
      "Submit saved account for review",
      `/submissions/${id}/submit`,
    );
    await expect(
      seller.getByRole("heading", { name: "Submitted account information" }),
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
      seller.getByRole("heading", { name: "Submitted account information" }),
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
    await expect(
      seller.getByText(
        /Intake .* · Review approved · commercial terms pending/,
      ),
    ).toBeVisible();
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
      .getByRole("link", { name: "Open private review conversation" })
      .click();
    await expect(
      seller.getByText(/Private seller review · open/),
    ).toBeVisible();
    await accessible(seller);
    await seller.goto(`/sell/${id}`);
    await action(
      seller,
      "Withdraw account submission",
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
        stranger.getByRole("heading", { name: "Profile", exact: true }),
      ).toBeVisible();
      expect(
        (await stranger.request.get(`/api/v1/submissions/${id}`)).status(),
      ).toBe(404);
      expect(
        (
          await stranger.request.get(`/api/v1/admin/submissions/${id}`)
        ).status(),
      ).toBe(403);
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
