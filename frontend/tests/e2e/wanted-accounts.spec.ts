import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";

// Synthetic self-hosted fixtures; no backend, account data or external request.
const servers: ViteDevServer[] = [];
let storefront: string, admin: string;
async function serve(name: string) {
  const server = await createServer({
    configFile: false,
    envDir: false,
    // Concurrent workers must not share one dependency-optimization cache.
    cacheDir: fileURLToPath(
      new URL(
        `../../.cache/wanted-review-${name}-${process.env.TEST_WORKER_INDEX ?? "0"}`,
        import.meta.url,
      ),
    ),
    root: fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url)),
    publicDir: fileURLToPath(new URL("../../public", import.meta.url)),
    server: {
      host: "127.0.0.1",
      port: 0,
      fs: { allow: [fileURLToPath(new URL("../../../", import.meta.url))] },
    },
    logLevel: "error",
  });
  await server.listen();
  servers.push(server);
  const address = server.httpServer?.address();
  if (!address || typeof address === "string")
    throw new Error("Missing preview address");
  return `http://127.0.0.1:${String(address.port)}`;
}
test.beforeAll(async () => {
  storefront = await serve("wanted-accounts");
  admin = await serve("wanted-admin");
});
test.afterAll(async () => {
  await Promise.all(servers.map((server) => server.close()));
});
const noOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

for (const width of [320, 390, 768, 1440]) {
  test(`public wanted accounts read as plain text at ${String(width)}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${storefront}/games/mobile-legends/accounts`);
    const section = page.getByRole("region", { name: "Wanted accounts" });
    await expect(section).toBeVisible();
    await expect(section.getByText("Sell to PLAYORA")).toBeVisible();
    await expect(section.getByRole("heading", { level: 4 })).toHaveCount(3);
    await expect(
      section.getByRole("link", { name: "Sell your account" }),
    ).toHaveAttribute("href", "/sell/new?slug=mobile-legends");
    // Staff text keeps its line breaks and never becomes markup.
    const description = section.locator(".wanted-list p").first();
    await expect(description).toHaveCSS("white-space", "pre-line");
    await expect(
      section.locator("b, strong, script, a:not(.button)"),
    ).toHaveCount(0);
    // The section follows every listing, after the marketplace controls.
    const cards = await page.locator(".account-card-grid").boundingBox();
    const panel = await section.boundingBox();
    expect((panel?.y ?? 0) > (cards?.y ?? 0) + (cards?.height ?? 0)).toBe(true);
    const title = await section.locator("h4").first().boundingBox();
    const body = await description.boundingBox();
    if (width >= 768)
      expect(Math.abs((title?.y ?? 0) - (body?.y ?? 0))).toBeLessThan(4);
    else expect((body?.y ?? 0) > (title?.y ?? 0)).toBe(true);
    // The teaser stays on the same line as the existing sell link.
    const links = page.locator(".market-sell-links a");
    await expect(links).toHaveText(["Sell an account →", "Wanted accounts ↓"]);
    const [sell, teaser] = await Promise.all([
      links.nth(0).boundingBox(),
      links.nth(1).boundingBox(),
    ]);
    expect(Math.abs((sell?.y ?? 0) - (teaser?.y ?? 0))).toBeLessThan(2);
    expect(await noOverflow(page)).toBe(true);
  });
}

test("teaser moves focus to the section without changing the address", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(`${storefront}/games/mobile-legends/accounts?search=mythic`);
  const before = page.url();
  await page.getByRole("link", { name: "Wanted accounts ↓" }).click();
  const section = page.getByRole("region", { name: "Wanted accounts" });
  await expect(section).toBeFocused();
  expect(page.url()).toBe(before);
  await expect(
    section.getByRole("heading", { name: "Wanted accounts" }),
  ).toBeInViewport();
  const results = await new AxeBuilder({ page })
    .include(".wanted-accounts")
    .analyze();
  expect(results.violations).toEqual([]);
});

