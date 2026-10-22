import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, type Plugin, type ViteDevServer } from "vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Synthetic self-hosted ACCOUNTS175 fixture; no backend, account data or external request.
const fixture = fileURLToPath(
  new URL("../fixtures/account-ownership", import.meta.url),
);
const sample = readFileSync(`${fixture}/sample.png`);
// Admin artwork previews are image requests, not fetch calls; serve one synthetic image.
const artwork: Plugin = {
  name: "account-ownership-artwork",
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      if (
        request.method === "GET" &&
        request.url?.startsWith("/api/v1/admin/artwork/")
      ) {
        response.setHeader("Content-Type", "image/png");
        response.end(sample);
        return;
      }
      next();
    });
  },
};
let server: ViteDevServer, origin: string;
test.beforeAll(async () => {
  server = await createServer({
    configFile: false,
    envDir: false,
    plugins: [artwork],
    cacheDir: fileURLToPath(
      new URL(
        `../../.cache/account-ownership-${process.env.TEST_WORKER_INDEX ?? "0"}`,
        import.meta.url,
      ),
    ),
    root: fixture,
    publicDir: fileURLToPath(new URL("../../public", import.meta.url)),
    server: {
      host: "127.0.0.1",
      port: 0,
      fs: { allow: [fileURLToPath(new URL("../../../", import.meta.url))] },
    },
    logLevel: "error",
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string")
    throw new Error("Missing preview address");
  origin = `http://127.0.0.1:${String(address.port)}`;
});
test.afterAll(async () => {
  await server.close();
});
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const noOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const shots = process.env.ACCOUNTS175_SHOTS;
async function capture(page: Page, name: string) {
  if (shots)
    await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

for (const width of [320, 390, 768, 1440]) {
  test(`inventory separates ownership at ${String(width)}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}/admin/accounts`);
    const group = page.getByRole("group", { name: "Ownership" });
    await expect(group.getByRole("link", { name: /^All/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(group).toContainText("PLAYORA-owned5");
    await expect(group).toContainText("Seller consignment2");
    const rows = page.locator(".account-inventory-row");
    await expect(rows).toHaveCount(7);
    await expect(group).toContainText("All7");
    await expect(page.getByText("Created by staff")).toHaveCount(3);
    await expect(page.getByText("Bought from seller")).toHaveCount(2);
    await expect(page.getByText("Listed for a seller")).toHaveCount(2);
    await expect(
      page.getByText(
        "On sale: no seller payout. The seller is paid before publication. Seller payout not confirmed yet.",
      ),
    ).toBeVisible();
    await expect(page.getByText("Untitled reviewed account")).toBeVisible();
    await expect(
      rows.first().locator(".ownership-chip[data-ownership=playora]"),
    ).toHaveCSS("border-top-color", "rgb(231, 199, 138)");
    expect(await noOverflow(page)).toBe(true);
    // Whole pills wrap; no label is broken inside a pill.
    for (const pill of await group.getByRole("link").all()) {
      const box = await pill.boundingBox();
      expect(box?.height ?? 0).toBeLessThan(60);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    if (width === 390) {
      const button = await page
        .getByRole("button", { name: "Add a PLAYORA account" })
        .boundingBox();
      expect(button?.width ?? 0).toBeGreaterThan(300);
    }
    const axe = await new AxeBuilder({ page })
      .include(".account-inventory")
      .analyze();
    expect(axe.violations).toEqual([]);
    await capture(page, `inventory-${info.project.name}-${String(width)}`);
  });
}

test("ownership and status filters persist in the URL and through the editor", async ({
  page,
}) => {
  await page.goto(`${origin}/admin/accounts`);
  const group = page.getByRole("group", { name: "Ownership" });
  await group.getByRole("link", { name: /^Seller consignment/ }).click();
  await expect(page).toHaveURL(/\?owner=consignment$/);
  await expect(page.locator(".account-inventory-row")).toHaveCount(2);
  await expect(
    group.getByRole("link", { name: /^Seller consignment/ }),
  ).toHaveAttribute("aria-current", "true");
  await page.getByLabel("Status").selectOption("withdrawn");
  await expect(page).toHaveURL(/\?owner=consignment&state=withdrawn$/);
  await expect(page.locator(".account-inventory-row")).toHaveCount(1);
  await expect(group).toContainText("PLAYORA-owned0");
  await page.goBack();
  await expect(page).toHaveURL(/\?owner=consignment$/);
  await page.goForward();
  await expect(page.getByLabel("Status")).toHaveValue("withdrawn");
  await page.getByRole("link", { name: "Grandmaster starter account" }).click();
  await expect(page.locator(".ownership-panel")).toContainText(
    "Listed for a seller",
  );
  await page.locator(".context-back").click();
  await expect(page).toHaveURL(/\?owner=consignment&state=withdrawn$/);
  await expect(page.getByLabel("Status")).toHaveValue("withdrawn");
  await page.goto(`${origin}/admin/accounts?owner=mine`);
  await expect(page).toHaveURL(`${origin}/admin/accounts`);
  await page.getByLabel("Status").selectOption("sold");
  await group.getByRole("link", { name: /^Seller consignment/ }).click();
  await expect(
    page.getByText("No seller consignment listings are sold."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show all statuses" }).click();
  await expect(page).toHaveURL(/\?owner=consignment$/);
});

test("empty and failed inventory states", async ({ page }, info) => {
  await page.goto(`${origin}/admin/accounts?stage=empty`);
  await expect(page.getByText("No account listings yet.")).toBeVisible();
  await page
    .getByRole("group", { name: "Ownership" })
    .getByRole("link", { name: /^PLAYORA-owned/ })
    .click();
  await expect(
    page.getByText(
      "No PLAYORA-owned listings yet. Add one, or accept a buy-before-resale seller offer.",
    ),
  ).toBeVisible();
  await capture(page, `empty-${info.project.name}`);
  await page.goto(`${origin}/admin/accounts?stage=error`);
  await expect(
    page.getByRole("button", { name: "Retry inventory" }),
  ).toBeVisible();
  await capture(page, `error-${info.project.name}`);
});

test("creates one private draft, recovering an uncertain result with the same request", async ({
  page,
}, info) => {
  await page.goto(`${origin}/admin/accounts?stage=uncertain&owner=playora`);
  const add = page.getByRole("button", { name: "Add a PLAYORA account" });
  await add.click();
  await expect(add).toBeDisabled();
  const game = page.getByLabel("Game (required)");
  await expect(game).toBeFocused();
  await expect(
    game.locator("option", { hasText: "Honor of Kings (account sales off)" }),
  ).toHaveCount(1);
  await capture(page, `create-open-${info.project.name}`);
  await page.getByRole("button", { name: "Create private draft" }).click();
  await expect(game).toHaveAttribute("aria-invalid", "true");
  await expect(game).toBeFocused();
  await expect(page.getByText("Choose a game.").first()).toBeVisible();
  await expect(
    page.getByText("Enter a title of 1–120 characters.").first(),
  ).toBeVisible();
  await capture(page, `create-validation-${info.project.name}`);
  await game.selectOption({ label: "Mobile Legends" });
  await page
    .getByLabel("Public account title")
    .fill("Mythic account, 120 heroes");
  await page.getByRole("button", { name: "Create private draft" }).dblclick();
  const warning = page.getByRole("alert").filter({
    hasText: /couldn't confirm the draft was created/,
  });
  await expect(warning).toBeFocused();
  await expect(page.getByLabel("Public account title (required)")).toHaveValue(
    "Mythic account, 120 heroes",
  );
  await capture(page, `create-uncertain-${info.project.name}`);
  await page.getByRole("button", { name: "Create private draft" }).click();
  await expect(page).toHaveURL(
    /\/admin\/accounts\/[0-9a-f-]{36}\?section=details$/,
  );
  await expect(page.getByText("Created by staff")).toBeVisible();
  expect(await page.evaluate(() => document.body.dataset.creates)).toBe("2");
  await page.locator(".context-back").click();
  await expect(page).toHaveURL(/owner=playora/);
  await expect(
    page.getByRole("link", { name: "Mythic account, 120 heroes" }),
  ).toHaveCount(1);
});

test("a typed new listing asks before it is discarded", async ({ page }) => {
  await page.goto(`${origin}/admin/accounts`);
  await page.getByRole("button", { name: "Add a PLAYORA account" }).click();
  await page.getByLabel("Public account title").fill("Typed but unsaved");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("alert")).toBeFocused();
  await page.getByRole("button", { name: "Keep new listing" }).click();
  await expect(page.getByLabel("Public account title")).toHaveValue(
    "Typed but unsaved",
  );
  await page.getByRole("link", { name: "Seller submissions" }).click();
  await expect(
    page.getByRole("heading", { name: "Discard this new listing?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Discard new listing" }).click();
  await expect(page).toHaveURL(/\/admin\/submissions$/);
});

for (const width of [390, 1440]) {
  test(`PLAYORA editor has no seller sections at ${String(width)}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${origin}/admin/accounts/${id(1)}?section=details`);
    const panel = page.locator(".ownership-panel");
    await expect(panel).toContainText("PLAYORA-owned");
    await expect(panel).toContainText("Created by staff");
    await expect(panel).toContainText("No seller payout.");
    await expect(
      page.getByRole("link", { name: "Seller agreement and sale progress" }),
    ).toHaveCount(0);
    await expect(
      page.getByLabel("Account base price (USD)"),
    ).toHaveAccessibleDescription(
      "Enter dollars, for example 100.00. The buyer pays 5% more.",
    );
    expect(await noOverflow(page)).toBe(true);
    await capture(
      page,
      `editor-staff-details-${info.project.name}-${String(width)}`,
    );
    await page
      .getByRole("link", { name: "Preview & publication" })
      .first()
      .click();
    const readiness = page.getByRole("region", {
      name: "Publication requirements",
    });
    await expect(
      readiness.getByRole("link", { name: "Complete listing details" }),
    ).toBeVisible();
    await expect(
      readiness.getByRole("link", {
        name: "Check the listing price and commissions",
      }),
    ).toBeVisible();
    await expect(
      page.getByLabel(/I confirm PLAYORA owns this account/),
    ).toBeVisible();
    await capture(
      page,
      `editor-staff-publication-${info.project.name}-${String(width)}`,
    );
  });
}

test("staff uploads account images into the gallery and stops at eight", async ({
  page,
}, info) => {
  await page.goto(`${origin}/admin/accounts/${id(1)}?section=images`);
  await expect(page.getByText("Add an account image")).toBeVisible();
  await expect(page.getByText("Existing artwork path")).toHaveCount(0);
  await page
    .getByLabel("Choose an image")
    .setInputFiles(`${fixture}/sample.png`);
  await page.getByRole("button", { name: "Prepare image versions" }).click();
  await page.getByRole("button", { name: "Use this image" }).click();
  await expect(
    page.getByRole("group", { name: "Reviewed image 1" }),
  ).toBeVisible();
  await expect(page.getByText("You have unsaved changes")).toBeVisible();
  await page
    .getByLabel("Account title image")
    .selectOption({ label: "Reviewed image 1" });
  await capture(page, `editor-images-${info.project.name}`);
  await page.goto(
    `${origin}/admin/accounts/${id(1)}?section=images&stage=full`,
  );
  await expect(
    page.getByText("8 images added. Remove one to add another."),
  ).toBeVisible();
  await expect(page.getByLabel("Choose an image")).toBeDisabled();
  await capture(page, `editor-images-full-${info.project.name}`);
});

test("publishes a ready PLAYORA listing and explains closed account sales", async ({
  page,
}, info) => {
  await page.goto(
    `${origin}/admin/accounts/${id(1)}?section=publication&stage=ready`,
  );
  await page.getByLabel(/I confirm PLAYORA owns this account/).check();
  await page.getByRole("button", { name: "Show listing preview" }).click();
  await page.getByRole("button", { name: "Publish account listing" }).click();
  await expect(
    page.getByText(
      "Published. Buyers can now find this account on the Mobile Legends Accounts page.",
    ),
  ).toBeFocused();
  await expect(page.getByText(/This account is live/)).toHaveCount(0);
  await capture(page, `editor-published-${info.project.name}`);
  await page.goto(
    `${origin}/admin/accounts/${id(1)}?section=publication&stage=unavailable`,
  );
  await expect(
    page.getByRole("link", { name: "Enable account sales for this game" }),
  ).toBeVisible();
  // Closed account sales block publication before any request is sent.
  await page.getByLabel(/I confirm PLAYORA owns this account/).check();
  await page.getByRole("button", { name: "Show listing preview" }).click();
  await expect(
    page.getByRole("button", { name: "Publish account listing" }),
  ).toBeDisabled();
  await capture(page, `editor-unavailable-${info.project.name}`);
});

for (const [n, origin_, wording] of [
  [6, "Bought from seller", /I confirm PLAYORA owns this account/],
  [
    5,
    "Listed for a seller",
    /I reviewed every public field and selected image/,
  ],
] as const) {
  test(`seller-sourced editor keeps its seller sections: ${origin_}`, async ({
    page,
  }, info) => {
    await page.goto(`${origin}/admin/accounts/${id(n)}?section=details`);
    const panel = page.locator(".ownership-panel");
    await expect(panel).toContainText(origin_);
    await expect(
      page.getByRole("link", { name: "Seller agreement and sale progress" }),
    ).toBeVisible();
    if (n === 6)
      await expect(panel).toContainText(
        "The seller payout is not confirmed yet",
      );
    else
      await expect(
        page.getByLabel("Account base price (USD)"),
      ).toHaveAccessibleDescription(/must match the accepted seller agreement/);
    await page
      .getByRole("link", { name: "Preview & publication" })
      .first()
      .click();
    await expect(page.getByLabel(wording)).toBeVisible();
    await capture(
      page,
      `editor-${n === 6 ? "buy-first" : "consignment"}-${info.project.name}`,
    );
  });
}

test("create panel focuses its heading while games load, then the game list", async ({
  page,
}, info) => {
  await page.goto(`${origin}/admin/accounts?stage=slow`);
  await page
    .getByRole("button", { name: "Add a PLAYORA account" })
    .click({ timeout: 10000 });
  await expect(page.getByText("New PLAYORA-owned listing")).toBeFocused();
  await capture(page, `create-slow-${info.project.name}`);
  await expect(page.getByLabel("Game (required)")).toBeFocused({
    timeout: 5000,
  });
});

for (const width of [320, 390, 768, 1440]) {
  test(`toolbar, actions and meta line lay out cleanly at ${String(width)}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}/admin/accounts`);
    const refresh = page.getByRole("button", { name: "Refresh inventory" });
    await expect(refresh).toHaveClass(/secondary/);
    const status = await page.getByLabel("Status").boundingBox();
    const button = await refresh.boundingBox();
    if (width >= 768)
      // Refresh stays beside Status rather than wrapping onto its own row.
      expect(
        Math.abs(
          (button?.y ?? 0) +
            (button?.height ?? 0) -
            ((status?.y ?? 0) + (status?.height ?? 0)),
        ),
      ).toBeLessThan(12);
    const add = await page
      .getByRole("button", { name: "Add a PLAYORA account" })
      .boundingBox();
    const link = await page
      .getByRole("link", { name: "Seller submissions" })
      .boundingBox();
    if (width < 768)
      expect(Math.abs((add?.x ?? 0) - (link?.x ?? 0))).toBeLessThan(2);
    await expect(
      page.locator(".account-inventory-meta").first(),
    ).not.toContainText("·");
    await capture(page, `toolbar-${info.project.name}-${String(width)}`);
  });
}

test("record line, card summary and uploader use listing-specific wording", async ({
  page,
}, info) => {
  await page.goto(`${origin}/admin/accounts/${id(5)}?section=details`);
  await expect(page.locator(".record-context-line span")).toHaveText("Paused");
  await expect(
    page.getByText("Check the seller’s claims before publication.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.goto(`${origin}/admin/accounts/${id(1)}?section=details`);
  await expect(page.getByText(/uses its earlier price/)).toHaveCount(0);
  await expect(
    page.getByText(
      "Customers see these facts before opening the listing. Check each fact against the account before publication.",
    ),
  ).toBeVisible();
  await capture(page, `editor-staff-new-draft-${info.project.name}`);
  await page.goto(`${origin}/admin/accounts/${id(1)}?section=images`);
  await expect(
    page.getByText("Images stay private until the listing is published."),
  ).toBeVisible();
  await page
    .getByLabel("Choose an image")
    .setInputFiles(`${fixture}/sample.png`);
  await page.getByRole("button", { name: "Prepare image versions" }).click();
  await page.getByRole("button", { name: "Use this image" }).click();
  await expect(
    page.getByText("Image added. Save the listing to keep it."),
  ).toBeVisible();
  await capture(page, `editor-images-added-${info.project.name}`);
  await page.goto(
    `${origin}/admin/accounts/${id(1)}?section=images&stage=full`,
  );
  const input = page.getByLabel("Choose an image");
  await expect(input).toHaveAccessibleDescription(
    /8 images added\. Remove one to add another\./,
  );
  await expect(input).toHaveCSS("opacity", "0.45");
});
