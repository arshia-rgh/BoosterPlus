import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import SelectionSummary, { selectedLabel } from "./selection-summary";
import { emptyConfiguration, emptyField, type Service } from "../catalog/model";
it("uses labels, handles false and zero, and does not duplicate private or hidden fields", () => {
  const config = emptyConfiguration("Any game");
  const service: Service = {
    key: "boost",
    name: "Boost",
    description: "",
    evaluator: "manual-review-v1",
    rules: [],
    fields: [
      {
        ...emptyField("rank"),
        type: "rank",
        label: "Starting rank",
        options: [{ key: "low", label: "Entry tier", units: 0 }],
      },
      { ...emptyField("solo"), type: "boolean", label: "Single hero" },
      { ...emptyField("stars"), type: "integer", label: "Stars" },
      {
        ...emptyField("hidden"),
        label: "Hidden hero",
        visible_when: {
          op: "eq",
          field: "solo",
          values: ["true"],
          children: [],
        },
      },
      {
        ...emptyField("note"),
        type: "short_text",
        label: "Private note",
        stage: "order",
      },
      {
        ...emptyField("player"),
        type: "short_text",
        label: "Player ID",
        stage: "fulfillment",
      },
    ],
  };
  render(
    <SelectionSummary
      config={config}
      service={service}
      values={{
        rank: "low",
        solo: false,
        stars: "0",
        hidden: "Secret",
        note: "Private message",
        player: "Account identifier",
      }}
      stage="order"
      fixed={false}
    />,
  );
  const summary = within(
    screen.getByRole("complementary", { name: "Selection summary" }),
  );
  expect(summary.getByText("Entry tier")).toBeVisible();
  expect(summary.getByText("No")).toBeVisible();
  expect(summary.getByText("0")).toBeVisible();
  expect(summary.getByRole("progressbar")).toHaveAttribute("value", "4");
  expect(summary.getByRole("progressbar")).toHaveAttribute("max", "4");
  for (const text of [
    "Secret",
    "Hidden hero",
    "Private message",
    "Private note",
    "Account identifier",
    "Player ID",
  ])
    expect(summary.queryByText(text)).not.toBeInTheDocument();
});
it("formats multiselect labels and empty values without inventing choices", () => {
  expect(selectedLabel(["a", "b"], [{ key: "a", label: "Alpha" }])).toBe(
    "Alpha, b",
  );
  expect(selectedLabel([], [])).toBe("Not selected");
  expect(selectedLabel(undefined, [])).toBe("Not selected");
  expect(selectedLabel("", [])).toBe("Not selected");
  expect(selectedLabel(true, [])).toBe("Yes");
});
