import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import ReviewPolicyEditor from "./review-policy-editor";
import { emptyConfiguration, type Configuration } from "./model";
function Editor() {
  const [config, setConfig] = useState<Configuration>(
    emptyConfiguration("Synthetic game"),
  );
  return (
    <>
      <ReviewPolicyEditor
        config={config}
        change={(review_policy) => {
          setConfig({ ...config, review_policy });
        }}
      />
      <output aria-label="Saved policy">
        {JSON.stringify(config.review_policy)}
      </output>
    </>
  );
}
it("lets staff declare and remove a publication policy without inventing live terms", () => {
  render(<Editor />);
  fireEvent.click(screen.getByLabelText("Accept verified-purchase reviews"));
  const policy = screen.getByLabelText("Review publication policy");
  expect(policy).toHaveValue("");
  fireEvent.change(policy, {
    target: { value: "Synthetic policy allows constructive low ratings." },
  });
  expect(screen.getByLabelText("Saved policy")).toHaveTextContent(
    "Synthetic policy allows constructive low ratings.",
  );
  fireEvent.click(screen.getByLabelText("Accept verified-purchase reviews"));
  expect(
    screen.queryByLabelText("Review publication policy"),
  ).not.toBeInTheDocument();
});
