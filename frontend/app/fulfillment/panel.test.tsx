import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
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
    shared: [],
    updated_at: "2026-09-10T00:00:00Z",
  };
  let refreshed: (value: Work) => void = () => {};
  vi.mocked(get)
    .mockResolvedValueOnce(work)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          refreshed = resolve;
        }),
    );
  render(
    <MemoryRouter>
      <BoosterOrder />
    </MemoryRouter>,
  );
  const note = await screen.findByLabelText("Customer-visible update");
  fireEvent.click(screen.getByRole("button", { name: "Refresh fulfillment" }));
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
