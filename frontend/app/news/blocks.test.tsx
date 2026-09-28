import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { it, expect } from "vitest";
import { BlocksEditor } from "./blocks";
import { emptyBlock, type Block } from "./model";
function Editor() {
  const [value, setValue] = useState<Block[]>([
    { ...emptyBlock("paragraph"), text: "First" },
    {
      ...emptyBlock("table"),
      text: "Comparison",
      headers: ["One", "Two"],
      rows: [["a", "b"]],
    },
  ]);
  return <BlocksEditor value={value} change={setValue} />;
}
it("retains exact table text while typing and focuses moved and inserted blocks", async () => {
  render(<Editor />);
  const field = screen.getByLabelText(
    "Table rows · one row per line, cells separated by |",
  );
  fireEvent.change(field, {
    target: { value: "  left |right  \nnext| cell " },
  });
  expect(field).toHaveValue("  left |right  \nnext| cell ");
  fireEvent.click(screen.getByRole("button", { name: "Move block 2 up" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Table caption")).toHaveFocus(),
  );
  expect(
    screen.getByLabelText(
      "Table rows · one row per line, cells separated by |",
    ),
  ).toHaveValue("  left |right  \nnext| cell ");
  fireEvent.click(screen.getByRole("button", { name: "Add paragraph block" }));
  await waitFor(() =>
    expect(screen.getAllByLabelText("Text").at(-1)).toHaveFocus(),
  );
});
