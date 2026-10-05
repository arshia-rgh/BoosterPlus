import { secondaryCapture } from "./secondary-capture";
import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
export async function operationsJourney(
  page: Page,
  taskID: string,
  device: string,
) {
  await expect(
    page.getByRole("heading", { name: "Operations overview", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Account and staff administration",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Background tasks needing attention",
      exact: true,
    }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: `test-results/operations-${device}.png`,
    fullPage: true,
  });
  const response = await page.request.get(
    "/api/v1/admin/jobs?kind=system.ping",
  );
  expect(response.ok()).toBe(true);
  const raw = await response.text();
  expect(raw).not.toContain("Synthetic task payload");
  expect(raw).not.toContain("idempotency_key");
  expect(raw).not.toContain('"payload"');
  expect(raw).not.toContain('"owner"');
  await page.goto("/admin/jobs?kind=system.ping");
  const card = page.getByRole("article", {
    name: `Task ${taskID}`,
    exact: true,
  });
  await card.getByText("Review and retry this task", { exact: true }).click();
  await expect(
    card.getByRole("button", { name: "Queue another attempt", exact: true }),
  ).toBeDisabled();
  await card
    .getByLabel("Reason for retry", { exact: true })
    .fill("Connectivity checked; retrying the synthetic worker check.");
  const retry = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === `/api/v1/admin/jobs/${taskID}/retry` &&
      r.request().method() === "POST",
  );
  await card
    .getByRole("button", { name: "Queue another attempt", exact: true })
    .click();
  expect((await retry).status()).toBe(200);
  await expect(card).toHaveCount(0);
  await page.getByLabel("Task state", { exact: true }).selectOption("complete");
  await expect(async () => {
    await page
      .getByRole("button", { name: "Refresh background tasks", exact: true })
      .click();
    await expect(
      page.getByRole("article", { name: `Task ${taskID}`, exact: true }),
    ).toBeVisible();
  }).toPass({ timeout: 15000 });
  await expect(
    page
      .getByRole("article", { name: `Task ${taskID}`, exact: true })
      .getByText("Review and retry this task"),
  ).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/job-recovery-${device}.png`,
    fullPage: true,
  });
  await card.getByText("Recorded attempt history", { exact: true }).click();
  await expect(
    card.getByRole("heading", { name: "Run 2 · Attempt 1", exact: true }),
  ).toBeVisible();
  await expect(card.getByText("Completed", { exact: true })).toBeVisible();
  await secondaryCapture(page, "job-attempts", device);
}
