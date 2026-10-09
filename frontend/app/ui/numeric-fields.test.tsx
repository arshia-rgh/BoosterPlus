import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { NumberInput } from "../catalog/controls";
import { invalidNumericFields } from "./numeric-fields";
function Harness() {
  const [value, setValue] = useState(30);
  return (
    <>
      <NumberInput
        name="window_minutes"
        label="Checkout minutes"
        value={value}
        change={setValue}
      />
      <output aria-label="Validation">
        {JSON.stringify(
          invalidNumericFields({ data: { window_minutes: value } }),
        )}
      </output>
    </>
  );
}
it.each(["", "-", "3.5", "9007199254740992", "twelve"])(
  "keeps raw integer input %s and signals invalid data instead of retaining the last valid number",
  (value) => {
    render(<Harness />);
    const field = screen.getByLabelText("Checkout minutes");
    fireEvent.change(field, { target: { value } });
    expect(field).toHaveValue(value);
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(
      "Enter a whole number before continuing.",
    );
    expect(screen.getByLabelText("Validation")).toHaveTextContent(
      '"path":"window_minutes"',
    );
    fireEvent.change(field, { target: { value: "60" } });
    expect(field).toHaveValue("60");
    expect(field).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("Validation")).toHaveTextContent("[]");
  },
);
it("locates invalid values in nested arrays without touching valid numbers or recursing cycles", () => {
  const body: Record<string, unknown> = {
    configuration: { packages: [{ variants: [{ capacity: Infinity }] }] },
    valid: 0,
  };
  body.self = body;
  expect(invalidNumericFields(body)).toEqual([
    {
      path: "packages.0.variants.0.capacity",
      message: "Enter a whole number before continuing.",
    },
  ]);
  expect(
    invalidNumericFields({ count: -1, amount: 2.5, optional: null }),
  ).toEqual([]);
});

it("uses editor field names for shop and article definition envelopes", () => {
  expect(
    invalidNumericFields({
      definition: {
        variants: [{ min_quantity: NaN }],
        recipient: [{ max_length: NaN }],
        policy: { delivery_min_hours: NaN },
        blocks: [{ level: NaN }],
      },
    }).map((issue) => issue.path),
  ).toEqual([
    "variants.0.min_quantity",
    "recipient.0.max_length",
    "policy.delivery_min_hours",
    "blocks.0.level",
  ]);
});
