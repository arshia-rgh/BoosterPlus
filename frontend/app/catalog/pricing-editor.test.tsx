import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { expect, it } from "vitest";
import { PricingEditor } from "./pricing-editor";
import { majorToMinor, minorToMajor } from "./money-input";
import { withDeliveryHours } from "./delivery-hours";
import { emptyConfiguration, emptyField, type Service } from "./model";

const config = emptyConfiguration("Synthetic game");
const service: Service = {
  key: "boost",
  name: "Boost",
  description: "",
  evaluator: "pricing-v1",
  rules: [],
  fields: [
    { ...emptyField("quantity"), label: "Matches", type: "integer" },
    { ...emptyField("region"), label: "Region", type: "select" },
    { ...emptyField("old_wr"), label: "Win-rate", type: "win_rate" },
    {
      ...emptyField("from"),
      label: "Starting rank",
      type: "rank",
      reference: "ranks",
    },
    {
      ...emptyField("to"),
      label: "Target rank",
      type: "rank",
      reference: "ranks",
    },
    {
      ...emptyField("other"),
      label: "Other game's rank",
      type: "rank",
      reference: "other_ranks",
    },
  ],
  pricing: {
    currency: "USD",
    base_minor: "1000",
    minimum_minor: "1",
    maximum_minor: "999999",
    cases: [],
    rules: [
      {
        key: "extra",
        label: "Match fee",
        kind: "per_unit",
        value: "125",
        field: "quantity",
        from: "",
        to: "",
        from_units: "",
        to_units: "",
        intervals: [],
      },
    ],
  },
};
function Editor() {
  const [current, setCurrent] = useState(service);
  return (
    <>
      <PricingEditor
        service={current}
        config={config}
        path="services.0"
        change={(patch) => {
          setCurrent({ ...current, ...patch });
        }}
      />
      <output aria-label="Saved pricing">
        {JSON.stringify(current.pricing)}
      </output>
    </>
  );
}

it("edits ordinary currency amounts without floating-point conversion or premature rounding", () => {
  render(<Editor />);
  expect(screen.getByLabelText("Base price (USD)")).toHaveValue("10.00");
  fireEvent.change(screen.getByLabelText("Base price (USD)"), {
    target: { value: "12.3456789" },
  });
  expect(screen.getByLabelText("Saved pricing")).toHaveTextContent(
    '"base_minor":"1234.56789"',
  );
  fireEvent.change(screen.getByLabelText("Maximum estimate (USD)"), {
    target: { value: "99.999" },
  });
  expect(screen.getByLabelText("Maximum estimate (USD)")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(screen.getByLabelText("Saved pricing")).toHaveTextContent(
    '"maximum_minor":""',
  );
});

it("offers only compatible pricing fields and describes ordered operations", () => {
  render(<Editor />);
  fireEvent.click(screen.getByText("Match fee · per_unit"));
  const quantity = within(screen.getByLabelText("Quantity field"));
  expect(quantity.getByRole("option", { name: "Matches" })).toBeVisible();
  expect(
    quantity.queryByRole("option", { name: "Region" }),
  ).not.toBeInTheDocument();
  expect(
    quantity.queryByRole("option", { name: "Win-rate" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText("Add USD 1.25 for each unit of Matches"),
  ).toBeVisible();
  fireEvent.change(screen.getByLabelText("Price operation"), {
    target: { value: "rank_interval" },
  });
  fireEvent.change(screen.getByLabelText("Price starting rank field"), {
    target: { value: "from" },
  });
  const target = within(screen.getByLabelText("Price target rank field"));
  expect(target.getByRole("option", { name: "Target rank" })).toBeVisible();
  expect(
    target.queryByRole("option", { name: "Other game's rank" }),
  ).not.toBeInTheDocument();
});

it("converts exact intermediate values and rejects ambiguous or out-of-range inputs", () => {
  for (const [major, minor] of [
    ["0.01", "1"],
    ["1.0025", "100.25"],
    ["9999999999.99999999", "999999999999.999999"],
    ["0.00000001", "0.000001"],
  ]) {
    expect(majorToMinor(major ?? "")).toBe(minor);
    expect(minorToMajor(minor ?? "")).toBe(major);
  }
  for (const invalid of [
    "-1",
    "1e3",
    "12,50",
    "$12",
    "01.20",
    "10000000000",
    "0.123456789",
  ])
    expect(majorToMinor(invalid)).toBeNull();
});

it("adds an explicit editable delivery request pair without changing existing priority or duplicating keys", () => {
  const original = {
    ...service,
    fields: [
      ...service.fields,
      { ...emptyField("priority"), label: "Priority" },
    ],
  };
  const next = { ...original, ...withDeliveryHours(original) };
  expect(
    next.fields.filter((field) => field.key.startsWith("delivery_")),
  ).toHaveLength(2);
  expect(
    next.fields.find((field) => field.key === "delivery_min_hours")?.help,
  ).toMatch(/not a guarantee/);
  expect(next.rules.find((rule) => rule.key === "delivery_hours")?.kind).toBe(
    "ordered_numbers",
  );
  expect(next.fields.find((field) => field.key === "priority")).toBeDefined();
  expect(withDeliveryHours(next)).toEqual({});
  expect(original.fields).toHaveLength(service.fields.length + 1);
});
