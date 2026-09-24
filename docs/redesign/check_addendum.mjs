/* Design fixture regression checks; no app API/provider endpoints are used. */
import {
  chromium,
  expect,
} from "../../frontend/node_modules/@playwright/test/index.mjs";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const origin = "http://127.0.0.1:4187/design/addendum.html";
const view = async (id) => {
  await page.locator("#view").selectOption(id);
  await expect(page).toHaveURL(new RegExp("#" + id));
};
try {
  await page.goto(origin);
  await view("SH02");
  await page.getByLabel("Quantity", { exact: true }).fill("2");
  await expect(page.locator(".summary")).toContainText("USD 40.00");
  await page.getByRole("button", { name: "Continue to recipient" }).click();
  await page.getByLabel("Player identifier", { exact: true }).fill("demo-42");
  await page.getByLabel("Display name", { exact: true }).fill("Demo player");
  await page.getByRole("button", { name: "Review purchase" }).click();
  await expect(page.locator(".body")).toContainText("Player ••42 · Server SEA");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create demo order" }).click();
  await expect(page.locator(".record")).toContainText("Awaiting payment");
  await view("SH02");
  await page.getByLabel("Quantity", { exact: true }).fill("3");
  await view("SH05");
  await expect(page.locator(".summary")).toContainText("USD 40.00");
  await page.locator("#state").selectOption("failed");
  await expect(page.locator(".record")).toContainText("PL-S104");
  await expect(
    page.getByRole("navigation", { name: "Order sections" }),
  ).toBeVisible();
  await page.locator("#state").selectOption("default");
  await view("SH09");
  await expect(
    page.getByRole("button", { name: "Claim order" }),
  ).toBeDisabled();
  await page.locator("#order-state").selectOption("ready");
  await page.getByRole("button", { name: "Put on hold" }).click();
  await expect(page.locator(".record")).toContainText("Verified paid");
  await page
    .getByLabel("Reason", { exact: true })
    .fill("Recipient needs checking");
  await page
    .getByLabel("Next step", { exact: true })
    .fill("Please confirm the server");
  await page.getByRole("button", { name: "Confirm update" }).click();
  await view("SH05");
  await expect(page.locator(".body")).toContainText("Recipient needs checking");
  await view("SH07");
  await page.getByRole("button", { name: "Pause demo product" }).click();
  await view("SH02");
  await expect(page.locator(".body")).toContainText("This product is paused");
  await view("NW04");
  await page
    .getByLabel("Title", { exact: true })
    .fill("An updated editorial title");
  await page.getByLabel("Type", { exact: true }).selectOption("Patch notes");
  await page
    .getByLabel("Author or source attribution", { exact: true })
    .fill("Demo editor");
  await expect(page.locator("[data-dirty]")).toContainText("Unsaved changes");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.locator("[data-dirty]")).toContainText("Saved draft");
  await view("NW05");
  await expect(page.locator(".article")).toContainText("Patch notes");
  await expect(page.locator(".article")).toContainText("Demo editor");
  await view("NW02");
  await expect(page.locator(".article")).not.toContainText(
    "An updated editorial title",
  );
  await view("NW06");
  await page
    .getByRole("button", { name: "Publish saved revision now" })
    .click();
  await view("NW01");
  await expect(page.locator(".cards")).toContainText(
    "An updated editorial title",
  );
  await page.getByLabel("Type", { exact: true }).selectOption("Patch notes");
  await expect(page.locator(".cards article")).toBeVisible();
  await view("NW04");
  await page
    .getByLabel("Body", { exact: true })
    .fill("Unpublished private working text");
  await view("NW02");
  await expect(page.locator(".article")).not.toContainText(
    "Unpublished private working text",
  );
  await view("NW06");
  await page.getByRole("button", { name: "Unpublish article" }).click();
  await view("NW02");
  await expect(page.locator(".body")).toContainText(
    "This article is unavailable",
  );
  const ids = await page
    .locator("#view option")
    .evaluateAll((xs) => xs.map((x) => x.value));
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const id of ids) {
      await view(id);
      await expect(page.locator("#preview h1")).toHaveCount(1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
  }
  expect(errors).toEqual([]);
  console.log(
    "DI00 addendum: purchase snapshot, unpaid guard, hold reasons, persistent errors, paused product, editorial revision isolation/publication, and 60 viewport/view combinations passed.",
  );
} finally {
  await browser.close();
}
