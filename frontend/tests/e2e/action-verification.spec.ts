import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Isolated browser provider; no real codes, mail or account mutations.
async function fixture(page: Page, portal: "customer" | "admin" | "booster") {
  let fresh = false;
  let writes = 0;
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/session")) {
      await route.fulfill({
        json: {
          portal,
          user: {
            portal,
            id: "verification-fixture",
            email: "fixture@example.invalid",
            display_name: "Fixture",
            role: portal === "admin" ? "owner" : portal,
            staff_alias: "Staff",
            suspended: false,
            mfa_enabled: true,
            notify_updates: false,
          },
          csrf_token: "fixture".repeat(10),
          google_enabled: false,
          google_linked: false,
          mfa_required: false,
          capabilities: ["self", portal === "customer" ? "account" : portal],
          terms_version: "fixture",
          terms_url: "/terms",
        },
      });
      return;
    }
    if (path.endsWith("/mfa/recovery-codes")) {
      if (!fresh) {
        await route.fulfill({
          status: 403,
          json: { code: "recent_auth_required" },
        });
        return;
      }
      writes++;
      await route.fulfill({
        json: { recovery_codes: ["SYNTHETIC-RECOVERY-CODE"] },
      });
      return;
    }
    if (path.endsWith("/mfa/verify")) {
      const body: unknown = route.request().postDataJSON();
      if (
        typeof body !== "object" ||
        body === null ||
        !("code" in body) ||
        body.code !== "123456"
      ) {
        await route.fulfill({ status: 400, json: { code: "invalid_request" } });
        return;
      }
      fresh = true;
      await route.fulfill({ json: { recovery_codes: [] } });
      return;
    }
    if (path.endsWith("/email/request")) {
      await route.fulfill({
        json: {
          challenge_id: "fixture-only",
          retry_after_seconds: 60,
          expires_in_seconds: 600,
        },
      });
      return;
    }
    if (path.endsWith("/email/verify")) {
      fresh = true;
      await route.fulfill({ json: { purpose: "reauth" } });
      return;
    }
    await route.fulfill({
      json: {
        attention: [],
        active: [],
        upcoming: [],
        messages: [],
        more_messages: false,
        more_attention: false,
        more_active: false,
        more_upcoming: false,
        items: [],
      },
    });
  });
  return { writes: () => writes };
}
for (const portal of ["customer", "admin", "booster"] as const) {
  test(`${portal} sensitive action keeps its page, traps focus, cancels safely and resumes once`, async ({
    page,
  }, info) => {
    const f = await fixture(page, portal);
    const path =
      portal === "customer"
        ? "/account/recovery"
        : `/${portal}/account/recovery`;
    await page.goto(path);
    await page.getByLabel("Replace my existing recovery codes").check();
    const trigger = page.getByRole("button", {
      name: "Replace recovery codes",
      exact: true,
    });
    await trigger.click();
    const dialog = page.getByRole("dialog", {
      name: "Replace your recovery codes",
    });
    await expect(dialog).toBeVisible();
    await expect(page.getByLabel("Six-digit authenticator code")).toBeFocused();
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press("Tab");
      expect(
        await page.evaluate(() =>
          Boolean(document.activeElement?.closest("dialog")),
        ),
      ).toBe(true);
    }
    expect(
      (await new AxeBuilder({ page }).include(".action-verification").analyze())
        .violations,
    ).toEqual([]);
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await dialog.screenshot({
      path: `.cache/action-dialog-${portal}-${info.project.name}.png`,
    });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeEnabled();
    await expect(trigger).toBeFocused();
    expect(f.writes()).toBe(0);
    await expect(
      page.getByLabel("Replace my existing recovery codes"),
    ).toBeChecked();
    await expect(page).toHaveURL(path);
    await trigger.click();
    if (portal === "customer") {
      await dialog
        .getByRole("button", { name: "Email code", exact: true })
        .click();
      await dialog.getByRole("button", { name: "Send email code" }).click();
      await expect(dialog.getByLabel("Email verification code")).toBeFocused();
      await expect(
        dialog.getByRole("button", { name: /Resend code in/ }),
      ).toBeDisabled();
      await dialog.getByLabel("Email verification code").fill("123456");
    } else {
      await dialog.getByLabel("Six-digit authenticator code").fill("000000");
      await dialog.getByRole("button", { name: "Verify and continue" }).click();
      await expect(dialog.getByRole("alert")).toBeVisible();
      await expect(
        dialog.getByLabel("Six-digit authenticator code"),
      ).toBeFocused();
      await dialog.getByLabel("Six-digit authenticator code").fill("123456");
    }
    await dialog.getByRole("button", { name: "Verify and continue" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("SYNTHETIC-RECOVERY-CODE")).toBeVisible();
    expect(f.writes()).toBe(1);
    await expect(page).toHaveURL(path);
  });
}
