import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { z } from "zod";
import { get } from "../identity/api";
import { useResource } from "./resource";
vi.mock("../identity/api", () => ({ get: vi.fn() }));
const schema = z.object({ label: z.string() });
it("marks refresh immediately pending and ignores responses for a previous private route", async () => {
  let resolveOld: (value: { label: string }) => void = () => {};
  vi.mocked(get)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    )
    .mockResolvedValueOnce({ label: "current private order" })
    .mockRejectedValueOnce(new Error("access revoked"));
  const hook = renderHook(({ path }) => useResource(path, schema), {
    initialProps: { path: "/old" },
  });
  expect(hook.result.current.loading).toBe(true);
  hook.rerender({ path: "/current" });
  await waitFor(() => {
    expect(hook.result.current.data?.label).toBe("current private order");
  });
  await act(async () => {
    resolveOld({ label: "previous customer data" });
    await Promise.resolve();
  });
  expect(hook.result.current.data?.label).toBe("current private order");
  act(() => {
    hook.result.current.reload();
  });
  expect(hook.result.current.loading).toBe(true);
  await waitFor(() => {
    expect(hook.result.current.error).toBeInstanceOf(Error);
  });
  expect(hook.result.current.loading).toBe(false);
  hook.unmount();
});
