import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import ConfigurationImport, {
  readConfigurationImport,
} from "./configuration-import";
import { emptyConfiguration } from "./model";
import currentPrepared from "../../../docs/catalog/MLBB_PREFERENCES_2026-10-18.json";

const envelope = (configuration: unknown) => ({
  game_slug: "mobile-legends",
  base_revision: 243,
  configuration,
});
const config = { ...emptyConfiguration("Mobile Legends"), reviewed: true };

it("preserves the current MLBB surcharge stage and mapped account summary on import", () => {
  const imported = readConfigurationImport(JSON.stringify(currentPrepared));
  expect(imported.configuration.reviewed).toBe(false);
  expect(imported.configuration.services[0]?.pricing?.surcharges).toEqual(
    currentPrepared.configuration.services[0]?.pricing.surcharges,
  );
  expect(imported.configuration.intake?.summary).toEqual(
    currentPrepared.configuration.intake.summary,
  );
});

it("requires review and explicit application; never publishes or retains approval", () => {
  const change = vi.fn();
  render(
    <ConfigurationImport
      slug="mobile-legends"
      revision={243}
      current={config}
      dirty={false}
      change={change}
    />,
  );
  fireEvent.click(
    screen.getByText("Import or export a prepared configuration"),
  );
  fireEvent.change(screen.getByLabelText(/Catalog configuration/), {
    target: { value: JSON.stringify(envelope(config)) },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review import" }));
  expect(change).not.toHaveBeenCalled();
  expect(screen.getByText(/Replace the draft configuration for/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Use in unsaved draft" }));
  expect(change).toHaveBeenCalledOnce();
  expect(change).toHaveBeenCalledWith({ ...config, reviewed: false });
  expect(screen.getByRole("status")).toHaveTextContent("unsaved draft");
});

it("keeps the current draft on bad input and rejects unknown fields instead of silently dropping them", () => {
  for (const text of [
    "{",
    "null",
    JSON.stringify(envelope({ ...config, unforeseen: true })),
    JSON.stringify(
      envelope({
        ...config,
        references: [
          {
            key: "r",
            label: "Ranks",
            kind: "rank",
            options: [{ key: "a", label: "A", units: 25, unit_start: -1 }],
          },
        ],
      }),
    ),
  ])
    expect(() => readConfigurationImport(text)).toThrow();
  expect(() => readConfigurationImport("x".repeat(256 * 1024 + 1))).toThrow(
    /256 KB/,
  );
  expect(() =>
    readConfigurationImport(
      JSON.stringify(envelope({ ...config, description: "好".repeat(100000) })),
    ),
  ).toThrow(/256 KB/);
  const change = vi.fn();
  render(
    <ConfigurationImport
      slug="mobile-legends"
      revision={243}
      current={config}
      dirty={false}
      change={change}
    />,
  );
  fireEvent.click(
    screen.getByText("Import or export a prepared configuration"),
  );
  const input = screen.getByLabelText(/Catalog configuration/);
  fireEvent.change(input, {
    target: {
      value: JSON.stringify(envelope({ ...config, name: "Other game" })),
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review import" }));
  expect(screen.getByRole("alert")).toHaveTextContent("does not match");
  expect(input).toHaveFocus();
  expect(change).not.toHaveBeenCalled();
});

it("does not replace unsaved owner edits", () => {
  render(
    <ConfigurationImport
      slug="mobile-legends"
      revision={243}
      current={config}
      dirty={true}
      change={vi.fn()}
    />,
  );
  fireEvent.click(
    screen.getByText("Import or export a prepared configuration"),
  );
  fireEvent.change(screen.getByLabelText(/Catalog configuration/), {
    target: { value: JSON.stringify(envelope(config)) },
  });
  expect(screen.getByRole("button", { name: "Review import" })).toBeDisabled();
});

it("rejects a stale revision and invalidates reviewed imports if the saved draft changes", () => {
  const change = vi.fn();
  const props = {
    slug: "mobile-legends",
    revision: 244,
    current: config,
    dirty: false,
    change,
  };
  const { rerender } = render(<ConfigurationImport {...props} />);
  fireEvent.click(
    screen.getByText("Import or export a prepared configuration"),
  );
  fireEvent.change(screen.getByLabelText(/Catalog configuration/), {
    target: { value: JSON.stringify(envelope(config)) },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review import" }));
  expect(screen.getByRole("alert")).toHaveTextContent("outdated");
  expect(change).not.toHaveBeenCalled();
  rerender(<ConfigurationImport {...props} revision={243} />);
  fireEvent.click(screen.getByRole("button", { name: "Review import" }));
  expect(
    screen.getByRole("button", { name: "Use in unsaved draft" }),
  ).toBeEnabled();
  rerender(<ConfigurationImport {...props} />);
  expect(
    screen.getByRole("button", { name: "Use in unsaved draft" }),
  ).toBeDisabled();
  expect(change).not.toHaveBeenCalled();
});
