import { afterEach, expect, it, vi } from "vitest";
import { z } from "../validation";
import { APIError, errorMessage, get, sessionSchema } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});
it("distinguishes account validation from unavailable service without exposing raw details", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            code: "resale_invalid",
            message: "private database reason",
            issues: [
              {
                path: "product.commission.base_minor",
                message: "Use the accepted seller base.",
              },
            ],
          }),
          { status: 422 },
        ),
      ),
    ),
  );
  await expect(get("/accounts/example", z.unknown())).rejects.toMatchObject({
    status: 422,
    code: "resale_invalid",
    message: "Review the highlighted account details before continuing.",
    issues: [
      {
        path: "product.commission.base_minor",
        message: "Use the accepted seller base.",
      },
    ],
  });
  expect(errorMessage(new Error("private connection detail"))).toBe(
    "The service is unavailable. Please try again.",
  );
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

it("preserves freshness challenges but conceals incomplete sign-in", async () => {
  const changed = vi.fn();
  window.addEventListener("boosterplus:session-changed", changed);
  try {
    for (const code of ["recent_auth_required", "mfa_required"]) {
      changed.mockClear();
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          Promise.resolve(
            new Response(
              JSON.stringify({ code, private: "sensitive detail" }),
              { status: 403 },
            ),
          ),
        ),
      );
      await expect(
        get("/booster/fulfillment/work/secret/reveal", z.unknown(), "booster"),
      ).rejects.toMatchObject({ code, status: 403 });
      if (code === "recent_auth_required")
        expect(changed).not.toHaveBeenCalled();
      else {
        expect(changed).toHaveBeenCalledTimes(1);
        expect((changed.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
          portal: "booster",
          verification: code,
        });
      }
    }
  } finally {
    window.removeEventListener("boosterplus:session-changed", changed);
  }
});

it("explains an account reservation conflict without presenting it as an outage", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ code: "resale_conflict" }), {
          status: 409,
        }),
      ),
    ),
  );
  const request = get("/resale/listings/owned", z.unknown());
  await expect(request).rejects.toMatchObject({
    status: 409,
    code: "resale_conflict",
  });
  await expect(request).rejects.toThrow(
    "Refresh the listing and review the current terms",
  );
});
