import { afterEach, expect, it, vi } from "vitest";
import { loadCatalog, loadGame, loadOffering } from "./loaders.server";
import { emptyConfiguration } from "./model";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("loads only the configured API authority and validates public responses", async () => {
  vi.stubEnv("API_ORIGIN", "http://api.example.test:8080");
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ games: [], next: "" })));
  vi.stubGlobal("fetch", fetcher);
  expect(
    await loadCatalog(
      new Request("https://booster.example/games?after=a%26authority%3Devil"),
    ),
  ).toEqual({ games: [], next: "" });
  const url = fetcher.mock.calls[0]?.[0] as URL;
  expect(url.origin).toBe("http://api.example.test:8080");
  expect(url.searchParams.get("after")).toBe("a&authority=evil");
});
it("returns 404 for unknown offerings and 503 for outages or malformed responses", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect(() => loadGame("../secret")).toThrow(Response);
  expect(fetcher).not.toHaveBeenCalled();
  fetcher.mockResolvedValueOnce(new Response("missing", { status: 404 }));
  await expect(loadGame("missing")).rejects.toMatchObject({ status: 404 });
  fetcher.mockResolvedValueOnce(new Response("{}"));
  await expect(loadGame("game")).rejects.toMatchObject({ status: 503 });
  fetcher.mockRejectedValueOnce(new Error("network failure"));
  await expect(loadGame("game")).rejects.toMatchObject({ status: 503 });
  const release = {
    id: "r",
    game_id: "g",
    slug: "game",
    version: 1,
    paused: false,
    created_at: "2026-09-10T00:00:00Z",
    configuration: emptyConfiguration("Game"),
  };
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify(release)));
  await expect(
    loadOffering("game", "missing", "package"),
  ).rejects.toMatchObject({ status: 404 });
});
