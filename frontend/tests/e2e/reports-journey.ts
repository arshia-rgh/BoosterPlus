import { readFile } from "node:fs/promises";
import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { z } from "zod";
import { exportSchema } from "../../app/reports/model";
export async function reportsJourney(page: Page, device: string) {
  const own = z
    .object({ id: z.string(), email: z.string() })
    .parse(await (await page.request.get("/api/v1/me")).json());
  await page.goto("/admin/reports");
  await expect(
    page.getByRole("link", { name: "Reports", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sign out", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Report", { exact: true }).selectOption("staff");
  await page.getByLabel("From date (UTC, inclusive)").fill("2000-01-01");
  await page.getByLabel("Until date (UTC, exclusive)").fill("2100-01-01");
  await page
    .getByLabel("Search name, alias, action or exact record ID")
    .fill(own.id);
  await page
    .getByRole("button", { name: "Preview report", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Preview: 1 record", exact: true }),
  ).toBeVisible();
  const region = page.getByRole("region", { name: "Operational report table" });
  await region.focus();
  await expect(region).toBeFocused();
  const overflow = await region.evaluate(
    (element) => element.scrollWidth > element.clientWidth,
  );
  if (overflow) {
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(() => region.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);
  }
  await expect(
    page.getByRole("button", { name: "Download this page (.json)" }),
  ).toBeDisabled();
  await page
    .getByLabel("Reason for export")
    .fill("Synthetic staff operational review");
  const waiting = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download this page (.json)" })
    .click();
  const download = await waiting;
  expect(download.suggestedFilename()).toBe(
    "boosterplus-operational-report.json",
  );
  const path = await download.path();
  if (!path) throw new Error("Missing report artifact");
  const raw = await readFile(path, "utf8");
  const value = exportSchema.parse(JSON.parse(raw));
  expect(value.report.count).toBe(1);
  expect(value.report.rows[0]?.[0]).toBe(own.id);
  expect(value.audit_id).not.toBe("");
  expect(raw).not.toContain(own.email);
  expect(raw).not.toContain("mfa_secret");
  expect(raw).not.toContain("metadata");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/reports-${device}.png`,
    fullPage: true,
  });
}
