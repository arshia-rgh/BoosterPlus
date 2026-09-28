import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import ShopArtwork from "./artwork";
it("preserves a labeled fallback after media failure and recovers for a different local asset", () => {
  const { rerender } = render(
    <ShopArtwork source="/catalog-assets/item.webp" alt="Item artwork" />,
  );
  fireEvent.error(screen.getByRole("img", { name: "Item artwork" }));
  expect(
    screen.getByRole("img", { name: "Item artwork — artwork unavailable" }),
  ).toHaveTextContent("Artwork unavailable");
  rerender(
    <ShopArtwork source="/catalog-assets/next.webp" alt="New artwork" />,
  );
  expect(screen.getByRole("img", { name: "New artwork" })).toHaveAttribute(
    "src",
    "/catalog-assets/next.webp",
  );
  rerender(
    <ShopArtwork source="https://external.test/track" alt="Unsafe artwork" />,
  );
  expect(screen.getByRole("img")).not.toHaveAttribute("src");
});
