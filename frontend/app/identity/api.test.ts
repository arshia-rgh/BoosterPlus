import { afterEach, expect, it, vi } from "vitest";
import { z } from "../validation";
import { APIError, get, sessionSchema } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});
it("preserves access denial and notifies the session boundary for malformed proxy responses", async () => {
  const changed = vi.fn();
  window.addEventListener("boosterplus:session-changed", changed);
  try {
    for (const status of [401, 403, 404]) {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          Promise.resolve(new Response("<html>Unavailable</html>", { status })),
        ),
      );
      await expect(
        get("/conversations/owned", z.object({ id: z.string() })),
      ).rejects.toMatchObject({ status });
    }
    expect(changed).toHaveBeenCalledTimes(2);
  } finally {
    window.removeEventListener("boosterplus:session-changed", changed);
  }
});
it("returns public API error text without reflecting an untrusted server body", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            code: "permission_denied",
            private: "secret server detail",
          }),
          { status: 403 },
        ),
      ),
    ),
  );
  try {
    await get("/conversations/owned", z.unknown());
    throw new Error("Expected denial");
  } catch (error) {
    expect(error).toBeInstanceOf(APIError);
    expect(error).toMatchObject({ status: 403, code: "permission_denied" });
    expect(String(error)).not.toContain("secret server detail");
  }
});

it("retains actual server retry guidance without reflecting arbitrary headers", async () => {
  for (const header of ["60", "private database detail"]) {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ code: "rate_limited" }), {
            status: 429,
            headers: { "Retry-After": header },
          }),
        ),
      ),
    );
    try {
      await get("/auth/session", z.unknown());
      throw new Error("Expected rate limit");
    } catch (error) {
      expect(error).toBeInstanceOf(APIError);
      expect(String(error)).not.toContain("private database detail");
      if (!(error instanceof APIError)) throw error;
      if (header === "60") {
        expect(error.retryAt).toBeGreaterThan(Date.now());
        expect(error.message).toContain("UTC");
      } else expect(error.retryAt).toBeUndefined();
    }
  }
});

const anonymous = (portal: string) => ({
  portal,
  user: null,
  csrf_token: "synthetic-csrf".repeat(4),
  google_enabled: false,
  google_linked: false,
  mfa_required: false,
  capabilities: [],
  terms_version: "test",
  terms_url: "/terms",
});
it("coalesces simultaneous session bootstraps, isolates portals and always refreshes after completion", async () => {
  const pending: { portal: string; resolve: (response: Response) => void }[] =
    [];
  const fetcher = vi.fn(
    (url: string) =>
      new Promise<Response>((resolve) => {
        pending.push({
          portal: url.includes("/admin/") ? "admin" : "customer",
          resolve,
        });
      }),
  );
  vi.stubGlobal("fetch", fetcher);
  const first = get("/auth/session", sessionSchema, "customer");
  const second = get("/auth/session", sessionSchema, "customer");
  const staff = get("/auth/session", sessionSchema, "admin");
  expect(fetcher).toHaveBeenCalledTimes(2);
  for (const request of pending)
    request.resolve(new Response(JSON.stringify(anonymous(request.portal))));
  expect(await first).toEqual(await second);
  expect((await staff).portal).toBe("admin");
  const fresh = get("/auth/session", sessionSchema, "customer");
  expect(fetcher).toHaveBeenCalledTimes(3);
  pending[2]?.resolve(new Response(JSON.stringify(anonymous("customer"))));
  await fresh;
});
it("discards a failed shared session read so a later request can recover", async () => {
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new TypeError("offline"))
    .mockResolvedValueOnce(new Response(JSON.stringify(anonymous("customer"))));
  vi.stubGlobal("fetch", fetcher);
  const results = await Promise.allSettled([
    get("/auth/session", sessionSchema, "customer"),
    get("/auth/session", sessionSchema, "customer"),
  ]);
  expect(results.map((result) => result.status)).toEqual([
    "rejected",
    "rejected",
  ]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect((await get("/auth/session", sessionSchema, "customer")).portal).toBe(
    "customer",
  );
  expect(fetcher).toHaveBeenCalledTimes(2);
});
