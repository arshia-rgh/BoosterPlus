import { secondaryCapture } from "./secondary-capture";
import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
export async function reviewJourney(
  admin: Page,
  buyer: Page,
  orderID: string,
  slug: string,
  device: string,
) {
  await buyer.goto(`/orders/${orderID}?section=progress`);
  await expect(buyer.getByLabel("Purchase rating")).toHaveValue("");
  await buyer.getByLabel("Purchase rating").selectOption("1");
  await buyer
    .getByLabel("Purchase feedback", { exact: true })
    .fill("Communication needs improvement. This is my honest experience.");
  await buyer.getByLabel("I accept this review publication policy").check();
  await buyer
    .getByRole("button", { name: "Submit review for moderation", exact: true })
    .click();
  await expect(
    buyer.getByText("Pending moderation · 1/5", { exact: true }),
  ).toBeVisible();
  const reviewHref = await buyer
    .getByRole("link", { name: "Review revision history", exact: true })
    .getAttribute("href");
  expect(reviewHref).toBeTruthy();
  await buyer.goto(`/games/${slug}/reviews`);
  await expect(
    buyer.getByText(
      "Communication needs improvement. This is my honest experience.",
      { exact: true },
    ),
  ).toHaveCount(0);
  await admin.goto("/admin/reviews");
  await admin
    .getByRole("link", { name: /Fulfillment journey game · 1\/5/ })
    .click();
  await admin
    .getByLabel("Internal moderation explanation")
    .fill("Private review note: constructive criticism complies with policy.");
  await secondaryCapture(admin, "review-draft", device);
  await admin.getByRole("link", { name: "History", exact: true }).click();
  await secondaryCapture(admin, "review-history", device);
  await admin
    .getByRole("link", { name: "Accepted policy", exact: true })
    .click();
  await secondaryCapture(admin, "review-policy", device);
  await admin
    .getByRole("link", { name: "Overview & moderation", exact: true })
    .click();
  await admin
    .getByLabel(
      "I checked this content against its accepted publication policy",
    )
    .check();
  await admin
    .getByRole("button", { name: "Publish customer review", exact: true })
    .click();
  await expect(
    admin.getByRole("button", { name: "Hide customer review", exact: true }),
  ).toBeVisible();
  await admin
    .getByLabel("Public PLAYORA response")
    .fill("Thank you for the feedback. We will improve communication.");
  await admin
    .getByLabel(
      "I checked this content against its accepted publication policy",
    )
    .check();
  await admin
    .getByRole("button", { name: "Publish staff response", exact: true })
    .click();
  await expect(
    admin.getByText(
      "Thank you for the feedback. We will improve communication.",
      { exact: true },
    ),
  ).toBeVisible();
  expect((await new AxeBuilder({ page: admin }).analyze()).violations).toEqual(
    [],
  );
  const publicResponse = await buyer.goto(`/games/${slug}/reviews`);
  expect(publicResponse?.status()).toBe(200);
  const html = await publicResponse?.text();
  expect(html).not.toContain(orderID);
  expect(html).not.toContain("Private review note:");
  await expect(
    buyer.getByText(
      "Communication needs improvement. This is my honest experience.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    buyer.getByText(
      "Thank you for the feedback. We will improve communication.",
      { exact: true },
    ),
  ).toBeVisible();
  expect((await new AxeBuilder({ page: buyer }).analyze()).violations).toEqual(
    [],
  );
  expect(
    await buyer.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await buyer.screenshot({
    path: `test-results/reviews-${device}.png`,
    fullPage: true,
  });
  await buyer.goto("/reviews");
  await buyer
    .getByRole("link", { name: /Fulfillment journey game · 1\/5/ })
    .click();
  expect((await new AxeBuilder({ page: buyer }).analyze()).violations).toEqual(
    [],
  );
  await expect(buyer.getByText(/Private review note:/)).toHaveCount(0);
  await buyer.goto(`/orders/${orderID}?section=progress`);
  await buyer
    .getByRole("button", { name: "Edit and resubmit my review", exact: true })
    .click();
  await buyer
    .getByLabel("Purchase feedback", { exact: true })
    .fill("Updated honest feedback after the response.");
  await buyer.getByLabel("I accept this review publication policy").check();
  await buyer
    .getByRole("button", { name: "Submit review for moderation", exact: true })
    .click();
  await expect(
    buyer.getByText("Pending moderation · 1/5", { exact: true }),
  ).toBeVisible();
  await buyer
    .getByRole("button", { name: "Withdraw my review", exact: true })
    .click();
  await expect(
    buyer.getByText("Withdrawn · 1/5", { exact: true }),
  ).toBeVisible();
  await admin.goto(`/admin${reviewHref ?? "/reviews"}`);
  await expect(
    admin.getByText(
      "The customer withdrew this review. Staff cannot republish it.",
    ),
  ).toBeVisible();
  await admin.goto("/admin/media?state=ready");
  const conversation = admin
    .getByRole("link", { name: "Open authorized conversation", exact: true })
    .first();
  await expect(conversation).toBeVisible();
  await secondaryCapture(admin, "media-directory", device);
  await conversation.click();
  await expect(
    admin.getByRole("link", { name: "← Media directory", exact: true }),
  ).toBeVisible();
  await secondaryCapture(admin, "media-conversation", device);
  await admin
    .getByRole("link", { name: "← Media directory", exact: true })
    .click();
  await expect(admin).toHaveURL(/\/admin\/media\?state=ready$/);
  await buyer.goto(`/games/${slug}/reviews`);
  await expect(
    buyer.getByText("Updated honest feedback after the response.", {
      exact: true,
    }),
  ).toHaveCount(0);
}
