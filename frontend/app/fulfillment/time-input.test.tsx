import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import TimeInput from "./time-input";

it("omits clock-change controls for UTC and keeps explicit choices in other zones", () => {
  const change = vi.fn();
  const value = {
    local: "2026-10-25T01:30",
    zone: "UTC",
    occurrence: "" as const,
  };
  const { rerender } = render(
    <TimeInput
      split
      name="start"
      label="Start"
      value={value}
      change={change}
    />,
  );
  expect(screen.getByLabelText("Start date")).toHaveValue("2026-10-25");
  expect(screen.getByLabelText("Start time")).toHaveValue("01:30");
  expect(
    screen.queryByLabelText("Start: repeated clock hour"),
  ).not.toBeInTheDocument();
  rerender(
    <TimeInput
      split
      name="start"
      label="Start"
      value={{ ...value, zone: "Europe/London" }}
      change={change}
    />,
  );
  const occurrence = screen.getByLabelText("Start: repeated clock hour");
  expect(occurrence).toBeVisible();
  fireEvent.change(occurrence, { target: { value: "second" } });
  expect(change).toHaveBeenCalledWith({
    ...value,
    zone: "Europe/London",
    occurrence: "second",
  });
});
