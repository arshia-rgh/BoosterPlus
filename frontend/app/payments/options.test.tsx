import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { get } from "../identity/api";
import { usePaymentOptions } from "./options";

vi.mock("../identity/api", () => ({ get: vi.fn() }));
afterEach(() => vi.resetAllMocks());
const response = () => ({
  contract_id: "contract",
  policy_id: "policy",
  currency: "USD",
  amount_minor: "500",
  server_time: new Date().toISOString(),
  routes: [
    {
      code: "usdtbsc",
      status: "available" as const,
      minimum_crypto: "1",
      minimum_fiat: "1",
      checked_at: new Date().toISOString(),
      valid_until: new Date(Date.now() + 60000).toISOString(),
    },
  ],
});

it("does no provider-option read outside the customer selection stage", () => {
  renderHook(() => usePaymentOptions("/orders/order", null));
  expect(get).not.toHaveBeenCalled();
});
it("starts closed, binds responses and clears cached options on refresh failure", async () => {
  vi.mocked(get).mockResolvedValue(response());
  const { result } = renderHook(() =>
    usePaymentOptions("/orders/order", "policy:contract"),
  );
  expect(result.current.loading).toBe(true);
  expect(result.current.data).toBeNull();
  await waitFor(() => {
    expect(result.current.data?.contract_id).toBe("contract");
  });
  vi.mocked(get).mockRejectedValue(new Error("offline"));
  act(() => {
    result.current.reload();
  });
  expect(result.current.data).toBeNull();
  await waitFor(() => {
    expect(result.current.error).toBe(true);
  });
  expect(result.current.loading).toBe(false);
});
it("discards responses from an earlier contract or unmounted selection", async () => {
  let resolveOld: (value: unknown) => void = () => {};
  vi.mocked(get)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    )
    .mockResolvedValue({ ...response(), contract_id: "new" });
  const { result, rerender } = renderHook(
    ({ binding }) => usePaymentOptions("/orders/order", binding),
    { initialProps: { binding: "policy:old" } },
  );
  rerender({ binding: "policy:new" });
  await waitFor(() => {
    expect(result.current.data?.contract_id).toBe("new");
  });
  await act(() => {
    resolveOld(response());
    return Promise.resolve();
  });
  expect(result.current.data?.contract_id).toBe("new");
});
it("refreshes expired observations instead of leaving eligible choices stale", async () => {
  const old = response();
  const first = old.routes[0];
  if (!first) throw new Error("Missing fixture route");
  first.valid_until = new Date(Date.now() - 1).toISOString();
  vi.mocked(get).mockResolvedValueOnce(old).mockResolvedValue(response());
  const { result } = renderHook(() =>
    usePaymentOptions("/orders/order", "policy:contract"),
  );
  await waitFor(() => {
    expect(get).toHaveBeenCalledTimes(2);
  });
  await waitFor(() => {
    expect(result.current.expired).toBe(false);
  });
});

it("rejects incomplete and duplicated route eligibility evidence", async () => {
  const { paymentOptionsSchema } = await import("./options");
  for (const patch of [
    { minimum_crypto: "" },
    { minimum_fiat: "0" },
    { valid_until: null },
    { checked_at: null },
    { status: "unknown" },
  ]) {
    const value = response();
    expect(
      paymentOptionsSchema.safeParse({
        ...value,
        routes: [{ ...value.routes[0], ...patch }],
      }).success,
    ).toBe(false);
  }
  const value = response();
  expect(
    paymentOptionsSchema.safeParse({
      ...value,
      routes: [value.routes[0], value.routes[0]],
    }).success,
  ).toBe(false);
});
