import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { expect, it } from "vitest";
import CoverEditor from "./cover-editor";
import { productIssues } from "./validation";
import { productSchema, type Product } from "./model";
it("requires explicit cover selection and clears it when that image is removed", async () => {
  const product = productSchema.parse({
    title: "Account",
    description: "Synthetic account description",
    region: "Europe",
    rank: "Gold",
    attributes: [],
    media_ids: ["image-a", "image-b"],
    currency: "USD",
    amount_minor: "1000",
    sale_terms: "Synthetic buyer sale terms",
    transfer_requirements: "Synthetic transfer requirements",
    dispute_terms: "Synthetic dispute terms",
    acknowledgement_terms: "Synthetic acknowledgement terms",
    dispute_hours: 24,
    delivery_min_hours: 1,
    delivery_max_hours: 24,
  });
  let current = product;
  function Editor() {
    const [value, setValue] = useState<Product>(product);
    return (
      <CoverEditor
        product={value}
        change={(patch) => {
          current = { ...value, ...patch };
          setValue(current);
        }}
      />
    );
  }
  render(<Editor />);
  expect(productIssues(current, true)).toContainEqual(
    expect.objectContaining({ path: "product.cover_media_id" }),
  );
  fireEvent.change(screen.getByLabelText("Account title image"), {
    target: { value: "image-b" },
  });
  expect(productIssues(current, true)).toEqual([]);
  // Removal is explicit; it must never silently select another cover.
  const remove = screen.getAllByRole("button", { name: /Remove/ });
  const second = remove[1];
  if (!second) throw new Error("Missing second image removal control");
  fireEvent.click(second);
  await waitFor(() => {
    expect(
      screen.getByRole("group", { name: "Reviewed image 1" }),
    ).toHaveFocus();
  });
  expect(current.cover_media_id).toBe("");
  expect(current.media_ids).toEqual(["image-a"]);
  expect(productIssues(current, true)).toContainEqual(
    expect.objectContaining({ path: "product.cover_media_id" }),
  );
});
it("keeps focus with an image moved to the start of the gallery", async () => {
  const product = productSchema.parse({
    title: "Account",
    description: "Account details",
    region: "Europe",
    rank: "Gold",
    attributes: [],
    media_ids: ["a", "b"],
    cover_media_id: "b",
    currency: "USD",
    amount_minor: "1000",
    sale_terms: "Sale terms",
    transfer_requirements: "Transfer terms",
    dispute_terms: "Dispute terms",
    acknowledgement_terms: "Acknowledgement terms",
    dispute_hours: 24,
    delivery_min_hours: 1,
    delivery_max_hours: 24,
  });
  function Editor() {
    const [value, setValue] = useState(product);
    return (
      <CoverEditor
        product={value}
        change={(patch) => {
          setValue({ ...value, ...patch });
        }}
      />
    );
  }
  render(<Editor />);
  const second = screen.getByRole("group", {
    name: "Reviewed image 2 · Title image",
  });
  fireEvent.click(within(second).getByRole("button", { name: "Move up" }));
  await waitFor(() => {
    expect(
      screen.getByRole("group", { name: "Reviewed image 1 · Title image" }),
    ).toHaveFocus();
  });
});
