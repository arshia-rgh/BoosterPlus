import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { post } from "../identity/api";
import ForecastControls from "./forecast";
import type { Work } from "./model";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
const work: Work = {
  coordination_id: "",
  coordination_shared: false,
  order_id: "synthetic",
  order_version: 4,
  version: 3,
  access_version: 1,
  game: "Synthetic",
  service: "Boost",
  state: "queued",
  mode: "account",
  secret_hours: 24,
  alias: "Team",
  progress: 0,
  completion_pending: false,
  note: "Assigned",
  estimated_start: null,
  estimated_finish: null,
  forecast_review: false,
  shared: [],
  updated_at: "2026-09-10T00:00:00Z",
};
const preview = {
  status: "ready",
  reason: "Synthetic reviewed rule",
  basis: "synthetic-basis",
  forecast: {
    calculated_at: "2026-09-10T00:00:00Z",
    rule: "synthetic",
    zone: "UTC",
    start_earliest: "2026-09-10T01:00:00Z",
    start_latest: "2026-09-10T02:00:00Z",
    finish_earliest: "2026-09-10T03:00:00Z",
    finish_latest: "2026-09-10T04:00:00Z",
  },
};
it("requires a reason and sends the observed versions and reviewed basis", async () => {
  vi.mocked(post).mockResolvedValueOnce(preview).mockResolvedValueOnce(work);
  const reload = vi.fn();
  render(<ForecastControls work={work} reload={reload} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Calculate delivery forecast" }),
  );
  const apply = await screen.findByRole("button", {
    name: "Apply delivery forecast",
  });
  expect(apply).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Delivery estimate reason"), {
    target: { value: "Reviewed calendar" },
  });
  fireEvent.click(apply);
  await waitFor(() => {
    expect(reload).toHaveBeenCalledOnce();
  });
  expect(post).toHaveBeenLastCalledWith(
    "/admin/fulfillment/synthetic/forecast/apply",
    {
      version: 3,
      order_version: 4,
      calculated_at: preview.forecast.calculated_at,
      basis: preview.basis,
      note: "Reviewed calendar",
    },
    expect.anything(),
  );
  expect(
    screen.queryByRole("button", { name: "Apply delivery forecast" }),
  ).not.toBeInTheDocument();
});
it("clears a rejected preview and requires recalculation before retry", async () => {
  vi.mocked(post)
    .mockResolvedValueOnce(preview)
    .mockRejectedValueOnce(new Error("Synthetic stale preview"));
  render(<ForecastControls work={work} reload={vi.fn()} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Calculate delivery forecast" }),
  );
  await screen.findByRole("button", { name: "Apply delivery forecast" });
  fireEvent.change(screen.getByLabelText("Delivery estimate reason"), {
    target: { value: "Review" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Apply delivery forecast" }),
  );
  await screen.findByRole("alert");
  expect(
    screen.queryByRole("button", { name: "Apply delivery forecast" }),
  ).not.toBeInTheDocument();
});
it("cannot apply an unsupported or insufficient calendar", async () => {
  vi.mocked(post).mockResolvedValueOnce({
    status: "needs_review",
    reason: "Insufficient confirmed sessions",
    basis: "",
    forecast: null,
  });
  render(<ForecastControls work={work} reload={vi.fn()} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Calculate delivery forecast" }),
  );
  await screen.findByText(/Needs review. Insufficient confirmed sessions/);
  expect(
    screen.queryByRole("button", { name: "Apply delivery forecast" }),
  ).not.toBeInTheDocument();
});
