import { operationsJourney } from "./operations-journey";
import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { z } from "zod";
import {
  fixture,
  signIn,
  enroll,
  accountDestination,
  signOut,
} from "./identity-fixtures";
test("email signup, profile, sessions, MFA enrollment and logout", async ({
  page,
  request,
}) => {
  const email = "signup-" + randomUUID() + "@example.test";
  await signIn(page, request, email);
  await expect(
    page.getByRole("button", { name: "Refresh overview" }),
  ).toBeVisible();
  await accountDestination(page, "Profile");
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
  ).toContainText("Profile saved.");
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
  ).toContainText("Profile saved.");
  await accountDestination(page, "Security");
  await page
    .getByText("Active sessions and sign-out options", { exact: true })
    .click();
  await page.getByRole("button", { name: "Load sessions" }).click();
  await expect(
    page.getByRole("heading", { name: "Customer · This session" }),
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
  await signOut(page);
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
    const portal = role === "booster" ? "booster" : "admin";
    await signIn(page, request, email, `/${portal}/login`);
    await expect(
      page.getByText(
        "Authenticator verification is required to finish signing in.",
      ),
    ).toBeVisible();
    expect((await page.request.get("/api/v1/admin/users")).status()).toBe(
      portal === "admin" ? 403 : 401,
    );
    expect((await page.request.get("/api/v1/admin/jobs")).status()).toBe(
      portal === "admin" ? 403 : 401,
    );
    expect(
      (
        await page.request.get("/api/v1/me/sessions", {
          headers: { "X-Playora-Portal": portal },
        })
      ).status(),
    ).toBe(403);
    expect((await page.request.get("/api/v1/me/overview")).status()).toBe(401);
    await enroll(page);
    expect((await page.request.get("/api/v1/me/overview")).status()).toBe(401);
    expect((await page.request.get("/api/v1/admin/users")).status()).toBe(
      role === "booster" ? 401 : 200,
    );
    expect((await page.request.get("/api/v1/admin/audit")).status()).toBe(
      role === "owner" ? 200 : role === "booster" ? 401 : 403,
    );
    await expect(page).toHaveURL(new RegExp(`/${portal}$`));
    if (role === "booster") {
      await expect(
        page.getByRole("heading", { name: "Your next session", level: 1 }),
      ).toBeVisible();
      await expect(
        page.getByRole("region", { name: "Next confirmed session" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "View assigned work", exact: true }),
      ).toHaveAttribute("href", "/booster/orders");
    } else {
      await expect(
        page.getByRole("heading", { name: "Operations overview", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: "Background tasks needing attention",
          exact: true,
        }),
      ).toBeVisible();
      await page.screenshot({
        path: `.cache/operations-${info.project.name}-${role}.png`,
        fullPage: true,
      });
      await page.goto("/admin/customers");
      await page
        .getByLabel("Search email, display name or full user ID")
        .fill(email);
      await page.getByRole("button", { name: "Load users" }).click();
      await page.locator(".staff-person > summary").first().click();
      await expect(
        page.getByRole("heading", { name: email, exact: true }),
      ).toBeVisible();
      if (role === "owner") {
        const target = fixture(info.project.name, "target");
        await page
          .getByLabel("Search email, display name or full user ID")
          .fill(target);
        await page.getByRole("button", { name: "Load users" }).click();
        await page.locator(".staff-person > summary").first().click();
        const card = page.locator(".staff-person").filter({
          has: page.getByRole("heading", { name: target, exact: true }),
        });
        await card
          .getByRole("combobox", { name: "Role", exact: true })
          .selectOption("booster");
        await card.getByRole("checkbox", { name: /Apply this role/ }).check();
        await card.getByRole("button", { name: "Change role" }).click();
        await expect(
          page.locator(".staff-person > summary").getByText(/booster · Active/),
        ).toBeVisible();
        await page
          .getByText("Security audit and recovery review", { exact: true })
          .click();
        await page.getByRole("button", { name: "Load audit" }).click();
        await expect(
          page
            .locator(".audit-list li")
            .filter({ hasText: fixture(info.project.name, "target_id") })
            .getByText("role.changed"),
        ).toBeVisible();
      }
    }
    if (role !== "booster") {
      const navigation = page.getByRole("navigation", {
        name: "Staff navigation",
      });
      if (info.project.name === "mobile") {
        await page.getByRole("button", { name: "Menu", exact: true }).click();
        await expect(
          page.getByRole("dialog", { name: "Staff menu" }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(
          page.getByRole("dialog", { name: "Staff menu" }),
        ).not.toBeVisible();
        await page.getByRole("button", { name: "Menu", exact: true }).click();
        await page
          .getByRole("dialog")
          .getByRole("link", { name: "Order queue" })
          .click();
        await expect(page.getByRole("dialog")).not.toBeVisible();
      } else {
        await navigation.getByRole("link", { name: "Order queue" }).click();
      }
      await expect(page).toHaveURL(/\/admin\/orders$/);
      await page
        .getByRole("search")
        .getByRole("searchbox", { name: "Search orders" })
        .fill("Mobile Legends");
      await page
        .getByRole("search")
        .getByRole("button", { name: "Search orders" })
        .click();
      await expect(page).toHaveURL(/search=Mobile(?:\+|%20)Legends/);
      await expect(page.getByLabel("Search game or full order ID")).toHaveValue(
        "Mobile Legends",
      );
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: `test-results/admin-queue-${info.project.name}-${role}.png`,
        fullPage: true,
      });
      // The admin session never silently authenticates the customer portal.
      await page.goto("/account");
      await expect(page).toHaveURL(/\/login\?returnTo=/);
      await expect(
        page.getByRole("button", { name: "Send verification code" }),
      ).toBeVisible();
      await page.goto("/admin");
      await expect(
        page.getByRole("heading", { name: "Operations overview", exact: true }),
      ).toBeVisible();
    }
    if (role === "owner") {
      // Real cookie coexistence in one browser: a new customer sign-in must not
      // overwrite the previously verified admin session or borrow its role.
      await signIn(
        page,
        request,
        `portal-coexist-${info.project.name}-${String(Date.now())}@example.test`,
      );
      await expect(
        page.getByRole("button", { name: "Refresh overview", exact: true }),
      ).toBeVisible();
      expect((await page.request.get("/api/v1/me/overview")).status()).toBe(
        200,
      );
      expect((await page.request.get("/api/v1/admin/users")).status()).toBe(
        200,
      );
      expect(
        (
          await page.request.get("/api/v1/admin/users", {
            headers: { "X-Playora-Portal": "customer" },
          })
        ).status(),
      ).toBe(403);
      await signOut(page);
      expect((await page.request.get("/api/v1/me/overview")).status()).toBe(
        401,
      );
      expect((await page.request.get("/api/v1/admin/users")).status()).toBe(
        200,
      );
      await page.goto("/admin");
      await expect(
        page.getByRole("heading", { name: "Operations overview", exact: true }),
      ).toBeVisible();
    }
    if (role === "administrator")
      await operationsJourney(
        page,
        fixture(info.project.name, "failed_job"),
        info.project.name,
      );
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
