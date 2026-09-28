import { it, expect, vi, afterEach } from "vitest";
import { loader } from "./news-sitemap";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("does not guess a public hostname and emits only released canonical URLs without caching", async () => {
  vi.stubEnv("PUBLIC_SITE_ORIGIN", "");
  expect((await loader({ params: { slug: "fixture-game" } })).status).toBe(503);
  vi.stubEnv("PUBLIC_SITE_ORIGIN", "https://playora.example");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        items: [{ slug: "fixture-guide", updated_at: "2026-09-28T00:00:00Z" }],
      }),
    ),
  );
  const response = await loader({ params: { slug: "fixture-game" } });
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.text()).toContain(
    "https://playora.example/games/fixture-game/news/fixture-guide",
  );
});
