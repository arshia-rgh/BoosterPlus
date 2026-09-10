import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import DeliveryEditor from "./delivery-editor";
import { serviceSchema } from "./model";
function Harness() {
  const [service, setService] = useState(
    serviceSchema.parse({
      key: "boost",
      name: "Boost",
      description: "",
      evaluator: "manual-review-v1",
      fields: [],
      rules: [],
      fulfillment: {
        mode: "account",
        field: "",
        account_value: "",
        together_value: "",
        secret_hours: 24,
        share_fields: [],
      },
    }),
  );
  return (
    <>
      <DeliveryEditor
        service={service}
        change={(patch) => {
          setService({ ...service, ...patch });
        }}
      />
      <output aria-label="Declared delivery policy">
        {JSON.stringify(service.delivery)}
      </output>
    </>
  );
}
it("requires declared durations and supports removing closures and rules", () => {
  render(<Harness />);
  fireEvent.click(screen.getByLabelText("Configure delivery forecasts"));
  fireEvent.change(screen.getByLabelText("Operating time zone"), {
    target: { value: "Asia/Tehran" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add operating window" }));
  fireEvent.change(screen.getByLabelText("Opens (HH:mm)"), {
    target: { value: "09:00" },
  });
  fireEvent.change(screen.getByLabelText("Closes (HH:mm; 24:00 allowed)"), {
    target: { value: "17:00" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add closure date" }));
  fireEvent.change(screen.getByLabelText("Closure date 1"), {
    target: { value: "2026-10-01" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Remove closure date" }));
  fireEvent.click(screen.getByRole("button", { name: "Add delivery rule" }));
  expect(screen.getByLabelText("Minimum work minutes")).toHaveValue(0);
  fireEvent.change(screen.getByLabelText("Minimum work minutes"), {
    target: { value: "60" },
  });
  fireEvent.change(screen.getByLabelText("Maximum work minutes"), {
    target: { value: "120" },
  });
  expect(screen.getByLabelText("Declared delivery policy")).toHaveTextContent(
    '"min_minutes":60',
  );
  expect(screen.getByLabelText("Declared delivery policy")).toHaveTextContent(
    '"closures":[]',
  );
  fireEvent.click(screen.getByRole("button", { name: "Remove" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Remove operating window" }),
  );
  expect(screen.getByLabelText("Declared delivery policy")).toHaveTextContent(
    '"windows":[]',
  );
  fireEvent.click(screen.getByLabelText("Configure delivery forecasts"));
  expect(
    screen.getByLabelText("Declared delivery policy"),
  ).toBeEmptyDOMElement();
});
