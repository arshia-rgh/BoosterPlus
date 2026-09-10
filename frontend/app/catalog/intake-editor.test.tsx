import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import IntakeEditor from "./intake-editor";
import { emptyConfiguration, type Configuration } from "./model";
function Editor() {
  const [config, setConfig] = useState<Configuration>(
    emptyConfiguration("Synthetic game"),
  );
  return (
    <>
      <IntakeEditor
        config={config}
        change={(intake) => {
          setConfig({ ...config, intake });
        }}
      />
      <output aria-label="Saved intake">{JSON.stringify(config.intake)}</output>
    </>
  );
}
it("lets administrators declare ordinary intake fields without credential or attachment stages", () => {
  render(<Editor />);
  fireEvent.click(screen.getByLabelText("Accept account submissions"));
  fireEvent.change(screen.getByLabelText("Intake form name"), {
    target: { value: "Account ownership review" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Add account attribute" }),
  );
  fireEvent.click(screen.getByText(/Account attribute:/));
  const stage = screen.getByLabelText("Collection stage"),
    type = screen.getByLabelText("Field type");
  expect(within(stage).getAllByRole("option")).toHaveLength(1);
  expect(stage).toHaveValue("order");
  expect(
    within(type).queryByRole("option", { name: /attachment/i }),
  ).not.toBeInTheDocument();
  expect(
    within(type).queryByRole("option", { name: /password/i }),
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Field key"), {
    target: { value: "region" },
  });
  fireEvent.change(screen.getByLabelText("Field label"), {
    target: { value: "Account region" },
  });
  expect(screen.getByLabelText("Saved intake")).toHaveTextContent(
    '"key":"region"',
  );
  expect(screen.getByLabelText("Saved intake")).toHaveTextContent(
    '"name":"Account ownership review"',
  );
  fireEvent.click(screen.getByLabelText("Accept account submissions"));
  expect(screen.queryByLabelText("Collection stage")).not.toBeInTheDocument();
});
