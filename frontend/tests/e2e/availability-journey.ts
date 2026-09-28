import { secondaryCapture } from "./secondary-capture";
import { authURL } from "./identity-fixtures";
import {
  expect,
  type Page,
  type Browser,
  type APIRequestContext,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { z } from "zod";
import { draftSchema, type Draft } from "../../app/catalog/model";
import { sessionSchema } from "../../app/identity/api";
import { listingSchema } from "../../app/availability/model";
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
export async function availabilityJourney(
  admin: Page,
  buyer: Page,
  browser: Browser,
  request: APIRequestContext,
  initial: Draft,
  email: string,
  device: string,
) {
  let draft = initial;
  async function capacity(value: number) {
    const config = structuredClone(draft.configuration);
    const variant = config.packages[0]?.variants[0];
    if (!variant) throw new Error("Missing synthetic variant");
    variant.capacity = value;
    draft = draftSchema.parse(
      await api(admin, `/admin/catalog/games/${draft.id}/save`, {
        revision: draft.revision,
        configuration: config,
      }),
    );
    draft = draftSchema.parse(
      await api(admin, `/admin/catalog/games/${draft.id}/publish`, {
        revision: draft.revision,
      }),
    );
  }
  await capacity(0);
  await buyer.goto(`/games/${draft.slug}/packages/starter?variant=standard`);
  const subscribe = buyer.getByRole("button", {
    name: "Enable availability emails",
  });
  await expect(subscribe).toBeDisabled();
  await buyer
    .getByLabel(/Email me when this variant becomes available again/)
    .check();
  await subscribe.click();
  await expect(buyer.getByText("Availability alerts enabled.")).toBeVisible();
  await buyer.goto("/availability");
  await expect(buyer.getByText("Emails: active")).toBeVisible();
  expect((await new AxeBuilder({ page: buyer }).analyze()).violations).toEqual(
    [],
  );
  const listing = listingSchema.parse(
    await (await buyer.request.get("/api/v1/availability")).json(),
  );
  const subscription = listing.subscriptions[0];
  if (!subscription) throw new Error("Missing subscription");
  await capacity(3);
  let link = "";
  await expect
    .poll(
      async () => {
        const response = await request.get(
          "http://127.0.0.1:8025/api/v1/search",
          {
            params: {
              query:
                "to:" +
                email +
                ' subject:"An offer you follow has availability"',
            },
          },
        );
        const list = z
          .object({ messages: z.array(z.object({ ID: z.string() })) })
          .parse(await response.json());
        for (const item of list.messages) {
          const detail = z
            .object({ Text: z.string() })
            .parse(
              await (
                await request.get(
                  "http://127.0.0.1:8025/api/v1/message/" + item.ID,
                )
              ).json(),
            );
          const candidate = detail.Text.split("\n").find((line) =>
            line.includes(`/availability/unsubscribe#${subscription.id}/`),
          );
          if (candidate) {
            link = candidate.trim();
            break;
          }
        }
        return link;
      },
      { timeout: 20000 },
    )
    .toContain("/availability/unsubscribe#");
  const anonymous = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    viewport:
      device === "mobile"
        ? { width: 390, height: 844 }
        : { width: 1280, height: 800 },
  });
  try {
    const page = await anonymous.newPage();
    let rejectInspection = true;
    await page.route("**/api/v1/availability-link/inspect", async (route) => {
      if (rejectInspection) {
        rejectInspection = false;
        await route.fulfill({
          status: 503,
          contentType: "application/problem+json",
          body: JSON.stringify({
            title: "Temporarily unavailable",
            status: 503,
          }),
        });
      } else await route.continue();
    });
    await page.goto(link);
    await expect(
      page.getByRole("button", { name: "Retry link check", exact: true }),
    ).toBeVisible();
    await secondaryCapture(page, "unsubscribe-retry", device);
    await page
      .getByRole("button", { name: "Retry link check", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Stop these availability emails" }),
    ).toBeVisible();
    expect((await page.request.get("/api/v1/me")).status()).toBe(401);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page
      .getByRole("button", { name: "Stop these availability emails" })
      .click();
    await expect(page.getByRole("status")).toContainText("emails are stopped");
    await page.screenshot({
      path: `test-results/availability-unsubscribe-${device}.png`,
      fullPage: true,
    });
    await page.reload();
    await expect(page.getByText(/link is no longer current/)).toBeVisible();
  } finally {
    await anonymous.close();
  }
  await buyer.reload();
  await expect(buyer.getByText("Emails: unsubscribed")).toBeVisible();
  await buyer
    .getByLabel(/Email me when this variant becomes available again/)
    .check();
  await buyer.getByRole("button", { name: /Reactivate emails for/ }).click();
  await expect(buyer.getByText("Emails: active")).toBeVisible();
  const customer = sessionSchema.parse(
    await (await buyer.request.get(authURL(buyer, "session"))).json(),
  );
  await admin.goto(
    `/admin/alerts?customer=${encodeURIComponent(customer.user?.id ?? "")}&state=active`,
  );
  await expect(
    admin.getByText("Latest delivery:", { exact: false }),
  ).toBeVisible();
  await secondaryCapture(admin, "alert-consent", device);
  await admin
    .getByLabel("Stop future deliveries for this subscription")
    .check();
  await admin
    .getByRole("button", { name: "Suppress availability emails", exact: true })
    .click();
  await expect(admin.getByText("No matching subscriptions.")).toBeVisible();
  await admin
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("suppressed");
  await admin
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(admin.getByText(/· suppressed · consent/)).toBeVisible();
  await secondaryCapture(admin, "alert-suppressed", device);
  await buyer.screenshot({
    path: `test-results/availability-management-${device}.png`,
    fullPage: true,
  });
  expect(
    await buyer.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page: buyer }).analyze()).violations).toEqual(
    [],
  );
}
