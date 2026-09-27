import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { get } from "../identity/api";
import { BoosterOrder } from "./panel";
import type { Work } from "./model";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
}));
vi.mock("./secrets", () => ({
  StaffSecret: () => null,
  CustomerSecret: () => null,
}));
it("disables booster edits until the refreshed work revision is ready", async () => {
  const work: Work = {
    coordination_id: "",
    coordination_shared: false,
    order_id: "synthetic-order",
    order_version: 1,
    access_version: 1,
    version: 1,
    game: "Synthetic game",
    service: "Rank boost",
    state: "queued",
    mode: "account",
    secret_hours: 1,
    alias: "Assigned booster",
    progress: 0,
    completion_pending: false,
    note: "Assigned",
    estimated_start: null,
    estimated_finish: null,
    forecast_review: false,
    shared: [],
    updated_at: "2026-09-10T00:00:00Z",
  };
  let refreshed: (value: Work) => void = () => {};
  let workReads = 0;
  vi.mocked(get).mockImplementation((path) => {
    if (path.includes("/readiness"))
      return Promise.resolve({
        ready: true,
        requirement: "ready",
        checked_at: "2026-09-27T00:00:00Z",
      });
    workReads++;
    return workReads === 1
      ? Promise.resolve(work)
      : new Promise((resolve) => {
          refreshed = resolve;
        });
  });
  render(
    <MemoryRouter initialEntries={["/booster/orders/work?section=progress"]}>
      <BoosterOrder />
    </MemoryRouter>,
  );
  const note = await screen.findByLabelText("Customer-visible update");
  fireEvent.click(screen.getByRole("button", { name: "Refresh assignment" }));
  expect(note).toBeDisabled();
  expect(screen.getByRole("button", { name: "Start work" })).toBeDisabled();
  await act(async () => {
    refreshed({ ...work, version: 2, order_version: 2 });
    await Promise.resolve();
  });
  const current = screen.getByLabelText("Customer-visible update");
  expect(current).toBeEnabled();
  fireEvent.change(current, {
    target: { value: "Ready after current revision loaded" },
  });
  expect(screen.getByRole("button", { name: "Start work" })).toBeEnabled();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.useRealTimers();
});
it("pauses hidden-tab work polling and cleans up visibility listeners", async () => {
  vi.useFakeTimers();
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  const work: Work = {
    coordination_id: "",
    coordination_shared: false,
    order_id: "work",
    order_version: 1,
    access_version: 1,
    version: 1,
    game: "Test",
    service: "Boost",
    state: "queued",
    mode: "account",
    secret_hours: 1,
    alias: "Guide",
    progress: 0,
    completion_pending: false,
    note: "Ready",
    estimated_start: null,
    estimated_finish: null,
    forecast_review: false,
    shared: [],
    updated_at: "2026-09-13T00:00:00Z",
  };
  vi.mocked(get)
    .mockReset()
    .mockImplementation((path) =>
      Promise.resolve(
        path.includes("/readiness")
          ? {
              ready: true,
              requirement: "ready",
              checked_at: "2026-09-27T00:00:00Z",
            }
          : work,
      ),
    );
  const view = render(
    <MemoryRouter initialEntries={["/booster/orders/work?section=progress"]}>
      <BoosterOrder />
    </MemoryRouter>,
  );
  await act(async () => {
    await Promise.resolve();
  });
  const initial = vi.mocked(get).mock.calls.length;
  hidden.mockReturnValue(true);
  await act(async () => {
    vi.advanceTimersByTime(30000);
    await Promise.resolve();
  });
  expect(get).toHaveBeenCalledTimes(initial);
  hidden.mockReturnValue(false);
  await act(async () => {
    fireEvent(document, new Event("visibilitychange"));
    await Promise.resolve();
  });
  expect(get).toHaveBeenCalledTimes(initial + 1);
  view.unmount();
  fireEvent(document, new Event("visibilitychange"));
  vi.advanceTimersByTime(30000);
  expect(get).toHaveBeenCalledTimes(initial + 1);
});
