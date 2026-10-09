import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Check, Select, Text, Issues } from "../catalog/controls";
import {
  FieldValidation,
  useFormValidation,
  type FieldIssue,
} from "./form-validation";

function Editor() {
  const [section, setSection] = useState("basics");
  const [value, setValue] = useState("My retained draft");
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const validation = useFormValidation(
    issues,
    (name) => {
      setIssues((old) => old.filter((issue) => issue.path !== name));
    },
    () => {
      setSection("forms");
    },
  );
  return (
    <FieldValidation value={validation}>
      <Text name="name" label="Game title" value={value} change={setValue} />
      <section key={section} hidden={section !== "forms"}>
        <details>
          <summary>Boosting form</summary>
          <Select
            name="services.0.fields.0.type"
            label="Field type"
            value=""
            change={() => {}}
            options={[
              ["", "Choose a field type"],
              ["rank", "Rank"],
            ]}
          />
          <Check
            name="reviewed"
            label="Review confirmed"
            value={false}
            change={() => {}}
          />
        </details>
      </section>
      <button
        onClick={() => {
          setIssues([
            {
              path: "services.0.fields.0.type",
              message: "Choose a supported type.",
            },
            { path: "reviewed", message: "Confirm your review." },
          ]);
        }}
      >
        Save
      </button>
      <Issues issues={issues} />
    </FieldValidation>
  );
}
it("reveals a hidden editor section and collapsed group, focuses and scrolls to the labeled invalid field", async () => {
  const scroll = vi.fn();
  const original = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "scrollIntoView",
  );
  HTMLElement.prototype.scrollIntoView = scroll;
  try {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const field = await screen.findByLabelText("Field type");
    await waitFor(() => {
      expect(field).toHaveFocus();
    });
    expect(field.closest("details")).toHaveAttribute("open");
    expect(field).toBeVisible();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("Choose a supported type.");
    expect(
      screen.getByRole("link", {
        name: "Field type: Choose a supported type.",
      }),
    ).toBeVisible();
    expect(
      screen.queryByText("services.0.fields.0.type"),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Game title")).toHaveValue(
      "My retained draft",
    );
    expect(scroll).toHaveBeenCalledWith({
      block: "center",
      behavior: "instant",
    });
    screen.getByLabelText("Game title").focus();
    fireEvent.change(screen.getByLabelText("Game title"), {
      target: { value: "An unrelated valid edit" },
    });
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
    expect(screen.getByLabelText("Game title")).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(field).toHaveFocus());
    fireEvent.change(field, { target: { value: "rank" } });
    await waitFor(() => {
      expect(field).not.toHaveAttribute("aria-invalid");
    });
    expect(field).toHaveFocus();
    fireEvent.click(
      screen.getByRole("link", {
        name: "Review confirmed: Confirm your review.",
      }),
    );
    await waitFor(() => {
      expect(screen.getByLabelText("Review confirmed")).toHaveFocus();
    });
  } finally {
    if (original)
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", original);
    else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  }
});
