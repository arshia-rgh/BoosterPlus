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

it("inserts an image row between text blocks, preserves captions on reorder and limits each row", async () => {
  let latest: Block[] = [];
  function Rows() {
    const [value, setValue] = useState([
      { ...emptyBlock("paragraph"), text: "Before images" },
      { ...emptyBlock("paragraph"), text: "After images" },
    ]);
    return (
      <BlocksEditor
        value={value}
        change={(next) => {
          latest = next;
          setValue(next);
        }}
      />
    );
  }
  render(<Rows />);
  fireEvent.change(screen.getByLabelText("New block type"), {
    target: { value: "gallery" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Insert image row after block 1" }),
  );
  expect(latest.map((block) => block.kind)).toEqual([
    "paragraph",
    "gallery",
    "paragraph",
  ]);
  await waitFor(() => {
    expect(
      screen.getByLabelText("Image row description (optional)"),
    ).toHaveFocus();
  });
  fireEvent.change(screen.getByLabelText("Image 1 description"), {
    target: { value: "First image" },
  });
  fireEvent.change(screen.getByLabelText("Image 1 caption (optional)"), {
    target: { value: "First caption" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add image to row" }));
  fireEvent.change(screen.getByLabelText("Image 2 description"), {
    target: { value: "Second image" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Move image 1 later" }));
  expect(screen.getByLabelText("Image 2 description")).toHaveValue(
    "First image",
  );
  expect(screen.getByLabelText("Image 2 caption (optional)")).toHaveValue(
    "First caption",
  );
  fireEvent.click(screen.getByRole("button", { name: "Add image to row" }));
  fireEvent.click(screen.getByRole("button", { name: "Add image to row" }));
  expect(
    screen.getByRole("button", { name: "Add image to row" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Remove image 1" }));
  expect(latest.at(1)?.images?.at(0)?.alt).toBe("First image");
  expect(latest.at(0)?.text).toBe("Before images");
  expect(latest.at(2)?.text).toBe("After images");
});
