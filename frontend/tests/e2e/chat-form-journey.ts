import { expect, type Page } from "@playwright/test";

/** Real chat UI; only isolated fixture accounts/credentials may call this helper. */
export async function requestAccessForm(
  admin: Page,
  recipient: Page,
  purpose: "seller_access" | "game_access",
  customerPath: string,
  value: string,
) {
  await admin.getByRole("button", { name: /Send a form/ }).click();
  await admin.getByLabel("Purpose", { exact: true }).selectOption(purpose);
  if (purpose === "game_access")
    await admin
      .getByLabel("Also allow the currently assigned booster to view answers")
      .check();
  await admin
    .getByRole("button", { name: "Preview form", exact: true })
    .click();
  await admin.getByRole("button", { name: "Send form", exact: true }).click();
  await expect(admin.getByRole("dialog", { name: "Send a form" })).toHaveCount(
    0,
  );
  await recipient.goto(customerPath);
  await recipient
    .getByRole("button", { name: "Complete form", exact: true })
    .last()
    .click();
  await recipient
    .getByLabel(/Login \/ account ID/)
    .fill("synthetic-fixture-login");
  await recipient.getByLabel(/Password \/ access details/).fill(value);
  await recipient
    .getByRole("button", { name: "Send response", exact: true })
    .click();
  await expect(
    recipient.getByText("Response sent. Continue the conversation below."),
  ).toBeVisible();
  await recipient.getByRole("button", { name: "Close form" }).click();
}

export async function sendBuyerAccess(admin: Page, value: string) {
  await admin.getByRole("button", { name: /Send a form/ }).click();
  await admin
    .getByLabel("Purpose", { exact: true })
    .selectOption("buyer_access");
  await admin.getByLabel(/Login \/ account ID/).fill("synthetic-buyer-login");
  await admin.getByLabel(/Password \/ access details/).fill(value);
  await admin
    .getByRole("button", { name: "Preview form", exact: true })
    .click();
  await admin.getByRole("button", { name: "Send form", exact: true }).click();
  await expect(admin.getByRole("dialog", { name: "Send a form" })).toHaveCount(
    0,
  );
}
