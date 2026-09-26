import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";
let server: ViteDevServer;
let origin: string;
test.beforeAll(async () => {
  server = await createServer({
    configFile: false,
    envFile: false,
    root: fileURLToPath(new URL("../fixtures/ui-foundations", import.meta.url)),
    publicDir: false,
    server: { host: "127.0.0.1", port: 0 },
    logLevel: "error",
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string")
    throw new Error("Missing fixture server address");
  origin = `http://127.0.0.1:${String(address.port)}`;
});
test.afterAll(async () => {
  await server.close();
});

test("foundation variants, field-linked errors and keyboard table scrolling", async ({
  page,
}, info) => {
  await page.goto(origin);
  await expect(
    page.getByRole("heading", { name: "Shared interface foundations" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Unavailable action" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("status").filter({ hasText: "Loading order details" }),
  ).toContainText("Loading order details");
  await page.getByLabel("Display name", { exact: true }).fill("Al");
  await page
    .getByLabel("Safe note", { exact: true })
    .fill("Preserve my safe input");
  await page.getByRole("button", { name: "Save fixture profile" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Check the highlighted fields.",
  );
  await expect(page.getByRole("alert")).toBeFocused();
  const name = page.getByLabel("Display name", { exact: true });
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveAccessibleDescription(
    "This name appears in your own workspace. Use at least three characters.",
  );
  await page
    .getByRole("link", { name: "Display name: Use at least three characters." })
    .click();
  await expect(name).toBeFocused();
  await name.fill("Alice");
  await expect(name).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Safe note", { exact: true })).toHaveValue(
    "Preserve my safe input",
  );
  await expect(
    page.getByText("Changes entered. Submit again to check them.", {
      exact: true,
    }),
  ).toBeVisible();
  const action = page.getByRole("button", { name: "Save fixture profile" });
  const before = await action.evaluate(
    (el) => el.getBoundingClientRect().width,
  );
  await action.click();
  const pending = page.getByRole("button", {
    name: "Please wait…",
    exact: true,
  });
  await expect(pending).toBeDisabled();
  expect(await pending.evaluate((el) => el.getBoundingClientRect().width)).toBe(
    before,
  );
  await page.screenshot({
    path: info.outputPath("pending-save.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Finish fixture response" }).click();
  await expect(
    page.getByText("Fixture profile saved.", { exact: true }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: info.outputPath("components.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 600 });
  const table = page.getByRole("region", { name: "Example comparison" });
  await table.focus();
  await page.keyboard.press("ArrowRight");
  expect(await table.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await page.screenshot({
    path: info.outputPath("components-320-200text.png"),
    fullPage: true,
  });
});

test("cursor links retain filters and record sections retain caller-owned drafts across history", async ({
  page,
}) => {
  await page.goto(`${origin}/list?path=custom`);
  await expect(
    page.getByText("Showing first page · custom", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Next results" }).click();
  await expect(
    page.getByRole("navigation", { name: "Example pages" }),
  ).toHaveAttribute("aria-busy", "true");
  await expect(
    page.getByText("Showing second page · custom", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Result type").selectOption("packages");
  await expect(page).toHaveURL(`${origin}/list?path=packages`);
  await expect(
    page.getByText("Showing first page · packages", { exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByText("Showing second page · custom", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "First page" }).click();
  await expect(page).toHaveURL(`${origin}/list?path=custom`);
  await page.goto(`${origin}/record?section=messages`);
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText("Order EXAMPLE-1");
  await page.getByLabel("Message draft").fill("Keep this in this record only");
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Order overview" }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("Message draft")).toHaveValue(
    "Keep this in this record only",
  );
  await expect(heading).toHaveText("Order EXAMPLE-1");
  await page.goForward();
  await expect(
    page.getByRole("heading", { name: "Order overview" }),
  ).toBeVisible();
  await expect(page.locator(".record-content")).toBeFocused();
});

test("actual catalog pagination preserves intent, returns to the first page and recovers failures", async ({
  page,
}) => {
  await page.goto(`${origin}/games?path=custom`);
  await expect(
    page.getByRole("heading", { name: "First fixture game" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Game pages" })
    .getByRole("link", { name: "Next games" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Second fixture game" }),
  ).toBeVisible();
  await expect(page).toHaveURL(`${origin}/games?path=custom&after=second`);
  await page.getByRole("link", { name: "First page", exact: true }).click();
  await expect(page).toHaveURL(`${origin}/games?path=custom`);
  await expect(
    page.getByRole("heading", { name: "First fixture game" }),
  ).toBeVisible();
  await page.goto(`${origin}/games?path=custom&after=unavailable`);
  await expect(
    page.getByRole("heading", { name: "Temporarily unavailable." }),
  ).toBeVisible();
  await expect(page.getByText("Private fixture detail")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reload page" })).toBeEnabled();
  await expect(page).toHaveURL(`${origin}/games?path=custom&after=unavailable`);
  await page.getByRole("link", { name: "Explore games" }).click();
  await expect(
    page.getByRole("heading", { name: "First fixture game" }),
  ).toBeVisible();
});
