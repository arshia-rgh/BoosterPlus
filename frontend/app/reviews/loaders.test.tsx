import { afterEach, expect, it, vi } from "vitest";
import { loadReviews } from "./loaders.server";
import { emptyConfiguration } from "../catalog/model";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("keeps feedback fetches on the configured authority and forwards only supported filters", async () => {
  vi.stubEnv("API_ORIGIN", "http://api.example.test:8080");
  const feed = {
    game: {
      id: "r",
      game_id: "g",
      slug: "game",
      version: 1,
      paused: true,
      created_at: "2026-09-10T00:00:00Z",
      configuration: emptyConfiguration("Game"),
    },
    items: [],
    next: "",
    count: 0,
    rating_sum: 0,
    histogram: [],
  };
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(feed)));
  vi.stubGlobal("fetch", fetcher);
  expect(
    await loadReviews(
      "game",
      new Request(
        "https://evil.test/games/game/reviews?service=boost&after=a%26user_id%3Dprivate&user_id=private",
      ),
    ),
  ).toEqual(feed);
  const url = fetcher.mock.calls[0]?.[0] as URL;
  expect(url.origin).toBe("http://api.example.test:8080");
  expect(url.searchParams.get("after")).toBe("a&user_id=private");
  expect(url.searchParams.has("user_id")).toBe(false);
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
    redirect: "error",
    cache: "no-store",
  });
});
it("fails closed on invalid routes, API errors, and malformed public data", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const request = new Request("https://booster.example/games/game/reviews");
  for (const slug of [undefined, "../secret", "https://evil.test"])
    await expect(loadReviews(slug, request)).rejects.toMatchObject({
      status: 404,
    });
  expect(fetcher).not.toHaveBeenCalled();
  fetcher.mockResolvedValueOnce(new Response("missing", { status: 404 }));
  await expect(loadReviews("game", request)).rejects.toMatchObject({
    status: 404,
  });
  fetcher.mockResolvedValueOnce(new Response("{}"));
  await expect(loadReviews("game", request)).rejects.toMatchObject({
    status: 503,
  });
  fetcher.mockRejectedValueOnce(new Error("network failure"));
  await expect(loadReviews("game", request)).rejects.toMatchObject({
    status: 503,
  });
});
