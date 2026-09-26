import { afterEach, expect, it, vi } from "vitest";
import { loadHome, loadTerms } from "./loaders.server";
import { defaultHome } from "./model";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function reply(data: unknown) {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(data))),
      ),
  );
}
it("renders published content and fails closed for unavailable legal terms", async () => {
  reply({
    kind: "home",
    version: 2,
    release_id: "published",
    label: "v2",
    data: { ...defaultHome, start_rank: "Epic" },
    updated_at: "2026-01-01T00:00:00Z",
  });
  expect((await loadHome()).start_rank).toBe("Epic");
  reply({
    kind: "legal",
    version: 2,
    release_id: "published",
    label: "approved-v2",
    data: { text: "Approved policy text" },
    updated_at: "2026-01-01T00:00:00Z",
  });
  expect(await loadTerms()).toEqual({
    text: "Approved policy text",
    sections: [],
    preview: false,
    version: "approved-v2",
  });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  expect(await loadHome()).toEqual(defaultHome);
  await expect(loadTerms()).rejects.toThrow();
});
