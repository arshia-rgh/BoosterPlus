import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { supplierProduct } from "../../tests/fixtures/supplier-shop/data";
import { PublishedPrice } from "./published-price";

it("shows an exact strong published price without From even when buying is disabled", () => {
  const product = supplierProduct("id");
  product.supplier_available = false;
  if (product.definition.supplier)
    product.definition.supplier.quantity = {
      kind: "one",
      min: "1",
      max: "1",
      step: "1",
    };
  const { container } = render(<PublishedPrice product={product} detail />);
  expect(screen.getByText("USD 5.75").tagName).toBe("STRONG");
  expect(container).not.toHaveTextContent(/from|quantity/i);
});
it("does not multiply an already published fractional supplier quantity again", () => {
  render(<PublishedPrice product={supplierProduct("id")} />);
  expect(screen.getByText("USD 5.75")).toBeInTheDocument();
  expect(screen.getByText("For quantity 0.5")).toBeInTheDocument();
});
it("shows a range for differing manual options, ignores disabled prices and separates currencies", () => {
  const product = supplierProduct("id");
  delete product.definition.supplier;
  const first = product.definition.variants[0];
  if (!first) throw new Error("Missing variant fixture");
  product.definition.variants = [
    first,
    { ...first, key: "second", unit_amount_minor: "1234" },
    { ...first, key: "disabled", unit_amount_minor: "1", enabled: false },
    { ...first, key: "euro", currency: "EUR", unit_amount_minor: "499" },
  ];
  render(<PublishedPrice product={product} />);
  expect(screen.getByText("USD 5.75 – 12.34")).toBeInTheDocument();
  expect(screen.getByText("EUR 4.99")).toBeInTheDocument();
  expect(screen.getByText("By option")).toBeInTheDocument();
  expect(screen.queryByText(/0.01|From/)).not.toBeInTheDocument();
});
it("shows the mandatory minimum total and quantity, preserving exact large amounts", () => {
  const product = supplierProduct("id");
  delete product.definition.supplier;
  const first = product.definition.variants[0];
  if (!first) throw new Error("Missing variant fixture");
  first.min_quantity = 3;
  first.unit_amount_minor = "9007199254740993";
  render(<PublishedPrice product={product} />);
  expect(screen.getByText("USD 270215977642229.79")).toBeInTheDocument();
  expect(screen.getByText("For 3 items")).toBeInTheDocument();
});
it("does not invent a price when no variant is enabled", () => {
  const product = supplierProduct("id");
  const first = product.definition.variants[0];
  if (!first) throw new Error("Missing variant fixture");
  first.enabled = false;
  const { container } = render(<PublishedPrice product={product} />);
  expect(container).toBeEmptyDOMElement();
});
