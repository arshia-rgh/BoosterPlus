import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";

let server: ViteDevServer;
let origin: string;
test.beforeAll(async () => {
  server = await createServer({
    configFile: false,
    envDir: false,
    root: fileURLToPath(new URL("../fixtures/readability", import.meta.url)),
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

for (const width of [320, 768, 1440]) {
  test(`package facts, field alignment and FAQ spacing at ${String(width)}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${origin}/games/mobile-legends/packages/epic_to_legend`);
    const facts = page.getByRole("region", {
      name: "Included in this package",
    });
    await expect(facts).toContainText("Epic");
    await expect(facts.locator("dt")).not.toHaveCount(0);
    expect(
      await facts
        .locator("dd")
        .evaluateAll((nodes) =>
          nodes.every((node) => getComputedStyle(node).marginLeft === "0px"),
        ),
    ).toBe(true);
    const region = page.getByLabel("Region (required)", { exact: true });
    const serverInput = page.getByLabel(/Server.*\(required\)/);
    if (width >= 768) {
      const a = await region.boundingBox(),
        b = await serverInput.boundingBox();
      expect(a).not.toBeNull();
      expect(b).not.toBeNull();
      expect(Math.abs((a?.y ?? 0) - (b?.y ?? 0))).toBeLessThan(2);
    }
    await page
      .getByRole("button", { name: "Continue with this package" })
      .click();
    await expect(region).toBeFocused();
    await expect(region).toHaveAttribute("aria-invalid", "true");
    const faq = page.locator(".game-faq details").first();
    const summary = faq.locator("summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(faq).toHaveAttribute("open", "");
    const bounds = await faq.boundingBox(),
      answer = await faq.locator(".game-faq-answer p").boundingBox();
    expect((answer?.x ?? 0) - (bounds?.x ?? 0)).toBeGreaterThan(16);
    expect(
      (bounds?.y ?? 0) +
        (bounds?.height ?? 0) -
        (answer?.y ?? 0) -
        (answer?.height ?? 0),
    ).toBeGreaterThan(16);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath("package-faq.png"),
      fullPage: true,
    });
  });
}

for (const width of [1440, 390]) {
  test(`form fields and filter actions stay aligned at ${String(width)}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}/forms`);
    // FORMS172: labels sit directly above their controls in identity forms.
    const label = await page
      .locator("label", { hasText: /^Region \(optional\)$/ })
      .boundingBox();
    const region = await page
      .getByLabel("Region (optional)", { exact: true })
      .boundingBox();
    expect(label && region).toBeTruthy();
    expect(
      (region?.y ?? 0) - (label?.y ?? 0) - (label?.height ?? 0),
    ).toBeLessThanOrEqual(10);
    for (const name of ["Display name"]) {
      const text = await page
        .locator("label", { hasText: new RegExp(`^${name}$`) })
        .boundingBox();
      const input = await page.getByLabel(name, { exact: true }).boundingBox();
      expect(
        (input?.y ?? 0) - (text?.y ?? 0) - (text?.height ?? 0),
      ).toBeLessThanOrEqual(10);
    }
    // Refresh actions outside forms keep the secondary treatment.
    const refresh = page.getByRole("button", {
      name: "Refresh privacy requests",
    });
    expect((await refresh.boundingBox())?.height ?? 0).toBeLessThan(46);
    expect(
      await refresh.evaluate((node) => getComputedStyle(node).backgroundColor),
    ).toBe("rgba(0, 0, 0, 0)");
    // Filter actions start at the field column edge, below the fields, and
    // paired actions share one baseline.
    const bars = [
      ["Customer ID", ["Apply filters", "Clear filters"]],
      ["Search game or full order ID", ["Filter orders"]],
      // Narrow layouts move account filters into their drawer.
      ...(width >= 1024
        ? [["Search accounts", ["Apply account filters"]] as const]
        : []),
    ] as const;
    for (const [first, buttons] of bars) {
      const field = await page.getByLabel(first, { exact: true }).boundingBox();
      const boxes = await Promise.all(
        buttons.map((name) =>
          page.getByRole("button", { name, exact: true }).boundingBox(),
        ),
      );
      expect(field).toBeTruthy();
      expect(Math.abs((boxes[0]?.x ?? 0) - (field?.x ?? 0))).toBeLessThan(2);
      for (const box of boxes)
        expect(box?.y ?? 0).toBeGreaterThanOrEqual(
          (field?.y ?? 0) + (field?.height ?? 0),
        );
      const [a, b] = boxes;
      if (a && b && width >= 640)
        expect(Math.abs(a.y + a.height - b.y - b.height)).toBeLessThan(2);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("forms keep guidance and focus during validation and protected editing", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/forms`);
  await page
    .getByRole("button", { name: "Start conversation", exact: true })
    .click();
  await expect(
    page.getByLabel("Conversation subject", { exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Submit review for moderation" })
    .click();
  const rating = page.getByLabel("Purchase rating", { exact: true });
  await expect(rating).toBeFocused();
  const reviewWidth = await page.locator("#purchase-review").boundingBox();
  const ratingWidth = await rating.boundingBox();
  expect((ratingWidth?.width ?? 0) / (reviewWidth?.width ?? 1)).toBeGreaterThan(
    0.8,
  );
  await page.getByRole("button", { name: "Complete form" }).click();
  await page.getByRole("button", { name: "Send response" }).click();
  const edit = page.getByRole("button", { name: "Edit Access notes" });
  await expect(edit).toBeFocused();
  await expect(edit).toHaveAccessibleDescription(
    /Encrypted; never shown in message previews.*Complete this field/,
  );
  await edit.click();
  const notes = page.getByRole("textbox", {
    name: /Access notes \(required\)/,
  });
  await expect(notes).toBeFocused();
  await notes.fill("Synthetic multiline\nresponse");
  await page.getByRole("button", { name: "Hide Access notes" }).click();
  await expect(notes).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("protected-form.png"),
    fullPage: true,
  });
});

test("account descriptions and complete terms remain readable at enlarged text", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    `${origin}/games/mobile-legends/accounts/00000000-0000-4000-8000-000000000166`,
  );
  await expect(
    page.getByRole("heading", { name: /Mythic account/ }),
  ).toBeVisible();
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  const skins = page.locator(".account-skin-collection details").first();
  await skins.locator("summary").click();
  await expect(skins).toContainText("Aldous");
  await page.getByText("Sale agreement", { exact: true }).click();
  await expect(page.locator(".account-conditions")).toContainText(
    "Synthetic sale terms.",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("account-zoom.png"),
    fullPage: true,
  });
});
