import { render, screen } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import List, { meta as adminMeta } from "./news-admin";
import Editor, { meta as editorMeta } from "./news-editor-admin";
import Index, { headers as indexHeaders, meta as indexMeta } from "./game-news";
import Article, {
  headers as articleHeaders,
  meta as articleMeta,
} from "./game-article";
import { emptyDefinition } from "../news/model";
vi.mock("../identity/identity", () => ({
  default: ({
    children,
    capability,
  }: {
    children: ReactNode;
    capability: string;
  }) => <section aria-label={capability}>{children}</section>,
}));
vi.mock("../news/list", () => ({
  Articles: () => <p>Private editorial list</p>,
}));
vi.mock("../news/editor", () => ({
  ArticleEditor: () => <p>Private editor</p>,
}));
vi.mock("../news/public", () => ({
  NewsIndex: () => <p>Game news</p>,
  NewsArticle: () => <p>Published article</p>,
}));
it("mounts separate protected editorial routes and public game-local readers", () => {
  render(
    <>
      <List />
      <Editor />
      <Index />
      <Article />
    </>,
  );
  expect(screen.getAllByRole("region", { name: "admin" })).toHaveLength(2);
  expect(screen.getByText("Game news")).toBeVisible();
  expect(screen.getByText("Published article")).toBeVisible();
  expect(adminMeta()).toContainEqual({ title: "Articles — PLAYORA" });
  expect(editorMeta()).toContainEqual({ title: "Article editor — PLAYORA" });
  expect(indexHeaders()["Cache-Control"]).toBe("no-store");
  expect(articleHeaders()["Cache-Control"]).toBe("no-store");
});
it("provides canonical published metadata only from the configured origin and excludes unavailable articles", () => {
  expect(articleMeta({ data: undefined })).toContainEqual({
    name: "robots",
    content: "noindex",
  });
  expect(indexMeta({ data: undefined })).toContainEqual({
    name: "robots",
    content: "noindex",
  });
  const data = {
    article: {
      id: "fixture",
      revision_id: "revision",
      game_slug: "fixture-game",
      definition: {
        ...emptyDefinition,
        title: "Public fixture",
        summary: "Published summary",
        slug: "fixture-guide",
      },
      published_at: "2026-09-28T00:00:00Z",
      updated_at: "2026-09-28T00:00:00Z",
      redirect: false,
    },
    related: [],
    relatedUnavailable: false,
    origin: "https://playora.example",
  };
  const meta = articleMeta({ data });
  expect(articleMeta({ data: { ...data, origin: null } })).not.toContainEqual(
    expect.objectContaining({ rel: "canonical" }),
  );
  expect(
    articleMeta({
      data: {
        ...data,
        article: {
          ...data.article,
          definition: {
            ...data.article.definition,
            asset: "/assets/catalog/fixture.webp",
          },
        },
      },
    }),
  ).toContainEqual({
    property: "og:image",
    content: "https://playora.example/assets/catalog/fixture.webp",
  });
  expect(
    indexMeta({
      data: {
        page: { items: [], next: "" },
        slug: "fixture-game",
        origin: "https://playora.example",
      },
    }),
  ).toContainEqual({
    tagName: "link",
    rel: "canonical",
    href: "https://playora.example/games/fixture-game/news",
  });
  expect(
    indexMeta({
      data: {
        page: { items: [], next: "" },
        slug: "fixture-game",
        origin: null,
      },
    }),
  ).not.toContainEqual(expect.objectContaining({ rel: "canonical" }));
  expect(meta).toContainEqual({
    tagName: "link",
    rel: "canonical",
    href: "https://playora.example/games/fixture-game/news/fixture-guide",
  });
  expect(meta).toContainEqual({
    name: "description",
    content: "Published summary",
  });
});
