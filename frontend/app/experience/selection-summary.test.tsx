import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import SelectionSummary, { selectedLabel } from "./selection-summary";
import { emptyConfiguration, emptyField, type Service } from "../catalog/model";
it("opens compact details with a named native modal and a close control", () => {
  const beforeShow = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    "showModal",
  );
  const beforeClose = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    "close",
  );
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false;
    },
  });
  try {
    render(
      <SelectionSummary
        config={emptyConfiguration("Game")}
        service={{
          key: "boost",
          name: "Boost",
          description: "",
          evaluator: "manual-review-v1",
          fields: [],
          rules: [],
        }}
        values={{}}
        stage="estimate"
        fixed={false}
        compact
        state="estimated"
        priceDetails={<p>USD 25.00</p>}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Price & selections" }));
    const modal = screen.getByRole("dialog", { name: "Price & selections" });
    expect(modal).toHaveTextContent("USD 25.00");
    expect(modal).toHaveTextContent("Your provisional estimate is shown here");
    fireEvent.click(
      within(modal).getByRole("button", { name: "Close details" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  } finally {
    for (const [name, descriptor] of [
      ["showModal", beforeShow],
      ["close", beforeClose],
    ] as const) {
      if (descriptor)
        Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
      else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
    }
  }
});
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
