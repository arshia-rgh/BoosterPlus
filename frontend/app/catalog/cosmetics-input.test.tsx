import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { expect, it } from "vitest";
import { Input } from "./dynamic-form";
import { emptyConfiguration, emptyField, type Answers } from "./model";
import {
  FieldValidation,
  useFormValidation,
  type FieldIssue,
} from "../ui/form-validation";
it("names the required collection and describes its first action with the error", async () => {
  function Editor() {
    const [issues, setIssues] = useState<FieldIssue[]>([]);
    const validation = useFormValidation(issues, () => {
      setIssues([]);
    });
    return (
      <FieldValidation value={validation}>
        <Input
          field={{
            ...emptyField("skins"),
            label: "Skin collection",
            type: "cosmetics",
            stage: "order",
          }}
          config={emptyConfiguration("Game")}
          required
          value={undefined}
          error={undefined}
          change={() => undefined}
        />
        <button
          onClick={() => {
            setIssues([
              { path: "skins", message: "Add at least one skin group." },
            ]);
          }}
        >
          Check collection
        </button>
      </FieldValidation>
    );
  }
  render(<Editor />);
  fireEvent.click(screen.getByRole("button", { name: "Check collection" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Add skin group" }),
    ).toHaveFocus(),
  );
  expect(
    screen.getByRole("group", { name: "Skin collection (required)" }),
  ).toHaveAttribute("aria-invalid", "true");
  expect(
    screen.getByRole("button", { name: "Add skin group" }),
  ).toHaveAccessibleDescription("Add at least one skin group.");
});
it("keeps exact skin names private and focuses a mismatching quantity", async () => {
  let saved: Answers[string] | undefined;
  function Editor() {
    const [value, setValue] = useState<Answers[string] | undefined>(undefined),
      [issues, setIssues] = useState<FieldIssue[]>([]);
    const validation = useFormValidation(issues, () => {
      setIssues([]);
    });
    return (
      <FieldValidation value={validation}>
        <Input
          field={{
            ...emptyField("skins"),
            label: "Skin collection",
            type: "cosmetics",
            stage: "order",
            options: [{ key: "Collector", label: "Collector", units: 0 }],
          }}
          config={emptyConfiguration("Game")}
          required
          value={value}
          error={undefined}
          change={(next) => {
            saved = next;
            setValue(next);
          }}
        />
        <button
          onClick={() => {
            setIssues([
              {
                path: "skins.groups.0.count",
                message: "Quantity must match the named skins.",
              },
            ]);
          }}
        >
          Check quantity
        </button>
      </FieldValidation>
    );
  }
  render(<Editor />);
  fireEvent.click(screen.getByRole("button", { name: "Add skin group" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Skin category 1")).toHaveFocus();
  });
  fireEvent.change(screen.getByLabelText("Skin category 1"), {
    target: { value: "Collector" },
  });
  fireEvent.change(screen.getByLabelText("Quantity in group 1"), {
    target: { value: "2" },
  });
  fireEvent.change(screen.getByLabelText("Skin or hero names in group 1"), {
    target: { value: "Aldous\nYu Zhong" },
  });
  expect(saved).toEqual({
    groups: [
      { category: "Collector", count: "2", names: ["Aldous", "Yu Zhong"] },
    ],
  });
  fireEvent.click(screen.getByRole("button", { name: "Check quantity" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Quantity in group 1")).toHaveFocus();
  });
  fireEvent.click(screen.getByRole("button", { name: "Remove skin group 1" }));
  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: "Add skin group" }),
    ).toHaveFocus();
  });
  expect(saved).toEqual({ groups: [] });
});
