import { expect, it, vi } from "vitest";
import { createAPIClient } from "./client";

it("uses the pinned status route and propagates failures without inventing data", async () => {
  const transport = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify({ status: "not_ready" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    }),
  );
  const result = await createAPIClient(
    "https://api.example.test",
    transport,
  ).GET("/health/ready");
  expect(result.data).toBeUndefined();
  expect(result.error).toEqual({ status: "not_ready" });
  expect(transport).toHaveBeenCalledOnce();
});
it("rejects credentials and unsafe API protocols", () => {
  expect(() => createAPIClient("https://user:private@example.test")).toThrow(
    "Invalid API origin",
  );
  expect(() => createAPIClient("file:///private")).toThrow(
    "Invalid API origin",
  );
});
