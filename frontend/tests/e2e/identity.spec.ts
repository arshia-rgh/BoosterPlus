import { readFileSync } from "node:fs";
import { createHmac, randomUUID } from "node:crypto";
import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { z } from "zod";
const settingsSchema = z.object({ fixtures: z.record(z.string(), z.string()) });
function fixture(project: string, role: string) {
  const file = process.env.BROWSER_TEST_CONFIG;
  if (!file) throw new Error("Browser identity environment is required");
  const settings = settingsSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  const email = settings.fixtures[project + "_" + role];
  if (!email) throw new Error("Missing fixture");
  return email;
}
function totp(secret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of secret) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Invalid base32 secret");
    bits += index.toString(2).padStart(5, "0");
  }
  const key = Buffer.from(
    bits.match(/.{8}/g)?.map((byte) => parseInt(byte, 2)) ?? [],
  );
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", key).update(counter).digest();
  const offset = (digest[19] ?? 0) & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000)
    .toString()
    .padStart(6, "0");
}
async function mailCode(request: APIRequestContext, email: string) {
  let code = "";
  await expect
    .poll(
      async () => {
        const response = await request.get(
          "http://127.0.0.1:8025/api/v1/search",
          { params: { query: "to:" + email } },
        );
        const data = z
          .object({ messages: z.array(z.object({ ID: z.string() })) })
          .parse(await response.json());
        const message = data.messages[0];
        if (!message) return "";
        const detail = await request.get(
          "http://127.0.0.1:8025/api/v1/message/" + message.ID,
        );
        const body = z.object({ Text: z.string() }).parse(await detail.json());
        code = body.Text.match(/\b[0-9]{6}\b/)?.[0] ?? "";
        return code;
      },
      { timeout: 20000 },
    )
    .toMatch(/^\d{6}$/);
  return code;
}
async function signIn(page: Page, request: APIRequestContext, email: string) {
  await page.goto("/account");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByRole("checkbox", { name: /I accept/ }).check();
  await page.getByRole("button", { name: "Send verification code" }).click();
  await page
    .getByLabel("Email verification code")
    .fill(await mailCode(request, email));
  await page.getByRole("button", { name: "Verify email code" }).click();
}
async function enroll(page: Page) {
  await page.getByRole("button", { name: "Set up authenticator" }).click();
  const secret = await page.locator(".secret code").textContent();
  if (!secret) throw new Error("Missing setup key");
  await page.getByLabel("Authenticator or recovery code").fill(totp(secret));
  await page
    .getByRole("button", { name: "Verify authenticator", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Save your recovery codes" }),
  ).toBeVisible();
  const codes = await page.locator(".secret li code").allTextContents();
  expect(codes).toHaveLength(10);
  await page.getByRole("button", { name: "I saved my recovery codes" }).click();
  return codes;
}
test("email signup, profile, sessions, MFA enrollment and logout", async ({
  page,
  request,
}) => {
  const email = "signup-" + randomUUID() + "@example.test";
  await signIn(page, request, email);
  await expect(
    page.getByRole("button", { name: "Save profile" }),
  ).toBeVisible();
  await page
    .getByLabel("Display name", { exact: true })
    .fill("Test <script>alert(1)</script>");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(
    page
      .getByRole("button", { name: "Save profile" })
      .locator("..")
      .locator("..")
      .getByRole("status"),
  ).toContainText("Done.");
  await page.reload();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "Test <script>alert(1)</script>",
  );
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(
    page
      .getByRole("button", { name: "Save profile" })
      .locator("..")
      .locator("..")
      .getByRole("status"),
  ).toContainText("Done.");
  await page.getByRole("button", { name: "Load sessions" }).click();
  await expect(
    page.getByRole("heading", { name: "This session" }),
  ).toBeVisible();
  await enroll(page);
  await page
    .getByRole("checkbox", { name: "Replace my existing recovery codes" })
    .check();
  await page
    .getByRole("button", { name: "Replace recovery codes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Save your recovery codes" }),
  ).toBeVisible();
  expect((await page.request.get("/api/v1/me")).status()).toBe(200);
  await page.getByRole("button", { name: "I saved my recovery codes" }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Send verification code" }),
  ).toBeVisible();
  const me = await page.request.get("/api/v1/me");
  expect(me.status()).toBe(401);
});
for (const role of ["booster", "administrator", "owner"] as const) {
  test(`${role} requires authenticator before portal access`, async ({
    page,
    request,
  }, info) => {
    const email = fixture(info.project.name, role);
    await signIn(page, request, email);
    await expect(
      page.getByText(
        "Authenticator verification is required to finish signing in.",
      ),
    ).toBeVisible();
    expect((await page.request.get("/api/v1/admin/users")).status()).toBe(403);
    expect((await page.request.get("/api/v1/me/sessions")).status()).toBe(403);
    await enroll(page);
    expect((await page.request.get("/api/v1/admin/users")).status()).toBe(
      role === "booster" ? 403 : 200,
    );
    expect((await page.request.get("/api/v1/admin/audit")).status()).toBe(
      role === "owner" ? 200 : 403,
    );
    await page.goto(role === "booster" ? "/booster" : "/admin");
    if (role === "booster") {
      await expect(page.getByText(/assigned-order workspace/)).toBeVisible();
    } else {
      await page.getByRole("button", { name: "Load users" }).click();
      await expect(
        page.getByRole("heading", { name: email, exact: true }),
      ).toBeVisible();
      if (role === "owner") {
        const target = fixture(info.project.name, "target");
        const card = page.locator("article").filter({
          has: page.getByRole("heading", { name: target, exact: true }),
        });
        await card
          .getByRole("combobox", { name: "Role", exact: true })
          .selectOption("booster");
        await card.getByRole("checkbox", { name: /Apply this role/ }).check();
        await card.getByRole("button", { name: "Change role" }).click();
        await expect(card.getByText(/booster · Active/)).toBeVisible();
        await page.getByRole("button", { name: "Load audit" }).click();
        await expect(
          page
            .locator(".audit-list li")
            .filter({ hasText: fixture(info.project.name, "target_id") })
            .getByText("role.changed"),
        ).toBeVisible();
      }
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
test("production page has nonce CSP and rejects cross-origin mutations", async ({
  page,
}) => {
  const response = await page.goto("/account");
  const csp = response?.headers()["content-security-policy"];
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toMatch(/script-src 'self' 'nonce-/);
  expect(csp).not.toContain("unsafe-inline");
  await expect(page.getByLabel("Email address", { exact: true })).toBeVisible();
  const state = z
    .object({ csrf_token: z.string() })
    .parse(await (await page.request.get("/api/v1/auth/session")).json());
  const denied = await page.request.post("/api/v1/auth/logout", {
    headers: {
      Origin: "https://evil.example",
      "X-CSRF-Token": state.csrf_token,
    },
    data: {},
  });
  expect(denied.status()).toBe(403);
});
