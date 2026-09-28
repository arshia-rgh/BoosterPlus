import { render, screen, fireEvent } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import ArticlePromotionTarget from "./article-promotion-target";
import { useResource } from "../orders/resource";
import { emptyDefinition } from "../news/model";
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
it("retains a named off-page article, provides a reading link and requires explicit revised selection", () => {
  vi.mocked(useResource).mockImplementation((path) => ({
    data: path.includes("?after=")
      ? { items: [], next: "" }
      : {
          id: "article",
          revision_id: "new",
          game_slug: "game",
          definition: {
            ...emptyDefinition,
            title: "Reviewed title",
            slug: "current-slug",
          },
          published_at: "2026-09-28T00:00:00Z",
          updated_at: "2026-09-28T00:00:00Z",
          redirect: true,
        },
    loading: false,
    error: null,
    reload: vi.fn(),
  }));
  const change = vi.fn();
  render(
    <ArticlePromotionTarget
      slug="game"
      change={change}
      value={{
        key: "news",
        title: "Fixture",
        description: "",
        enabled: true,
        target: "news",
        package: "",
        variant: "",
        listing_id: "",
        release_id: "old",
        article_id: "article",
        article_slug: "old-slug",
        coupon_code: "",
        coupon_version: 0,
        starts_at: "",
        ends_at: "",
        priority: 0,
        show_quantity: false,
      }}
    />,
  );
  expect(screen.getByRole("heading", { name: "Reviewed title" })).toBeVisible();
  expect(
    screen.getByRole("link", {
      name: "Read current published article (opens a new tab)",
    }),
  ).toHaveAttribute("href", "/games/game/news/current-slug");
  expect(change).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Use current published article" }),
  );
  expect(change).toHaveBeenCalledWith({
    article_id: "article",
    article_slug: "current-slug",
    release_id: "new",
  });
});
