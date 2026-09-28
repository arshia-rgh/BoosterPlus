import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { get, APIError } from "../identity/api";
import { AttemptHistory } from "./attempts";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
}));
it("loads history only on expansion, retries outages and follows bounded pages without inventing older evidence", async () => {
  vi.mocked(get)
    .mockRejectedValueOnce(new APIError("Unavailable"))
    .mockResolvedValueOnce({
      items: [
        {
          generation: 1,
          number: 1,
          outcome: "complete",
          started_at: "2026-09-28T00:00:00Z",
          finished_at: "2026-09-28T00:01:00Z",
        },
      ],
      next: "0:2",
    })
    .mockResolvedValueOnce({ items: [], next: "" });
  const { container } = render(<AttemptHistory id="safe-task" />);
  expect(get).not.toHaveBeenCalled();
  const details = container.querySelector("details");
  if (!details) throw new Error("Missing details");
  details.open = true;
  fireEvent(details, new Event("toggle"));
  await screen.findByRole("alert");
  fireEvent.click(
    screen.getByRole("button", { name: "Refresh attempt history" }),
  );
  await screen.findByRole("heading", { name: "Run 2 · Attempt 1" });
  fireEvent.click(screen.getByRole("button", { name: "Older attempts" }));
  await screen.findByText(/No recorded attempts/);
  await waitFor(() => {
    expect(get).toHaveBeenLastCalledWith(
      "/admin/jobs/safe-task/attempts?after=0%3A2",
      expect.anything(),
      "customer",
    );
  });
  expect(
    screen.getByText(/Earlier attempt timestamps are unavailable/),
  ).toBeVisible();
});
