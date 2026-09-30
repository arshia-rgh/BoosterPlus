import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn, enroll, fixture } from "./identity-fixtures";
async function capture(page: Page, name: string, desktop: boolean) {
  for (const width of desktop ? [1440, 768] : [393, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const screenshot = await page.screenshot({
      path: `.cache/di12-news-${name}-${String(width)}.png`,
      fullPage: true,
    });
    const expectedWidth = await page.evaluate(
      () => innerWidth * devicePixelRatio,
    );
    expect(screenshot.readUInt32BE(16)).toBeLessThanOrEqual(
      Math.ceil(expectedWidth) + 1,
    );
    expect(
      await page.evaluate(
        () =>
          Math.max(
            document.body.scrollWidth,
            document.documentElement.scrollWidth,
          ) <= innerWidth,
      ),
    ).toBe(true);
  }
}
test("staff article draft, exact preview, publication, game reading, correction and unpublish", async ({
  page,
  request,
}, info) => {
  test.setTimeout(180000);
  await signIn(
    page,
    request,
    fixture(info.project.name, "newseditor"),
    "/admin/login",
  );
  await enroll(page);
  const id = fixture(info.project.name, "news_article"),
    slug = fixture(info.project.name, "news_slug"),
    game = fixture(info.project.name, "news_game");
  const source = new URLSearchParams({ game, q: id, state: "draft" });
  await page.goto(`/admin/news?${source.toString()}`);
  const titleSearch = page.getByLabel("Search article title or reference");
  const authorSearch = page.getByLabel("Author filter", { exact: true });
  await titleSearch.fill("Other guide");
  await authorSearch.fill("Different author");
  await page
    .getByRole("button", { name: "Search articles", exact: true })
    .click();
  await expect(page).toHaveURL(/author=Different\+author/);
  await page.goBack();
  await expect(titleSearch).toHaveValue(id);
  await expect(authorSearch).toHaveValue("");
  await page.goForward();
  await expect(titleSearch).toHaveValue("Other guide");
  await expect(authorSearch).toHaveValue("Different author");
  await page.goBack();
  await expect(titleSearch).toHaveValue(id);
  await expect(authorSearch).toHaveValue("");
  await page.screenshot({
    path: `.cache/di15-news-filter-history-${info.project.name}.png`,
  });
  await page
    .getByRole("link", { name: "Edit Synthetic guide", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: `Article ${id}`, exact: true })
      .getByText("Editorial fixture game", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Synthetic reader guide");
  await page.getByRole("link", { name: "Preview", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Synthetic guide", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Write", exact: true }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Synthetic reader guide",
  );
  await page
    .getByLabel(
      "I reviewed accuracy, attribution and all media rights for this revision",
      { exact: true },
    )
    .check();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText(/^Saved revision \d+\.$/)).toBeVisible();
  await capture(page, "editor", info.project.name === "desktop");
  await page.getByRole("link", { name: "Preview", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Synthetic reader guide", exact: true }),
  ).toBeVisible();
  await capture(page, "preview", info.project.name === "desktop");
  await page.getByRole("link", { name: "Publication", exact: true }).click();
  await page
    .getByLabel(
      "I previewed and approve this exact saved revision and publication change",
      { exact: true },
    )
    .check();
  await capture(page, "publication", info.project.name === "desktop");
  await page
    .getByRole("button", { name: "Publish saved revision now", exact: true })
    .click();
  await expect(
    page.getByText("Article publish action saved.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Back to articles", exact: false })
    .click();
  await expect(page).toHaveURL(new RegExp(`q=${id}`));
  await expect(page.getByText(/No articles match these filters/)).toBeVisible();
  await page.goto(`/admin/catalog?game=${game}&section=catalog-offers`);
  await page
    .getByRole("button", { name: "Add featured offer", exact: true })
    .click();
  await page
    .getByLabel("Offer title", { exact: true })
    .fill("Featured editorial guide");
  await page
    .getByLabel("Offer description", { exact: true })
    .fill(
      "Read this reviewed fixture guide. Editorial content has no purchase price.",
    );
  await page.getByLabel("Offer type", { exact: true }).selectOption("news");
  await page.getByLabel("Published article", { exact: true }).selectOption(id);
  await expect(
    page.getByRole("heading", { name: "Synthetic reader guide", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Read current published article (opens a new tab)",
      exact: true,
    }),
  ).toHaveAttribute("target", "_blank");
  await page
    .getByLabel("Starts at (UTC)", { exact: true })
    .fill(new Date(Date.now() - 3600000).toISOString());
  await page
    .getByLabel("Ends at (UTC)", { exact: true })
    .fill(new Date(Date.now() + 3600000).toISOString());
  await page
    .getByLabel("Include this offer when the catalog is published", {
      exact: true,
    })
    .check();
  await capture(page, "featured-editor", info.project.name === "desktop");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Changes saved.", { exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: "Review & publish", exact: true })
    .click();
  await page
    .getByLabel(
      "I verified the actual rank/option data, availability, prices and customer promises, including any win-rate terms.",
      { exact: true },
    )
    .check();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Changes saved.", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Preview saved draft", exact: true })
    .click();
  await expect(
    page.getByText("Publication checks passed.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Publish catalog", exact: true })
    .click();
  await expect(
    page.getByText("Catalog published.", { exact: true }),
  ).toBeVisible();
  await page.goto(`/games/${slug}`);
  await expect(
    page.getByRole("heading", {
      name: "Featured editorial guide",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".featured-offer .featured-price")).toHaveCount(0);
  await capture(page, "featured-public", info.project.name === "desktop");
  await page.getByRole("link", { name: /News.*Read staff-written/ }).click();
  await page
    .getByLabel("Search news and guides", { exact: true })
    .fill("Synthetic reader");
  await page
    .getByRole("button", { name: "Search articles", exact: true })
    .click();
  await capture(page, "index", info.project.name === "desktop");
  await page
    .getByRole("link", { name: "Synthetic reader guide", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Synthetic reader guide", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", {
      name: "Synthetic patch comparison",
      exact: true,
    }),
  ).toBeVisible();
  await capture(page, "article", info.project.name === "desktop");
  await page
    .getByRole("link", { name: "Back to news & guides", exact: false })
    .click();
  await expect(
    page.getByLabel("Search news and guides", { exact: true }),
  ).toHaveValue("Synthetic reader");
  await page.goto(`/admin/news/${id}`);
  await page
    .getByLabel("Article URL slug", { exact: true })
    .fill("synthetic-corrected-guide");
  await page
    .getByLabel(
      "I reviewed accuracy, attribution and all media rights for this revision",
      { exact: true },
    )
    .check();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText(/^Saved revision \d+\.$/)).toBeVisible();
  await page.getByRole("link", { name: "Preview", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Synthetic reader guide", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Publication", exact: true }).click();
  await page
    .getByLabel(
      "I previewed and approve this exact saved revision and publication change",
      { exact: true },
    )
    .check();
  await page
    .getByRole("button", { name: "Publish saved revision now", exact: true })
    .click();
  await expect(
    page.getByText("Article publish action saved.", { exact: true }),
  ).toBeVisible();
  await page.goto(`/games/${slug}/news/synthetic-guide?q=Synthetic`);
  await expect(page).toHaveURL(
    new RegExp("synthetic-corrected-guide\\?q=Synthetic"),
  );
  await page.goto(`/admin/catalog?game=${game}&section=catalog-offers`);
  await expect(
    page.getByText(
      "This article has changed. The old featured revision is no longer shown. Review the current article before replacing it.",
      { exact: true },
    ),
  ).toBeVisible();
  await capture(page, "featured-revised", info.project.name === "desktop");
  await page.goto(`/games/${slug}/news/synthetic-corrected-guide?q=Synthetic`);
  await page.route("**/catalog-assets/game-placeholder.svg", async (route) => {
    await route.abort();
  });
  await page.reload();
  await expect(
    page.getByText("Artwork unavailable", { exact: true }).first(),
  ).toBeVisible();
  await capture(page, "fallback", info.project.name === "desktop");
  await page.goto(`/admin/news/${id}?section=publication`);
  await page
    .getByLabel(
      "I previewed and approve this exact saved revision and publication change",
      { exact: true },
    )
    .check();
  await page
    .getByRole("button", { name: "Unpublish article", exact: true })
    .click();
  await expect(
    page.getByText("Article unpublish action saved.", { exact: true }),
  ).toBeVisible();
  await page.goto(`/games/${slug}/news/synthetic-guide?q=Synthetic`);
  await expect(
    page.getByRole("heading", {
      name: "This article is unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await capture(page, "unavailable", info.project.name === "desktop");
  await page
    .getByRole("link", { name: "Back to news & guides", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No articles found", exact: true }),
  ).toBeVisible();
});
