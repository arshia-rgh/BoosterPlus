import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { sessionSchema } from "../../app/identity/api";
import { conversationSchema } from "../../app/support/model";

async function write(
  page: Page,
  portal: "customer" | "admin",
  path: string,
  body: unknown,
) {
  const session = sessionSchema.parse(
    await (
      await page.request.get(`/api/v1/auth/portals/${portal}/session`)
    ).json(),
  );
  const response = await page.request.post(`/api/v1${path}`, {
    data: body,
    headers: {
      Origin: "http://127.0.0.1:4173",
      "X-CSRF-Token": session.csrf_token,
    },
  });
  expect(response.ok()).toBe(true);
  return response.json() as Promise<unknown>;
}

// Keep the buyer away from the conversation while arranging incoming/outgoing
// messages; otherwise the rendered chat acknowledges them and hides this bug.
export async function qualifyIncomingUnread(buyer: Page, staff: Page) {
  await buyer.goto("/account");
  const subject = `Unread review ${randomUUID()}`;
  const thread = conversationSchema.parse(
    await write(buyer, "customer", "/conversations", {
      request_key: randomUUID(),
      kind: "presales",
      subject,
      order_id: "",
      slug: "",
    }),
  );
  const send = (
    page: Page,
    portal: "customer" | "admin",
    body: string,
    visibility = "public",
  ) =>
    write(
      page,
      portal,
      `${portal === "admin" ? "/admin" : ""}/conversations/${thread.id}/messages`,
      { request_key: randomUUID(), body, visibility, attachments: [] },
    );
  await send(buyer, "customer", "My outgoing message is not unread");
  const detail = async () =>
    conversationSchema.parse(
      await (
        await buyer.request.get(`/api/v1/conversations/${thread.id}`)
      ).json(),
    );
  expect(await detail()).toMatchObject({ unread: 0, first_unread_sequence: 0 });
  await buyer.reload();
  await expect(
    buyer.getByRole("link", { name: new RegExp(subject) }),
  ).toHaveCount(0);

  await send(staff, "admin", "The first unread incoming reply");
  await send(
    buyer,
    "customer",
    "My later reply must not read the incoming one",
  );
  await send(staff, "admin", "Private unread test note", "internal");
  expect(await detail()).toMatchObject({
    unread: 1,
    sequence: 3,
    first_unread_sequence: 2,
  });
  await buyer.goto(`/support/${thread.id}`);
  await expect(
    buyer.locator('[data-sequence="2"] .chat-unread-divider'),
  ).toHaveText("Unread messages");
  await expect(buyer.locator('[data-sequence="2"]')).toContainText(
    "The first unread incoming reply",
  );
  await expect(
    buyer.locator('[data-sequence="3"] .chat-unread-divider'),
  ).toHaveCount(0);
  await expect(
    buyer.getByText("Private unread test note", { exact: true }),
  ).toHaveCount(0);
}
