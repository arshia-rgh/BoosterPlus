import { afterEach, expect, it, vi } from "vitest";
import { publicAPIHeaders, routingContext } from "./routing.server";
afterEach(() => vi.unstubAllEnvs());
function split() {
  vi.stubEnv("PUBLIC_ORIGIN", "https://playora.example");
  vi.stubEnv("ADMIN_PUBLIC_ORIGIN", "https://admin.playora.example");
  vi.stubEnv("BOOSTER_PUBLIC_ORIGIN", "https://booster.playora.example");
  vi.stubEnv("PROXY_SHARED_KEY", "x".repeat(40));
}
it("keeps local path-mode rendering without synthetic host selection", () => {
  vi.stubEnv("ADMIN_PUBLIC_ORIGIN", "");
  vi.stubEnv("BOOSTER_PUBLIC_ORIGIN", "");
  expect(routingContext(new Request("http://localhost/admin"))).toBeNull();
  expect(publicAPIHeaders()).toEqual({});
});
it("serializes only public routing context, never proxy credentials", () => {
  split();
  const context = routingContext(
    new Request("https://admin.playora.example/orders", {
      headers: { "X-Playora-Frontend-Portal": "admin" },
    }),
  );
  expect(context).toEqual({
    portal: "admin",
    origins: {
      customer: "https://playora.example",
      admin: "https://admin.playora.example",
      booster: "https://booster.playora.example",
    },
  });
  expect(JSON.stringify(context)).not.toContain("x".repeat(40));
  expect(publicAPIHeaders()).toEqual({
    "X-Booster-Proxy-Key": "x".repeat(40),
    "X-Playora-Request-Origin": "https://playora.example",
  });
});
it("fails closed when split SSR lacks trusted role context or API authority", () => {
  split();
  expect(() =>
    routingContext(new Request("https://admin.playora.example/")),
  ).toThrow("routing context");
  vi.stubEnv("PROXY_SHARED_KEY", "");
  expect(publicAPIHeaders).toThrow("API authority");
});