for (const scenario of ["none", "error"]) {
  test(`${scenario} wanted accounts leave the marketplace unchanged`, async ({
    page,
  }) => {
    await page.goto(
      `${storefront}/games/mobile-legends/accounts?wanted=${scenario}`,
    );
    await expect(page.getByText("3 accounts in this view")).toBeVisible();
    await expect(page.locator(".wanted-accounts")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Wanted accounts ↓" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Sell an account →" }),
    ).toBeVisible();
    await expect(page.locator("[role=alert]")).toHaveCount(0);
    // WANTED174: buyers can still ask for an account without a wanted list.
    const request = page.getByRole("region", {
      name: "Looking for a specific account?",
    });
    await expect(request).toBeVisible();
    await expect(request.getByRole("heading", { level: 3 })).toHaveText(
      "Looking for a specific account?",
    );
    await expect(
      request.getByRole("link", { name: "Request an account" }),
    ).toHaveAttribute("href", "/support?account_request=mobile-legends");
  });
}

for (const width of [320, 390, 768, 1440]) {
  test(`account request row follows the sell action at ${String(width)}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${storefront}/games/mobile-legends/accounts?wanted=one`);
    const section = page.getByRole("region", { name: "Wanted accounts" });
    const sell = section.getByRole("link", { name: "Sell your account" });
    const request = section.getByRole("link", { name: "Request an account" });
    await expect(request).toHaveAttribute(
      "href",
      "/support?account_request=mobile-legends",
    );
    await sell.focus();
    await page.keyboard.press("Tab");
    await expect(request).toBeFocused();
    const lead = section.locator(".account-request-row p");
    await expect(lead).toHaveText(
      "Looking for a different account? Message our team with what you want to buy.",
    );
    const [text, link, primary] = await Promise.all([
      lead.boundingBox(),
      request.boundingBox(),
      sell.boundingBox(),
    ]);
    if (width >= 768) expect((link?.x ?? 0) > (text?.x ?? 0)).toBe(true);
    else expect(Math.abs((link?.x ?? 0) - (text?.x ?? 0))).toBeLessThan(2);
    expect((link?.height ?? 0) >= 44).toBe(true);
    expect((link?.y ?? 0) > (primary?.y ?? 0)).toBe(true);
    expect(
      await request.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    ).not.toBe(
      await sell.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    );
    await expect(
      page.getByRole("region", { name: "Looking for a specific account?" }),
    ).toHaveCount(0);
    expect(await noOverflow(page)).toBe(true);
  });
}

test("neither request variant renders while the wanted read is loading", async ({
  page,
}) => {
  await page.goto(
    `${storefront}/games/mobile-legends/accounts?wanted=many&delay=wanted`,
  );
  await expect(page.getByText("3 accounts in this view")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Request an account" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Wanted accounts" }),
  ).toBeVisible({ timeout: 8000 });
  await expect(
    page.getByRole("region", { name: "Looking for a specific account?" }),
  ).toHaveCount(0);
});

