import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { z } from "zod";
import { fixture, signIn, enroll } from "./identity-fixtures";
import { messagesSchema } from "../../app/support/model";
async function accessible(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}
test("private pre-sales replies recover across reconnects and keep staff notes private", async ({
  page,
  browser,
  request,
}, info) => {
  test.setTimeout(120000);
  await signIn(page, request, fixture(info.project.name, "supportadmin"));
  await enroll(page);
  const context = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
      viewport: info.project.use.viewport ?? null,
    }),
    buyer = await context.newPage(),
    subject = "Pre-sales " + info.project.name;
  try {
    await signIn(buyer, request, fixture(info.project.name, "supportbuyer"));
    await expect(
      buyer.getByRole("heading", { name: "Profile", exact: true }),
    ).toBeVisible();
    await buyer.goto("/support");
    await buyer.getByLabel("Conversation subject").fill(subject);
    await buyer
      .getByRole("button", { name: "Start conversation", exact: true })
      .click();
    await expect(buyer).toHaveURL(/\/support\/[a-f0-9-]+$/);
    const id = buyer.url().split("/").at(-1);
    if (!id) throw new Error("No thread");
    await expect(
      buyer.getByText("Live updates connected", { exact: true }),
    ).toBeVisible();
    await buyer
      .getByLabel("Message", { exact: true })
      .fill("Can you help me choose a service?");
    const webp = await buyer.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 8;
      canvas.height = 8;
      return canvas.toDataURL("image/webp").split(",")[1] ?? "";
    });
    await buyer.getByLabel("Choose image").setInputFiles({
      name: "proof.webp",
      mimeType: "image/webp",
      buffer: Buffer.from(webp, "base64"),
    });
    await expect(
      buyer.getByRole("button", { name: "Send message", exact: true }),
    ).toBeDisabled();
    await buyer.route("**/api/v1/media/*/bytes", (route) => route.abort(), {
      times: 1,
    });
    await buyer
      .getByRole("button", { name: "Upload image", exact: true })
      .click();
    await expect(buyer.getByText(/Image upload failed/)).toBeVisible();
    await buyer
      .getByRole("button", { name: "Upload image", exact: true })
      .click();
    await expect(
      buyer.getByText("Image checked and ready to send."),
    ).toBeVisible({ timeout: 30000 });
    await buyer
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect(buyer.locator(".message-list")).toContainText(
      "Can you help me choose a service?",
    );
    await accessible(buyer);
    await page.goto("/admin/support");
    await page.getByRole("link", { name: new RegExp(subject) }).click();
    await page.getByLabel("Message audience").selectOption("internal");
    await page
      .getByLabel("Internal note", { exact: true })
      .fill("Private staff-only evaluation");
    await page
      .getByLabel("Choose image")
      .setInputFiles("tests/fixtures/proof.png");
    await page
      .getByRole("button", { name: "Upload image", exact: true })
      .click();
    await expect(
      page.getByText("Image checked and ready to send."),
    ).toBeVisible({ timeout: 30000 });
    await page
      .getByRole("button", { name: "Save internal note", exact: true })
      .click();
    await expect(page.locator(".internal-note")).toContainText(
      "Private staff-only evaluation",
    );
    const publicMessages = messagesSchema.parse(
      await (
        await buyer.request.get(`/api/v1/conversations/${id}/messages`)
      ).json(),
    );
    expect(publicMessages.messages).toHaveLength(1);
    expect(publicMessages.latest).toBe(1);
    const fileID = publicMessages.messages[0]?.attachments?.[0];
    expect(fileID).toBeTruthy();
    await buyer
      .getByRole("button", { name: "Get image download", exact: true })
      .click();
    const downloadURL = await buyer
      .getByRole("link", { name: "Download image", exact: true })
      .getAttribute("href");
    if (!downloadURL) throw new Error("Private download grant missing");
    const downloaded = await buyer.request.get(downloadURL);
    expect(downloaded.status()).toBe(200);
    expect(downloaded.headers()["content-type"]).toBe("image/png");
    expect(downloaded.headers()["content-disposition"]).toContain(
      "attachment;",
    );
    expect(downloaded.headers()["cache-control"]).toBe("no-store");
    await page
      .locator(".internal-note")
      .getByRole("button", { name: "Get image download" })
      .click();
    const internalURL = await page
      .locator(".internal-note")
      .getByRole("link", { name: "Download image" })
      .getAttribute("href");
    if (!internalURL) throw new Error("Internal download missing");
    const internalID = internalURL.split("/").at(-2);
    expect(
      (await buyer.request.get("/api/v1/media/" + String(internalID))).status(),
    ).toBe(404);
    expect(
      publicMessages.messages.every(
        (message) =>
          message.sender_id === undefined && message.visibility === "public",
      ),
    ).toBe(true);
    await page.getByLabel("Message audience").selectOption("public");
    await page
      .getByLabel("Message", { exact: true })
      .fill("We can review your preferred game and rank.");
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect(buyer.locator(".message-list")).toContainText(
      "We can review your preferred game and rank.",
    );
    await expect(
      buyer.getByText("Private staff-only evaluation", { exact: true }),
    ).toHaveCount(0);
    await accessible(page);
    await context.setOffline(true);
    await page
      .getByLabel("Message", { exact: true })
      .fill("This message arrived while you were offline.");
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect(page.locator(".message-list")).toContainText(
      "This message arrived while you were offline.",
    );
    await context.setOffline(false);
    await expect(buyer.locator(".message-list")).toContainText(
      "This message arrived while you were offline.",
      { timeout: 20000 },
    );
    await expect(buyer.locator(".message-list li")).toHaveCount(3);
    await page.getByLabel("Set conversation status").selectOption("resolved");
    await page
      .getByRole("button", { name: "Save conversation status", exact: true })
      .click();
    await expect(buyer.getByText(/Pre-sales support · resolved/)).toBeVisible();
    await buyer
      .getByLabel("Message", { exact: true })
      .fill("One follow-up question");
    await buyer
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect(page.getByText(/Pre-sales support · open/)).toBeVisible();
    await page.screenshot({
      path: `.cache/admin-chat-${info.project.name}.png`,
      fullPage: true,
    });
    await accessible(page);
    await expect(
      buyer.getByRole("navigation", { name: "Recent conversations" }),
    ).toBeVisible();
    await buyer.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await buyer.screenshot({
      path: `.cache/support-${info.project.name}.png`,
      fullPage: true,
    });
    await accessible(buyer);
    await buyer.goto("/notifications");
    await expect(
      buyer.getByRole("link", { name: "New support reply · Unread" }),
    ).toHaveCount(2);
    await accessible(buyer);
    await buyer
      .getByRole("button", { name: "Mark read", exact: true })
      .first()
      .click();
    await expect(
      buyer.getByRole("link", { name: "New support reply · Read" }),
    ).toHaveCount(1);
    await expect
      .poll(async () => {
        const response = await request.get(
          "http://127.0.0.1:8025/api/v1/search",
          {
            params: {
              query:
                "to:" +
                fixture(info.project.name, "supportbuyer") +
                " subject:New activity",
            },
          },
        );
        const data = z
          .object({ messages: z.array(z.object({ ID: z.string() })) })
          .parse(await response.json());
        return data.messages.length;
      })
      .toBeGreaterThan(0);
    const strangerContext = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
    });
    try {
      const other = await strangerContext.newPage();
      await signIn(other, request, fixture(info.project.name, "supportother"));
      await expect(
        other.getByRole("heading", { name: "Profile", exact: true }),
      ).toBeVisible();
      expect(
        (
          await other.request.get(`/api/v1/conversations/${id}/messages`)
        ).status(),
      ).toBe(404);
      expect(
        (
          await other.request.get(`/api/v1/conversations/${id}/stream`)
        ).status(),
      ).toBe(404);
      expect(
        (await other.request.get("/api/v1/media/" + String(fileID))).status(),
      ).toBe(404);
      expect((await other.request.get(downloadURL)).status()).toBe(403);
      expect(
        (await other.request.get(`/api/v1/admin/conversations/${id}`)).status(),
      ).toBe(403);
    } finally {
      await strangerContext.close();
    }
  } finally {
    await context.close();
  }
});
