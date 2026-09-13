import { afterEach, expect, it, vi } from "vitest";
import { z } from "../validation";
import { APIError, get } from "./api";

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