for (const width of [390, 1440]) {
  test(`request link opens a prefilled support start at ${String(width)}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(`${storefront}/games/mobile-legends/accounts?wanted=none`);
    await page.getByRole("link", { name: "Request an account" }).click();
    await expect(page).toHaveURL(/\/support\?account_request=mobile-legends$/);
    const subject = page.getByLabel("Conversation subject");
    await expect(subject).toHaveValue("Account request — Mobile Legends");
    await expect(subject).toBeFocused();
    await expect(subject).toBeInViewport();
    const form = page.getByRole("group", { name: "Request an account" });
    await expect(form).toContainText(
      "Next, describe the account you want in the chat. Don’t share passwords or codes.",
    );
    await expect(page.getByText(/Questions before you order/)).toHaveCount(0);
    await expect(page.getByText(/use its Messages tab/)).toHaveCount(0);
    expect(await noOverflow(page)).toBe(true);
    await page.getByRole("button", { name: "Start conversation" }).click();
    await expect(page.getByTestId("created")).toBeVisible();
    const created = JSON.parse(
      (await page.getByTestId("created").textContent()) ?? "{}",
    ) as Record<string, unknown>;
    expect(created).toMatchObject({
      kind: "presales",
      subject: "Account request — Mobile Legends",
      slug: "mobile-legends",
    });
    expect(Object.keys(created).sort()).toEqual(
      ["kind", "order_id", "request_key", "slug", "subject"].sort(),
    );
  });
}

test("request mode keeps the subject in view above a long inbox and falls back safely", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto(
    `${storefront}/support?account_request=mobile-legends&inbox=long`,
  );
  const subject = page.getByLabel("Conversation subject");
  await expect(subject).toBeFocused();
  await expect(subject).toBeInViewport();
  for (const query of [
    "account_request=unknown-game",
    "account_request=%3Cscript%3E",
    "account_request=mobile-legends&game=error",
  ]) {
    await page.goto(`${storefront}/support?${query}`);
    // An invalid slug is the plain page: the start form stays collapsed.
    if (query.includes("%3C"))
      await page.getByText("New conversation", { exact: true }).click();
    await expect(page.getByLabel("Conversation subject")).toHaveValue("");
    await expect(
      page.getByRole("group", { name: "Start a conversation" }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("script");
  }
});

test("admin manages wanted accounts by keyboard with announcements", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${admin}/admin/wanted-accounts`);
  await expect(page).toHaveURL(/game=mobile-legends/);
  await expect(page.getByText("2 of 6 shown")).toBeVisible();
  const live = page.locator(".wanted-live");

  await page.getByRole("button", { name: "Add wanted account" }).click();
  const title = page.getByLabel(/^Title/);
  await expect(title).toBeFocused();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(title).toBeFocused();
  await expect(title).toHaveAttribute("aria-invalid", "true");
  await page.keyboard.type("Epic account with 50 skins");
  await page.getByLabel(/^Description/).fill("Any region.\n<b>Plain</b> text.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(live).toHaveText("Saved.");
  const created = page.getByText("Epic account with 50 skins", { exact: true });
  await expect(created).toBeFocused();
  await expect(page.getByText("3 of 6 shown")).toBeVisible();
  await expect(page.locator(".wanted-row-description").last()).toHaveText(
    "Any region.\n<b>Plain</b> text.",
  );

  const up = page.getByRole("button", {
    name: "Move up: Epic account with 50 skins",
  });
  await up.click();
  await expect(live).toHaveText("Moved to position 3 of 4.");
  await expect(up).toBeFocused();

  const hide = page.getByRole("button", {
    name: "Hide: Epic account with 50 skins",
  });
  await hide.click();
  await expect(live).toHaveText("Hidden.");
  await expect(
    page.getByRole("button", { name: "Show: Epic account with 50 skins" }),
  ).toBeFocused();

  await page
    .getByRole("button", { name: "Delete: Epic account with 50 skins" })
    .click();
  const keep = page.getByRole("button", { name: "Keep" });
  await expect(keep).toBeFocused();
  await expect(
    page.getByText(
      "Delete “Epic account with 50 skins”? This can't be undone.",
    ),
  ).toBeVisible();
  await keep.press("Enter");
  await expect(
    page.getByRole("button", { name: "Delete: Epic account with 50 skins" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(live).toHaveText("Deleted.");
  await expect(created).toHaveCount(0);
  const results = await new AxeBuilder({ page })
    .include(".wanted-admin")
    .analyze();
  expect(results.violations).toEqual([]);
});

test("admin limits, closed games and conflicts keep drafts", async ({
  page,
}) => {
  await page.goto(`${admin}/admin/wanted-accounts?stage=full`);
  await expect(
    page.getByRole("button", { name: "Add wanted account" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Up to 20 per game. Delete one to add another."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Show: Synthetic request 7" }),
  ).toBeDisabled();
  // W2-03: the limit hint sits directly under the checkbox text.
  await page.getByRole("button", { name: "Edit: Synthetic request 8" }).click();
  const gap = await page.locator(".wanted-form").evaluate((element) => {
    const label = element.querySelector(".catalog-check");
    const hint = element.querySelector(".check-hint");
    if (!label || !hint) return -1;
    const range = document.createRange();
    range.selectNodeContents(label);
    const text = Math.max(
      ...[...range.getClientRects()]
        .filter((rect) => rect.width > 20)
        .map((rect) => rect.bottom),
    );
    return hint.getBoundingClientRect().top - text;
  });
  expect(gap).toBeGreaterThanOrEqual(0);
  expect(gap).toBeLessThanOrEqual(8);
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.goto(`${admin}/admin/wanted-accounts?stage=closed`);
  await expect(
    page.getByText(
      "Not shown on the site: this game isn't accepting account sales.",
    ),
  ).toBeVisible();

  await page.goto(`${admin}/admin/wanted-accounts?stage=empty`);
  await expect(
    page.getByText("No wanted accounts for Mobile Legends yet."),
  ).toBeVisible();

  await page.goto(`${admin}/admin/wanted-accounts?stage=conflict`);
  await page.getByRole("button", { name: /^Edit: Mythical Glory/ }).click();
  await page.getByLabel(/^Title/).fill("My unsaved title");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByText("This list changed in another session."),
  ).toBeVisible();
  // W1-04: keyboard users land on the recovery action, then back in the form.
  await expect(page.getByRole("button", { name: "Reload list" })).toBeFocused();
  await expect(page.getByLabel(/^Title/)).toHaveValue("My unsaved title");
  await page.keyboard.press("Enter");
  await expect(page.locator(".wanted-live")).toHaveText("List reloaded.");
  await expect(page.getByLabel(/^Title/)).toBeFocused();
  await expect(
    page.getByText("This list changed in another session."),
  ).toHaveCount(0);
  await expect(page.getByLabel(/^Title/)).toHaveValue("My unsaved title");
  expect(await noOverflow(page)).toBe(true);

  // A server-side shown limit focuses the checkbox it concerns.
  await page.goto(`${admin}/admin/wanted-accounts?stage=race`);
  await page.getByRole("button", { name: "Add wanted account" }).click();
  await page.getByLabel(/^Title/).fill("Race");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByLabel("Show on the site")).toBeFocused();
  await expect(page.getByLabel("Show on the site")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  // W2-01/W2-02: the real validation message follows the form's legend.
  const form = page.locator(".wanted-new");
  await expect(form.getByRole("alert").first()).toHaveText(
    "Check the highlighted fields before continuing.",
  );
  await expect(page.getByText("The service is unavailable")).toHaveCount(0);
  const order = await form.evaluate((element) =>
    ["legend", "p[role=alert]", ".catalog-issues", ".catalog-label"].map(
      (selector) => {
        const box = element.querySelector(selector)?.getBoundingClientRect();
        return [Math.round(box?.x ?? -1), Math.round(box?.y ?? -1)] as const;
      },
    ),
  );
  expect(new Set(order.map(([x]) => x)).size).toBe(1);
  expect(order.map(([, y]) => y)).toEqual(
    [...order.map(([, y]) => y)].sort((a, b) => a - b),
  );
});

test("admin row actions wrap flush left and the form has no frame", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto(`${admin}/admin/wanted-accounts`);
  const actions = page.locator(".wanted-row-actions").first();
  const starts = await actions.evaluate((element) =>
    [...element.children].map((child) => {
      const box = child.getBoundingClientRect();
      return [Math.round(box.x), Math.round(box.y)] as const;
    }),
  );
  const lines = new Map<number, number>();
  for (const [x, y] of starts) lines.set(y, Math.min(lines.get(y) ?? x, x));
  expect(new Set(lines.values()).size).toBe(1);
  await page.getByRole("button", { name: "Add wanted account" }).click();
  const fieldset = page.getByRole("group", { name: "Add wanted account" });
  await expect(fieldset).toHaveCSS("border-top-width", "0px");
  expect(await noOverflow(page)).toBe(true);
});
