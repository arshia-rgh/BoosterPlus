import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import AvailabilityEditor, { weeklyDates } from "./availability-editor";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());
it("keeps local weekly times across a month and resets repeated-hour choices for each new date", () => {
  const rows = weeklyDates(
    {
      start: {
        local: "2026-10-25T01:00",
        zone: "Europe/London",
        occurrence: "second",
      },
      end: { local: "2026-10-25T02:00", zone: "Europe/London", occurrence: "" },
    },
    2,
  );
  expect(rows[0]?.start.occurrence).toBe("second");
  expect(rows[1]?.start).toEqual({
    local: "2026-11-01T01:00",
    zone: "Europe/London",
    occurrence: "",
  });
  const first = rows[0];
  if (!first) throw new Error("Missing first date");
  expect(() => weeklyDates(first, 13)).toThrow("1 and 12");
});
it("reviews explicit exceptions and freezes an ambiguous publication for duplicate-safe retry", async () => {
  const reload = vi.fn();
  const failure = new APIError("Connection interrupted");
  failure.status = 503;
  vi.mocked(post)
    .mockRejectedValueOnce(failure)
    .mockResolvedValueOnce({
      windows: [
        {
          id: "synthetic",
          version: 1,
          starts_at: "2026-10-01T12:00:00Z",
          ends_at: "2026-10-01T13:00:00Z",
          timezone: "UTC",
          active: true,
        },
      ],
    });
  render(
    <AvailabilityEditor base="/booster/calendar" zone="UTC" reload={reload} />,
  );
  fireEvent.change(screen.getByLabelText("Window start date"), {
    target: { value: "2026-10-01" },
  });
  fireEvent.change(screen.getByLabelText("Window end date"), {
    target: { value: "2026-10-01" },
  });
  fireEvent.change(screen.getByLabelText("Window start time"), {
    target: { value: "12:00" },
  });
  fireEvent.change(screen.getByLabelText("Window end time"), {
    target: { value: "13:00" },
  });
  fireEvent.click(screen.getByLabelText("Repeat weekly"));
  fireEvent.change(screen.getByLabelText("Number of weekly dates (1–12)"), {
    target: { value: "2" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review dates" }));
  expect(
    screen.getAllByRole("region", { name: /Availability date/ }),
  ).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Remove date 2" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Publish reviewed availability" }),
  );
  await screen.findByRole("button", { name: "Retry same publication" });
  expect(screen.getByLabelText("Date 1 start date")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Back to dates" })).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Retry same publication" }),
  );
  await waitFor(() => {
    expect(reload).toHaveBeenCalledTimes(1);
  });
  expect(vi.mocked(post).mock.calls[1]?.[1]).toEqual(
    vi.mocked(post).mock.calls[0]?.[1],
  );
  expect(vi.mocked(post).mock.calls[0]?.[1]).toMatchObject({
    windows: [{ start: { local: "2026-10-01T12:00" } }],
  });
  expect(screen.getByRole("status")).toHaveTextContent(
    "1 availability window published",
  );
});

it("focuses incomplete availability and rejects an invalid UTC duration without publication", async () => {
  render(
    <AvailabilityEditor base="/booster/calendar" zone="UTC" reload={vi.fn()} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Review dates" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Window start date")).toHaveFocus();
  });
  expect(screen.getByLabelText("Window start date")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  for (const label of ["Window start date", "Window end date"])
    fireEvent.change(screen.getByLabelText(label), {
      target: { value: "2099-01-01" },
    });
  fireEvent.change(screen.getByLabelText("Window start time"), {
    target: { value: "12:00" },
  });
  fireEvent.change(screen.getByLabelText("Window end time"), {
    target: { value: "12:05" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review dates" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Window end time")).toHaveFocus();
  });
  expect(screen.getByLabelText("Window end time")).toHaveAccessibleDescription(
    "End the window 15 minutes to 12 hours after its start.",
  );
  expect(post).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Window start time")).toHaveValue("12:00");
});
