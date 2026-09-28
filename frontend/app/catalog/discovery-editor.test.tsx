import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import DiscoveryEditor from "./discovery-editor";
import { emptyConfiguration, type Configuration } from "./model";
import { discoverySchema } from "./discovery-model";
function Editor() {
  const [config, setConfig] = useState<Configuration>(
    emptyConfiguration("Example"),
  );
  return (
    <>
      <DiscoveryEditor
        config={config}
        slug="example"
        change={(discovery) => {
          setConfig({ ...config, discovery });
        }}
      />
      <output aria-label="Saved discovery">
        {JSON.stringify(config.discovery)}
      </output>
    </>
  );
}
it("supports explicit editorial activation and records reviewed policies without fabricating counts", () => {
  render(<Editor />);
  expect(
    within(screen.getByLabelText("News availability")).queryByRole("option", {
      name: "Available",
    }),
  ).toBeInTheDocument();
  expect(
    within(screen.getByLabelText("Shop availability")).getByRole("option", {
      name: "Available",
    }),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Accounts availability"), {
    target: { value: "paused" },
  });
  fireEvent.change(screen.getByLabelText("Accounts unavailable reason"), {
    target: { value: "Reviewing inventory." },
  });
  fireEvent.click(
    screen.getByLabelText(
      "Allow source-based public statistics after publication",
    ),
  );
  fireEvent.change(screen.getByLabelText("Minimum eligible records"), {
    target: { value: "50" },
  });
  const read = () =>
    discoverySchema.parse(
      JSON.parse(
        screen.getByLabelText("Saved discovery").textContent,
      ) as unknown,
    );
  expect(
    read().capabilities.find((p) => p.service === "accounts")?.reason,
  ).toBe("Reviewing inventory.");
  expect(read().metrics?.minimum_sample).toBe(50);
  fireEvent.click(
    screen.getByLabelText(
      "Allow source-based public statistics after publication",
    ),
  );
  expect(read().metrics).toBeUndefined();
  fireEvent.click(
    screen.getByLabelText(
      "Allow source-based public statistics after publication",
    ),
  );
  expect(read().metrics?.minimum_sample).toBe(50);
});
it("keeps an offer private by default and preserves other edits when choosing a package", () => {
  render(<Editor />);
  fireEvent.click(screen.getByRole("button", { name: "Add featured offer" }));
  expect(
    screen.getByLabelText("Include this offer when the catalog is published"),
  ).not.toBeChecked();
  const created = discoverySchema.parse(
    JSON.parse(screen.getByLabelText("Saved discovery").textContent) as unknown,
  );
  expect(created.promotions?.[0]?.key).toMatch(/^[a-z][a-z0-9_]{0,47}$/);
  fireEvent.change(screen.getByLabelText("Offer title"), {
    target: { value: "Reviewed seasonal offer" },
  });
  fireEvent.change(screen.getByLabelText("Coupon code"), {
    target: { value: "SAVE50" },
  });
  fireEvent.change(screen.getByLabelText("Reviewed coupon version"), {
    target: { value: "3" },
  });
  fireEvent.change(screen.getByLabelText("Package"), { target: { value: "" } });
  expect(screen.getByLabelText("Offer title")).toHaveValue(
    "Reviewed seasonal offer",
  );
  fireEvent.click(screen.getByRole("button", { name: "Remove offer 1" }));
  expect(
    screen.getByText("No featured offers configured."),
  ).toBeInTheDocument();
});
