import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { expect, it } from "vitest";
import { emptyField, type Service } from "./model";
import SurchargeEditor from "./surcharge-editor";
import { selectionSurchargeHint } from "./surcharge-hint";

const service: Service = {
  key: "boost",
  name: "Boost",
  description: "",
  evaluator: "pricing-v1",
  rules: [],
  fields: [
    {
      ...emptyField("heroes"),
      type: "multiselect",
      label: "Preferred heroes",
      stage: "estimate",
      max_selections: 5,
    },
  ],
  pricing: {
    currency: "USD",
    base_minor: "2000",
    minimum_minor: "1000",
    maximum_minor: "1000000",
    rules: [],
    cases: [],
  },
};
function Editor() {
  const [current, set] = useState(service);
  return (
    <>
      <SurchargeEditor
        path="services.0.pricing.surcharges"
        service={current}
        change={(surcharges) => {
          if (!current.pricing) throw new Error("Missing test pricing");
          set({ ...current, pricing: { ...current.pricing, surcharges } });
        }}
      />
      <output aria-label="Authored surcharges">
        {JSON.stringify(current.pricing?.surcharges)}
      </output>
    </>
  );
}
it("authors complete hero-count tiers and preserves the base-price explanation", () => {
  render(<Editor />);
  fireEvent.click(
    screen.getByRole("button", { name: "Add base-price surcharge" }),
  );
  fireEvent.click(screen.getByText("New surcharge", { selector: "summary" }));
  fireEvent.change(screen.getByLabelText("Surcharge type"), {
    target: { value: "selection_count" },
  });
  fireEvent.change(screen.getByLabelText("Count selected choices in"), {
    target: { value: "heroes" },
  });
  for (let i = 1; i <= 5; i++)
    fireEvent.change(
      screen.getByLabelText(`${String(i)} selected — percentage to add`),
      { target: { value: String(60 - i * 10) } },
    );
  expect(screen.getByLabelText("Authored surcharges")).toHaveTextContent(
    '"count":5,"percent":"10"',
  );
  expect(
    screen.getByText(/Surcharges never multiply each other/),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Remove surcharge" }));
  expect(screen.getByLabelText("Authored surcharges")).toHaveTextContent("[]");
});
it("describes the current hero premium without calculating money in the client", () => {
  const s = structuredClone(service);
  if (!s.pricing) throw new Error("Missing test pricing");
  s.pricing.surcharges = [
    {
      key: "heroes",
      label: "Heroes",
      kind: "selection_count",
      field: "heroes",
      value: "",
      rates: [
        { count: 1, percent: "50" },
        { count: 2, percent: "40" },
      ],
    },
  ];
  expect(selectionSurchargeHint(s, "heroes", {})).toBe(
    "No surcharge without a selection.",
  );
  expect(selectionSurchargeHint(s, "heroes", { heroes: ["a"] })).toBe(
    "Adds 50% of the base estimate.",
  );
  expect(selectionSurchargeHint(s, "heroes", { heroes: ["a", "b"] })).toBe(
    "Adds 40% of the base estimate.",
  );
  expect(
    selectionSurchargeHint(s, "heroes", { heroes: ["a", "b", "c"] }),
  ).toBeUndefined();
});
