import { afterEach, expect, it, vi } from "vitest";
import {
  portalReturn,
  portalHeaders,
  portalFromPath,
  portalAPIPath,
  portalSecurity,
  sessionEventMatches,
  streamURL,
} from "./portal";
import { command, get, sessionSchema } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});
it("rejects cross-portal routes, normalized traversal and secret query data", () => {
  for (const path of [
    "//evil.test",
    "https://evil.test",
    "/admin/../orders",
    "/orders/%2e%2e/admin",
    "/orders/%252e%252e",
    "/orders\\x",
    "/orders/./x",
    "/unknown",
    "/orders\n",
  ])
    expect(portalReturn(path, "customer")).toBeNull();
  expect(portalReturn("/admin/orders", "customer")).toBeNull();
  expect(portalReturn("/booster/orders", "admin")).toBeNull();
  expect(portalReturn("/orders", "booster")).toBeNull();
  expect(
    portalReturn(
      "/admin/orders/one?section=messages&email=private#token",
      "admin",
    ),
  ).toBe("/admin/orders/one?section=messages");
  expect(
    portalReturn(
      "/games/mlbb/packages/rank?variant=solo&secret=no",
      "customer",
    ),
  ).toBe("/games/mlbb/packages/rank?variant=solo");
  expect(portalReturn("/booster/account/security", "booster")).toBe(
    "/booster/account/security",
  );
});
it("selects explicit API context only for declared shared and fixed endpoints", () => {
  expect(portalFromPath("/administrator")).toBe("customer");
  expect(portalFromPath("/admin/orders")).toBe("admin");
  expect(portalHeaders("/me/overview", "admin")).toEqual({});
  expect(portalHeaders("/me/profile", "admin")).toEqual({
    "X-Playora-Portal": "admin",
  });
  expect(portalAPIPath("/auth/session", "booster")).toBe(
    "/auth/portals/booster/session",
  );
  expect(portalSecurity("admin")).toBe("/admin/account/security");
  expect(streamURL("/conversations/id", 3, "booster")).toBe(
    "/api/v1/conversations/id/stream?after=3&portal=booster",
  );
  expect(streamURL("/admin/conversations/id", 3, "admin")).toBe(
    "/api/v1/admin/conversations/id/stream?after=3",
  );
});
it("does not let unrelated or unscoped events clear another portal", () => {
  expect(
    sessionEventMatches(new Event("boosterplus:session-changed"), "admin"),
  ).toBe(false);
  expect(
    sessionEventMatches(
      new CustomEvent("boosterplus:session-changed", {
        detail: { portal: "customer" },
      }),
      "admin",
    ),
  ).toBe(false);
  expect(
    sessionEventMatches(
      new CustomEvent("boosterplus:session-changed", {
        detail: { portal: "admin" },
      }),
      "admin",
    ),
  ).toBe(true);
});
const session = {
  portal: "admin",
  user: null,
  csrf_token: "a".repeat(64),
  google_enabled: false,
  google_linked: false,
  mfa_required: false,
  capabilities: [],
  terms_version: "test",
  terms_url: "/terms",
};
it("does not send a pending mutation after portal navigation", async () => {
  window.history.replaceState({}, "", "/admin/orders");
  let resolve: ((response: Response) => void) | undefined;
  const fetcher = vi.fn(
    () =>
      new Promise<Response>((done) => {
        resolve = done;
      }),
  );
  vi.stubGlobal("fetch", fetcher);
  const result = command("/admin/orders/id/action", {});
  window.history.replaceState({}, "", "/account");
  resolve?.(new Response(JSON.stringify(session)));
  await expect(result).rejects.toThrow("portal changed");
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledWith(
    "/api/v1/auth/portals/admin/session",
    expect.objectContaining({ headers: { "X-Playora-Portal": "admin" } }),
  );
});
it("rejects a bootstrap response from a different audience", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(session)))),
  );
  await expect(get("/auth/session", sessionSchema, "customer")).rejects.toThrow(
    "context changed",
  );
});
it("uses the selected staff cookie audience for bootstrap and mutation", async () => {
  window.history.replaceState({}, "", "/admin/orders");
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(session)))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetcher);
  await command("/auth/logout");
  expect(fetcher).toHaveBeenNthCalledWith(
    2,
    "/api/v1/auth/portals/admin/logout",
    expect.objectContaining({
      headers: {
        "X-Playora-Portal": "admin",
        "Content-Type": "application/json",
        "X-CSRF-Token": session.csrf_token,
      },
    }),
  );
});

it("preserves only bounded public configurator intent through customer sign-in", () => {
  const reference = "58b15562-a8bb-46a0-b8d5-0926b6166bb6";
  expect(
    portalReturn(
      `/games/mlbb/services/boost?step=review&coupon=SAVE10&request=${reference}&note=private`,
      "customer",
    ),
  ).toBe(
    `/games/mlbb/services/boost?coupon=SAVE10&step=review&request=${reference}`,
  );
  expect(
    portalReturn(
      "/games/mlbb/packages/rank?variant=solo&request=wrong&coupon=private%20text&step=review",
      "customer",
    ),
  ).toBe("/games/mlbb/packages/rank?variant=solo");
});
