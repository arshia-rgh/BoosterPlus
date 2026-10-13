import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import { useLiveEstimate } from "./live-estimate";
import type { Estimate } from "./model";

vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
const base = {
  enabled: true,
  complete: true,
  slug: "game",
  releaseID: "r1",
  service: "boost",
  answers: { rank: "gold" },
  coupon: "",
};
function estimate(amount = "301"): Estimate {
  return {
    release_id: "r1",
    version: 1,
    evaluator: "pricing-v1",
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    outcome: "estimated",
    currency: "USD",
    amount_minor: amount,
    answers: base.answers,
    lines: [],
    issues: [],
  };
}
const tick = async (ms = 500) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
});
afterEach(() => vi.useRealTimers());

it("debounces rapid changes and requests only the current provisional estimate", async () => {
  vi.mocked(post).mockResolvedValue(estimate());
  const view = renderHook(useLiveEstimate, { initialProps: base });
  await tick(400);
  view.rerender({ ...base, answers: { rank: "diamond" } });
  await tick(400);
  expect(post).not.toHaveBeenCalled();
  await tick(100);
  expect(post).toHaveBeenCalledExactlyOnceWith(
    "/catalog/games/game/estimate",
    { release_id: "r1", service: "boost", answers: { rank: "diamond" } },
    expect.anything(),
  );
  expect(view.result.current.estimate?.amount_minor).toBe("301");
});

it("hides stale prices immediately and ignores an older response arriving last", async () => {
  let first: ((value: Estimate) => void) | undefined;
  vi.mocked(post)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          first = resolve;
        }),
    )
    .mockResolvedValueOnce(estimate("900"));
  const view = renderHook(useLiveEstimate, { initialProps: base });
  await tick();
  view.rerender({ ...base, answers: { rank: "diamond" } });
  expect(view.result.current.estimate).toBeUndefined();
  await tick();
  await act(async () => {
    first?.(estimate("100"));
    await Promise.resolve();
  });
  expect(view.result.current.estimate?.amount_minor).toBe("900");
});

it.each(["release", "service", "disabled"])(
  "discards pending feedback after %s changes",
  async (kind) => {
    let finish: ((value: Estimate) => void) | undefined;
    vi.mocked(post).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const view = renderHook(useLiveEstimate, { initialProps: base });
    await tick();
    view.rerender({
      ...base,
      ...(kind === "release"
        ? { releaseID: "r2" }
        : kind === "service"
          ? { service: "other" }
          : { enabled: false }),
    });
    await act(async () => {
      finish?.(estimate());
      await Promise.resolve();
    });
    expect(view.result.current.estimate).toBeUndefined();
    view.unmount();
    await tick();
    expect(post).toHaveBeenCalledOnce();
  },
);

it("does not request incomplete selections and hides the previous amount", async () => {
  vi.mocked(post).mockResolvedValue(estimate());
  const view = renderHook(useLiveEstimate, { initialProps: base });
  await tick();
  view.rerender({ ...base, complete: false });
  expect(view.result.current.state).toBe("incomplete");
  expect(view.result.current.estimate).toBeUndefined();
  await tick();
  expect(post).toHaveBeenCalledOnce();
});

it("does not revive an old price when returning to earlier preferences before the debounce", async () => {
  vi.mocked(post).mockResolvedValue(estimate());
  const view = renderHook(useLiveEstimate, { initialProps: base });
  await tick();
  expect(view.result.current.estimate?.amount_minor).toBe("301");
  view.rerender({ ...base, answers: { rank: "diamond" } });
  view.rerender(base);
  expect(view.result.current.estimate).toBeUndefined();
  await tick();
  expect(post).toHaveBeenCalledTimes(2);
  expect(view.result.current.estimate?.amount_minor).toBe("301");
});

it("uses the coupon endpoint without creating an order or reservation", async () => {
  vi.mocked(post).mockResolvedValue(estimate());
  renderHook(useLiveEstimate, { initialProps: { ...base, coupon: " SAVE " } });
  await tick();
  expect(post).toHaveBeenCalledExactlyOnceWith(
    "/catalog/games/game/discount",
    {
      release_id: "r1",
      service: "boost",
      answers: base.answers,
      code: "SAVE",
      stage: "estimate",
      package: "",
      variant: "",
    },
    expect.anything(),
  );
});

it("clears invalid and expired prices, supports manual review and a deliberate retry", async () => {
  vi.mocked(post)
    .mockResolvedValueOnce({ ...estimate(), outcome: "invalid" })
    .mockRejectedValueOnce(new APIError("Price service unavailable"))
    .mockResolvedValueOnce({
      ...estimate(),
      outcome: "manual_review",
      amount_minor: "",
    });
  const view = renderHook(useLiveEstimate, { initialProps: base });
  await tick();
  expect(view.result.current.state).toBe("invalid");
  expect(view.result.current.estimate).toBeUndefined();
  act(() => {
    view.result.current.retry();
  });
  await tick();
  expect(view.result.current.state).toBe("error");
  expect(view.result.current.message).toBe("Price service unavailable");
  act(() => {
    view.result.current.retry();
  });
  await tick();
  expect(view.result.current.estimate?.outcome).toBe("manual_review");
  await tick(60_000);
  expect(view.result.current.state).toBe("expired");
  expect(view.result.current.estimate).toBeUndefined();
  expect(post).toHaveBeenCalledTimes(3);
});
