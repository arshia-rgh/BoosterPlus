import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, Link } from "react-router";
import { it, expect } from "vitest";
import { RecordDraftBoundary, useRecordDraft } from "./record-drafts";
function Draft({ name }: { name: string }) {
  const [value, setValue] = useState("");
  useRecordDraft(!!value);
  return (
    <label>
      {name}
      <textarea
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
        }}
      />
    </label>
  );
}
it("aggregates independent local drafts without replacing another section's leave guard", async () => {
  const router = createMemoryRouter(
    [
      {
        path: "/order",
        element: (
          <RecordDraftBoundary>
            <Draft name="Public reply" />
            <Draft name="Delivery note" />
            <Link to="/queue">Queue</Link>
          </RecordDraftBoundary>
        ),
      },
      { path: "/queue", element: <h1>Queue destination</h1> },
    ],
    { initialEntries: ["/order"] },
  );
  render(<RouterProvider router={router} />);
  fireEvent.change(screen.getByLabelText("Public reply"), {
    target: { value: "Unsent customer reply" },
  });
  fireEvent.change(screen.getByLabelText("Delivery note"), {
    target: { value: "Unsent delivery note" },
  });
  fireEvent.change(screen.getByLabelText("Delivery note"), {
    target: { value: "" },
  });
  fireEvent.click(screen.getByRole("link", { name: "Queue" }));
  expect(await screen.findByRole("alert")).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Stay on order" }));
  expect(screen.getByLabelText("Public reply")).toHaveValue(
    "Unsent customer reply",
  );
  fireEvent.click(screen.getByRole("link", { name: "Queue" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Discard drafts and leave" }),
  );
  expect(await screen.findByText("Queue destination")).toBeVisible();
});
