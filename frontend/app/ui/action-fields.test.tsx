import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";
import { Text, ErrorNotice } from "../catalog/controls";
import { APIError } from "../identity/api";
import { ActionFields } from "./action-fields";
import { useActionValidation } from "./action-validation";
import { useEditorValidation } from "./editor-validation";
import { FieldValidation, ValidationSummary } from "./form-validation";

function Editor() {
  const [error, setError] = useState<unknown>(null);
  const [first, setFirst] = useState("Keep my draft");
  const [second, setSecond] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <ActionFields error={error} busy={busy}>
      <fieldset disabled={busy}>
        <Text name="first" label="First" value={first} change={setFirst} />
        <Text name="second" label="Second" value={second} change={setSecond} />
      </fieldset>
      <button
        onClick={() => {
          setBusy(true);
          const rejected = new APIError("Review the fields.");
          rejected.issues = [
            { path: "second", message: "Second issue." },
            { path: "first", message: "First issue." },
          ];
          setError(rejected);
          setTimeout(() => {
            setBusy(false);
          }, 30);
        }}
      >
        Save
      </button>
      <ErrorNotice error={error} />
    </ActionFields>
  );
}
it("waits for enabled inputs, chooses screen order and preserves drafts after rejection", async () => {
  render(<Editor />);
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(screen.getByLabelText("First")).toHaveFocus());
  expect(screen.getByLabelText("First")).toHaveValue("Keep my draft");
  expect(screen.getByLabelText("First")).toHaveAccessibleDescription(
    "First issue.",
  );
  fireEvent.change(screen.getByLabelText("First"), {
    target: { value: "Corrected" },
  });
  expect(screen.getByLabelText("First")).not.toHaveAttribute("aria-invalid");
  expect(screen.getByLabelText("First")).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(screen.getByLabelText("First")).toHaveAttribute(
      "aria-invalid",
      "true",
    ),
  );
});

it("does not refocus an unknown-error summary while another field is edited", async () => {
  function Unknown() {
    const [error, setError] = useState<unknown>(null),
      [value, setValue] = useState("");
    return (
      <ActionFields error={error}>
        <Text name="note" label="Note" value={value} change={setValue} />
        <button
          onClick={() => {
            const e = new APIError("Review record.");
            e.issues = [
              { path: "record", message: "Reload this record before saving." },
            ];
            setError(e);
          }}
        >
          Save
        </button>
        <ErrorNotice error={error} />
      </ActionFields>
    );
  }
  render(<Unknown />);
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(screen.getByRole("list", { name: "Fields to check" })).toHaveFocus(),
  );
  const field = screen.getByLabelText("Note");
  field.focus();
  fireEvent.change(field, { target: { value: "Retain this note" } });
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(field).toHaveFocus();
});

function SharedCorrection({ kind }: { kind: "action" | "editor" }) {
  const action = useActionValidation(),
    editor = useEditorValidation();
  const current = kind === "action" ? action : editor;
  const [value, setValue] = useState("");
  return (
    <FieldValidation value={current.validation}>
      <Text name="note" label="Note" value={value} change={setValue} />
      <button
        onClick={() =>
          current.check([{ path: "record", message: "Reload this record." }])
        }
      >
        Save
      </button>
      <ValidationSummary
        issues={current.validation.issues}
        fields={current.validation.fields}
        focus={current.validation.focus}
        autoFocusUnknown
      />
    </FieldValidation>
  );
}
for (const kind of ["action", "editor"] as const) {
  it(`keeps editing focus after unknown ${kind} validation`, async () => {
    render(<SharedCorrection kind={kind} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(
        screen.getByRole("list", { name: "Fields to check" }),
      ).toHaveFocus(),
    );
    const input = screen.getByLabelText("Note");
    input.focus();
    fireEvent.change(input, { target: { value: "Keep editing" } });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(input).toHaveFocus();
  });
}
