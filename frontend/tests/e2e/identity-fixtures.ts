import decodeQR from "qr/decode.js";
import { authenticatorIssuer } from "../../app/identity/mfa-enrollment";
import { portalFromPath, authPath } from "../../app/identity/portal";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { expect, type Page, type APIRequestContext } from "@playwright/test";
import { z } from "zod";
const settingsSchema = z.object({ fixtures: z.record(z.string(), z.string()) });
export function fixture(project: string, role: string) {
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
        const body = z
          .object({
            Text: z.string(),
            Subject: z.string(),
            From: z.object({ Name: z.string() }),
          })
          .parse(await detail.json());
        expect(body.Subject).toContain("PLAYORA");
        expect(body.From.Name).toBe("PLAYORA");
        code = body.Text.match(/\b[0-9]{6}\b/)?.[0] ?? "";
        return code;
      },
      { timeout: 20000 },
    )
    .toMatch(/^\d{6}$/);
  return code;
}
export function authURL(page: Page, action: string) {
  return (
    "/api/v1" + authPath(portalFromPath(new URL(page.url()).pathname), action)
  );
}
export async function signIn(
  page: Page,
  request: APIRequestContext,
  email: string,
  entry = "/account",
) {
  await page.goto(entry);
  await page
    .getByLabel(
      portalFromPath(new URL(page.url()).pathname) === "customer"
        ? "Email address"
        : "Work email address",
      { exact: true },
    )
    .fill(email);
  await page.getByRole("checkbox", { name: /I accept/ }).check();
  await page.getByRole("button", { name: "Send verification code" }).click();
  await page
    .getByLabel("Email verification code")
    .fill(await mailCode(request, email));
  await page.getByRole("button", { name: "Verify email code" }).click();
}
export async function accountDestination(page: Page, label: string) {
  if (
    [
      "Profile",
      "Security",
      "Sessions",
      "Recovery codes",
      "Preferences",
      "Privacy",
    ].includes(label)
  ) {
    const settings = page.getByRole("navigation", {
      name: "Account settings",
      exact: true,
    });
    if (!(await settings.isVisible()))
      await accountDestination(page, "Settings");
    await settings.getByRole("link", { name: label, exact: true }).click();
    return;
  }
  const more = page.getByRole("button", { name: "More", exact: true });
  if (await more.isVisible()) {
    await more.click();
    await page
      .getByRole("dialog", { name: "Account menu" })
      .getByRole("link", { name: label, exact: true })
      .click();
  } else
    await page
      .getByRole("navigation", { name: "Account navigation", exact: true })
      .getByRole("link", { name: label, exact: true })
      .click();
}
export async function signOut(page: Page) {
  await expect(
    page
      .getByRole("navigation", {
        name: /^(Account|Booster) (shortcuts|navigation)$/,
      })
      .filter({ visible: true }),
  ).toBeVisible();
  const more = page.getByRole("button", { name: "More", exact: true });
  if (await more.isVisible()) await more.click();
  const result = page.waitForResponse(
    (response) =>
      response.url().endsWith(authURL(page, "logout")) &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  expect((await result).status()).toBe(204);
}
export async function enroll(page: Page) {
  await expect(
    page
      .getByRole("button", { name: "Set up authenticator", exact: true })
      .or(page.getByRole("button", { name: "Refresh overview", exact: true }))
      .or(page.getByRole("button", { name: "Save profile", exact: true })),
  ).toBeVisible();
  if (
    !(await page
      .getByRole("button", { name: "Set up authenticator", exact: true })
      .isVisible())
  )
    await accountDestination(page, "Security");
  const enrollment = page.waitForResponse(
    (response) =>
      response.url().endsWith(authURL(page, "mfa/enroll")) &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Set up authenticator" }).click();
  const payload = z
    .object({ url: z.string() })
    .parse(await (await enrollment).json());
  expect(new URL(payload.url).searchParams.get("issuer")).toBe(
    authenticatorIssuer(portalFromPath(new URL(page.url()).pathname)),
  );
  await expect(
    page.getByRole("img", {
      name: "Authenticator setup QR code for your PLAYORA account",
    }),
  ).toBeVisible();
  // Decode the actual browser-rasterized SVG: a missing border, wrong label,
  // or render failure must not be hidden by the response-derived TOTP fixture.
  const pixels = await page.locator(".mfa-setup-qr").evaluate(async (svg) => {
    // A local data image respects the application's img-src policy. The test
    // never relaxes CSP to permit blob URLs or a remote QR service.
    const image = new Image();
    image.src =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(new XMLSerializer().serializeToString(svg));
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 576;
    canvas.height = 576;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Missing fixture canvas");
    context.drawImage(image, 0, 0, 576, 576);
    return [...context.getImageData(0, 0, 576, 576).data];
  });
  expect(
    decodeQR({ width: 576, height: 576, data: new Uint8ClampedArray(pixels) }),
  ).toBe(payload.url);
  const secret = new URL(payload.url).searchParams.get("secret");
  if (!secret) throw new Error("Missing fixture setup key");
  await page.getByLabel("Six-digit authenticator code").fill(totp(secret));
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
