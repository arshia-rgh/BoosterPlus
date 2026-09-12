import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { z } from "../validation";
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
it("retains an access error throughout retry until a new authorized response arrives", async () => {
  vi.mocked(get).mockReset();
  let finish: (value: { label: string }) => void = () => {};
  const denied = new Error("Access denied");
  vi.mocked(get)
    .mockResolvedValueOnce({ label: "private data" })
    .mockRejectedValueOnce(denied)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
  const hook = renderHook(() => useResource("/private", schema));
  await waitFor(() => {
    expect(hook.result.current.data?.label).toBe("private data");
  });
  act(() => {
    hook.result.current.reload();
  });
  await waitFor(() => {
    expect(hook.result.current.error).toBe(denied);
  });
  act(() => {
    hook.result.current.reload();
  });
  expect(hook.result.current.loading).toBe(true);
  expect(hook.result.current.error).toBe(denied);
  expect(hook.result.current.data).toBeNull();
  await act(async () => {
    finish({ label: "authorized again" });
    await Promise.resolve();
  });
  expect(hook.result.current.error).toBeNull();
  expect(hook.result.current.data?.label).toBe("authorized again");
  hook.unmount();
});
