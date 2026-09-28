import { it, expect, vi, afterEach } from "vitest";
import { loadArticle, loadNews } from "./loaders.server";
import { emptyDefinition } from "./model";
const value = {
  id: "fixture",
  game_slug: "fixture-game",
  revision_id: "fixture-revision",
  definition: {
    ...emptyDefinition,
    title: "Published title",
    slug: "published-title",
  },
  published_at: "2026-09-28T00:00:00Z",
  updated_at: "2026-09-28T00:00:00Z",
  redirect: false,
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("keeps the reader available when related discovery fails and never uses request origin for API fetch", async () => {
  vi.stubEnv("API_ORIGIN", "http://127.0.0.1:8080");
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json(value))
    .mockRejectedValueOnce(new Error("Related offline"));
  vi.stubGlobal("fetch", fetcher);
  const data = await loadArticle({
    request: new Request(
      "https://untrusted.example/games/fixture-game/news/published-title",
    ),
    params: { slug: "fixture-game", article: "published-title" },
  });
  expect(data.article.definition.title).toBe("Published title");
  expect(data.relatedUnavailable).toBe(true);
  expect(String(fetcher.mock.calls[0]?.[0])).toBe(
    "http://127.0.0.1:8080/api/v1/games/fixture-game/news/published-title",
  );
});
it("redirects only the known current same-game slug and preserves bounded reading filters", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ ...value, redirect: true })),
  );
  try {
    await loadArticle({
      request: new Request(
        "https://playora.example/games/fixture-game/news/old?kind=guide&next=https://evil.test",
      ),
      params: { slug: "fixture-game", article: "old" },
    });
    expect.fail("Redirect required");
  } catch (error) {
    expect(error).toBeInstanceOf(Response);
    if (error instanceof Response) {
      expect(error.headers.get("Location")).toBe(
        "/games/fixture-game/news/published-title?kind=guide",
      );
      expect(error.headers.get("Cache-Control")).toBe("no-store");
    }
  }
});
it("fails private or unpublished reader routes closed", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("", { status: 404 })),
  );
  await expect(
    loadNews({
      request: new Request("https://playora.example/games/fixture-game/news"),
      params: { slug: "fixture-game" },
    }),
  ).rejects.toMatchObject({ status: 404 });
});
