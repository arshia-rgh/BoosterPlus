import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import ChoiceInput from "./choice-input";
import { emptyField, type Answers } from "./model";
const options = Array.from({ length: 20 }, (_, i) => ({
  key: `hero${String(i)}`,
  label: `Hero ${String(i)}`,
  units: 0,
}));
function Harness({
  radio = false,
  disabled = false,
}: {
  radio?: boolean;
  disabled?: boolean;
}) {
  const [value, change] = useState<Answers[string] | undefined>(
    radio ? "hero2" : [],
  );
  return (
    <ChoiceInput
      field={{
        ...emptyField("heroes"),
        label: "Heroes",
        type: radio ? "radio" : "multiselect",
        max_selections: 2,
      }}
      options={options}
      value={value}
      change={change}
      id="heroes"
      label="Heroes"
      describedBy={undefined}
      invalid={false}
      disabled={disabled}
    />
  );
}
it("searches without losing selections, enforces the bound, and restores focus after removal", () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Hero 2" }));
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "Hero 19" },
  });
  expect(screen.getByRole("button", { name: "Remove Hero 2" })).toBeVisible();
  fireEvent.click(screen.getByRole("checkbox", { name: "Hero 19" }));
  expect(screen.getByText(/2 selected/)).toHaveTextContent(
    "Remove a selection",
  );
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(screen.getByRole("checkbox", { name: "Hero 3" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Remove Hero 2" }));
  expect(screen.getByRole("searchbox")).toHaveFocus();
  expect(screen.getByRole("checkbox", { name: "Hero 3" })).toBeEnabled();
  expect(
    within(screen.getByRole("list", { name: "Selected choices" })).getAllByRole(
      "button",
    ),
  ).toHaveLength(1);
});
it("shows an empty-search recovery and retains a selected radio's name", () => {
  render(<Harness radio />);
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "nonexistent" },
  });
  expect(screen.getByText("Selected: Hero 2")).toBeVisible();
  expect(screen.getByText(/No matches/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(screen.getByRole("radio", { name: "Hero 2" })).toBeChecked();
  expect(screen.getByRole("searchbox")).toHaveFocus();
});
it("keeps a relationship-disabled selector and search disabled", () => {
  render(<Harness disabled />);
  expect(screen.getByRole("searchbox")).toBeDisabled();
  expect(
    screen.getAllByRole("checkbox").every((e) => e.matches(":disabled")),
  ).toBe(true);
});
