import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fixture } from "./identity-fixtures";

export async function qualifyChat(buyer: Page, staff: Page, project: string) {
  const id = fixture(project, "chat_history");
  await buyer.goto("/support/" + id);
  const rows = buyer.locator(".message-list > .message");
  const history = buyer.getByRole("region", { name: "Conversation messages" });
  await expect(rows).toHaveCount(50);
  await expect(rows.first()).toHaveAttribute("data-sequence", "71");
  await expect(
    buyer.getByText("Internal history fixture: staff only"),
  ).toHaveCount(0);
  await history.evaluate((element) => {
    element.scrollTop = 0;
  });
  const bubble = buyer.locator('[data-sequence="71"] .message-bubble');
  const offset = () =>
    bubble.evaluate(
      (element) =>
        element.getBoundingClientRect().top -
        (element.closest(".chat-history")?.getBoundingClientRect().top ?? 0),
    );
  const before = await offset();
  await buyer
    .getByRole("button", { name: "Earlier messages", exact: true })
    .click();
  await expect(rows).toHaveCount(100);
  await expect
    .poll(async () => Math.abs((await offset()) - before))
    .toBeLessThan(4);
  await buyer
    .locator('[data-sequence="80"] .message-bubble')
    .scrollIntoViewIfNeeded();
  const reading = await history.evaluate((element) => element.scrollTop);
  // A transient outage hides history but retains its reading anchor and draft.
  await buyer.route(`**/api/v1/conversations/${id}`, (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ code: "unavailable" }),
    }),
  );
  await buyer
    .getByRole("button", { name: "Refresh conversation", exact: true })
    .click();
  await expect(
    buyer.getByText(/Messages are hidden while access is checked/),
  ).toBeVisible();
  await staff.goto("/admin/support/" + id);
  const draft = staff.getByLabel("Message", { exact: true });
  await draft.fill("Customer reply draft");
  await staff.getByLabel("Message audience").selectOption("internal");
  await staff
    .getByLabel("Internal note", { exact: true })
    .fill("Separate staff-only draft");
  await staff.getByLabel("Message audience").selectOption("public");
  await expect(draft).toHaveValue("Customer reply draft");
  await draft.fill("New arrival while you read older history");
  await staff
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await buyer.unroute(`**/api/v1/conversations/${id}`);
  await buyer
    .getByRole("button", { name: "Refresh conversation", exact: true })
    .click();
  await expect(rows).toHaveCount(101);
  await expect
    .poll(async () =>
      Math.abs(
        (await history.evaluate((element) => element.scrollTop)) - reading,
      ),
    )
    .toBeLessThan(4);
  await expect(
    buyer.getByRole("button", { name: /New messages/ }),
  ).toBeVisible();
  await expect
    .poll(async () =>
      Math.abs(
        (await history.evaluate((element) => element.scrollTop)) - reading,
      ),
    )
    .toBeLessThan(4);
  await buyer.getByRole("button", { name: /New messages/ }).click();
  await expect(rows.last()).toContainText(
    "New arrival while you read older history",
  );
  await history.focus();
  const bottom = await history.evaluate((element) => element.scrollTop);
  await history.press("PageUp");
  await expect
    .poll(() => history.evaluate((element) => element.scrollTop))
    .toBeLessThan(bottom);
  const input = buyer.getByLabel("Message", { exact: true });
  await input.fill("Retry this exact message after the response is lost");
  let original: string | null = null;
  await buyer.route(
    `**/api/v1/conversations/${id}/messages`,
    async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      original = route.request().postData();
      await route.fetch();
      await route.abort();
    },
    { times: 1 },
  );
  await buyer
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  const retry = buyer.getByRole("button", {
    name: "Retry same message",
    exact: true,
  });
  await expect(retry).toBeVisible();
  await expect(input).toBeDisabled();
  const response = buyer.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      request.url().endsWith(`/conversations/${id}/messages`),
  );
  await retry.click();
  expect((await response).postData()).toBe(original);
  await expect(input).toHaveValue("");
  await expect(
    rows.filter({
      hasText: "Retry this exact message after the response is lost",
    }),
  ).toHaveCount(1);
  await buyer
    .getByRole("button", { name: "Refresh conversation", exact: true })
    .click();
  await expect(
    rows.filter({
      hasText: "Retry this exact message after the response is lost",
    }),
  ).toHaveCount(1);
  await buyer
    .getByRole("button", { name: "Attach image", exact: true })
    .click();
  await buyer
    .getByRole("button", { name: "Close attachments", exact: true })
    .press("Escape");
  await expect(
    buyer.getByRole("button", { name: "Attach image", exact: true }),
  ).toBeFocused();
  await expect(buyer.getByLabel("Choose image")).toBeHidden();
  await staff.getByLabel("Message audience").selectOption("internal");
  await expect(staff.getByLabel("Internal note", { exact: true })).toHaveValue(
    "Separate staff-only draft",
  );
  await expect(
    buyer.getByText("Separate staff-only draft", { exact: true }),
  ).toHaveCount(0);
  for (const [name, page] of [
    ["customer", buyer],
    ["staff", staff],
  ] as const) {
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.cache/ux03-chat-${name}-${project}.png`,
      fullPage: true,
    });
  }
  // Client navigation restores the reading position but never the text draft.
  const readingBubble = buyer.locator('[data-sequence="80"] .message-bubble');
  await readingBubble.scrollIntoViewIfNeeded();
  const readingOffset = () =>
    readingBubble.evaluate(
      (element) =>
        element.getBoundingClientRect().top -
        (element.closest(".chat-history")?.getBoundingClientRect().top ?? 0),
    );
  const returnOffset = await readingOffset();
  await buyer.getByRole("link", { name: "← Inbox", exact: true }).click();
  await buyer.getByLabel("Conversation status").selectOption("open");
  await buyer
    .locator(".chat-inbox-list")
    .getByRole("link", { name: /A longer conversation/ })
    .click();
  await expect(readingBubble).toHaveCount(1);
  await expect
    .poll(async () => Math.abs((await readingOffset()) - returnOffset))
    .toBeLessThan(4);
  await buyer.getByRole("link", { name: "← Inbox", exact: true }).click();
  await expect(buyer.getByLabel("Conversation status")).toHaveValue("open");
  await buyer
    .locator(".chat-inbox-list")
    .getByRole("link", { name: /A longer conversation/ })
    .click();
  await expect(input).toBeEnabled();
  const viewport = buyer.viewportSize();
  for (const width of [320, 390, 768, 1440]) {
    await buyer.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        buyer.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      )
      .toBe(true);
  }
  await buyer.setViewportSize({ width: 390, height: 430 });
  await input.fill("Draft while the keyboard reduces available space");
  await expect
    .poll(() =>
      buyer
        .getByRole("button", { name: "Send message", exact: true })
        .evaluate(
          (element) =>
            element.getBoundingClientRect().bottom <=
            (window.visualViewport?.height ?? innerHeight),
        ),
    )
    .toBe(true);
  await expect
    .poll(() => history.evaluate((element) => element.clientHeight))
    .toBeGreaterThan(35);
  if (viewport) await buyer.setViewportSize(viewport);
  await buyer.getByRole("link", { name: "← Inbox", exact: true }).click();
  await buyer
    .locator(".chat-inbox-list")
    .getByRole("link", { name: /A longer conversation/ })
    .click();
  await expect(input).toHaveValue("");
  // A failed authorization recheck must remove the history and memory-only draft.
  await input.fill("Private draft before revoked access");
  await buyer.bringToFront();
  await buyer.route(`**/api/v1/conversations/${id}`, (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ code: "permission_denied" }),
    }),
  );
  // The visible-page authorization poll can remove the refresh button before a
  // manual click completes. Wait for that required ten-second recheck directly.
  await expect(
    buyer.getByText("Conversation access is unavailable."),
  ).toBeVisible({ timeout: 15000 });
  await expect(rows).toHaveCount(0);
  await expect(input).toHaveCount(0);
}
