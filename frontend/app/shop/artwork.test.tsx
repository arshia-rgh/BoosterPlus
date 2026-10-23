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

it("overlays a Global globe without replacing the product artwork", () => {
  const { container } = render(
    <ShopArtwork
      source="/catalog-assets/item.webp"
      alt="Item artwork"
      regions={["Global"]}
    />,
  );
  expect(screen.getByRole("img", { name: "Item artwork" })).toHaveAttribute(
    "src",
    "/catalog-assets/item.webp",
  );
  expect(
    container.querySelector('.shop-region-badge svg[data-region="global"]'),
  ).toBeInTheDocument();
  expect(container.querySelector(".shop-region-badge")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
});
it("keeps both SG/MY flags through loading and image failure, deduplicating regions", () => {
  const { container } = render(
    <ShopArtwork
      source="/catalog-assets/item.webp"
      alt="Item artwork"
      regions={["Singapore / Malaysia", "Singapore"]}
    />,
  );
  expect(container.querySelectorAll(".shop-region-badge img")).toHaveLength(2);
  fireEvent.error(screen.getByRole("img", { name: "Item artwork" }));
  expect(
    screen.getByRole("img", { name: /artwork unavailable/ }),
  ).toBeVisible();
  expect(container.querySelectorAll(".shop-region-badge img")).toHaveLength(2);
});
it("does not guess a flag for an unknown region or from the artwork alt", () => {
  const { container } = render(
    <ShopArtwork
      source="/catalog-assets/item.webp"
      alt="Indonesia artwork"
      regions={["Europe", "Special Indonesia offer"]}
    />,
  );
  expect(container.querySelector(".shop-region-badge")).not.toBeInTheDocument();
});
it.each([
  ["Indonesia", "id"],
  ["Philippines", "ph"],
  ["Russia", "ru"],
  ["Türkiye", "tr"],
  ["Turkey", "tr"],
  ["United States", "us"],
])("maps %s to its country flag", (region, flag) => {
  const { container } = render(
    <ShopArtwork
      source="/catalog-assets/item.webp"
      alt="Item"
      regions={[region]}
    />,
  );
  expect(container.querySelector(".shop-region-badge img")).toHaveAttribute(
    "src",
    "/region-flags/" + flag + ".svg",
  );
});
