import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import WinRateInput from "./win-rate-input";
function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState<string | undefined>(initial);
  return (
    <>
      <WinRateInput
        id="wr"
        label="Requested win rate"
        value={value ?? ""}
        change={setValue}
      />
      <output aria-label="Request">{value}</output>
    </>
  );
}
it("offers each preference without inventing an order guarantee and keeps exact canonical values", () => {
  render(<Harness />);
  const select = screen.getByLabelText("Win-rate preference");
  fireEvent.change(select, { target: { value: "any" } });
  expect(screen.getByLabelText("Request")).toHaveTextContent("any");
  fireEvent.change(select, { target: { value: "range" } });
  fireEvent.change(screen.getByLabelText("Lower win rate (%)"), {
    target: { value: "50.0" },
  });
  fireEvent.change(screen.getByLabelText("Upper win rate (%)"), {
    target: { value: "70.5" },
  });
  expect(screen.getByLabelText("Request")).toHaveTextContent("range:50:70.5");
  fireEvent.change(select, { target: { value: "below" } });
  fireEvent.change(screen.getByLabelText("Below win rate (%)"), {
    target: { value: "60" },
  });
  expect(screen.getByLabelText("Request")).toHaveTextContent("below:60");
  fireEvent.change(select, { target: { value: "above" } });
  fireEvent.change(screen.getByLabelText("Above win rate (%)"), {
    target: { value: "75" },
  });
  expect(screen.getByLabelText("Request")).toHaveTextContent("above:75");
  fireEvent.change(select, { target: { value: "exact" } });
  expect(screen.getByLabelText("Request")).toHaveTextContent("exact:100");
  expect(screen.queryByLabelText("Above win rate (%)")).toBeNull();
  expect(screen.getByText(/accepted package or order defines/)).toBeVisible();
});
it.each([
  ["range:80:60", "Upper win rate (%)"],
  ["range:10:100.1", "Upper win rate (%)"],
  ["range:-1:70", "Lower win rate (%)"],
  ["below:0", "Below win rate (%)"],
  ["above:100", "Above win rate (%)"],
  ["above:2.55", "Above win rate (%)"],
])(
  "keeps invalid percentage input and explains its correction (%s)",
  (initial, label) => {
    render(<Harness initial={initial} />);
    const input = screen.getByLabelText(label);
    fireEvent.blur(input);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/Enter/);
    expect(screen.getByLabelText("Win-rate preference")).not.toHaveAttribute(
      "aria-invalid",
    );
    expect(screen.getByLabelText("Request")).toHaveTextContent(initial);
  },
);
it("explains a legacy percentage without silently treating it as a newly agreed constraint", () => {
  render(<Harness initial="75" />);
  expect(screen.getByLabelText("Win-rate preference")).toHaveValue("");
  expect(screen.getByText(/Previous request: 75%/)).toBeVisible();
});
it("keeps the specific range correction when a group validation error is supplied", () => {
  render(
    <WinRateInput
      id="wr"
      label="Requested win rate"
      value="range:80:60"
      change={() => {}}
      error="Choose a valid preference."
    />,
  );
  expect(
    screen.getByLabelText("Upper win rate (%)"),
  ).toHaveAccessibleDescription(
    expect.stringContaining("greater than the lower win rate (80%)"),
  );
  expect(screen.getByLabelText("Lower win rate (%)")).not.toHaveAttribute(
    "aria-invalid",
  );
  expect(screen.getByLabelText("Win-rate preference")).not.toHaveAttribute(
    "aria-invalid",
  );
  expect(
    screen.queryByText("Choose a valid preference."),
  ).not.toBeInTheDocument();
});
