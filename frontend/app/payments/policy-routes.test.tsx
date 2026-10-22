import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import PolicyRoutes from "./policy-routes";
import { paymentRoutes, manualPayoutNetwork } from "./routes";
import type { Policy } from "./model";

function Form({ initial = [] }: { initial?: Policy["routes"] }) {
  const [routes, change] = useState(initial);
  return (
    <>
      <PolicyRoutes routes={routes} change={change} />
      <output aria-label="Saved route values">{JSON.stringify(routes)}</output>
    </>
  );
}
it("selects exact coin/network pairs from the reviewed list without free typing", () => {
  render(<Form />);
  expect(screen.getAllByRole("checkbox")).toHaveLength(
    paymentRoutes.filter((r) => manualPayoutNetwork(r.network)).length + 1,
  );
  expect(screen.queryByLabelText("Network identifier")).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("checkbox", { name: "USDC · BNB Smart Chain (BEP20)" }),
  );
  expect(screen.getByLabelText("Saved route values")).toHaveTextContent(
    '"code":"usdcbsc"',
  );
  expect(screen.getByLabelText("Saved route values")).toHaveTextContent(
    '"network":"bsc"',
  );
  fireEvent.click(screen.getByRole("checkbox", { name: "Selected only" }));
  expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  fireEvent.change(screen.getByLabelText("Find a coin or network"), {
    target: { value: "not-a-coin" },
  });
  expect(screen.getByText("No matching coin or network.")).toBeVisible();
  expect(screen.getByLabelText("Saved route values")).toHaveTextContent(
    "usdcbsc",
  );
});
it("preserves unsupported saved routes and preserves legacy entries until explicitly removed", () => {
  render(
    <Form
      initial={[
        ...paymentRoutes,
        { code: "legacy", network: "old", label: "Saved legacy route" },
      ]}
    />,
  );
  expect(
    screen.getByRole("region", { name: "Saved options needing review" }),
  ).toBeVisible();
  expect(screen.getByLabelText("Saved route values")).toHaveTextContent(
    "legacy",
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Remove Saved legacy route" }),
  );
  expect(screen.getByLabelText("Saved route values")).not.toHaveTextContent(
    "legacy",
  );
});

it("keeps a same-code legacy network separate until explicitly removed", () => {
  render(
    <Form initial={[{ code: "usdtbsc", network: "eth", label: "Old USDT" }]} />,
  );
  const canonical = screen.getByRole("checkbox", {
    name: "USDT · BNB Smart Chain (BEP20)",
  });
  expect(canonical).not.toBeChecked();
  expect(canonical).toBeDisabled();
  expect(canonical).toHaveAccessibleDescription(
    "Review the saved option below.",
  );
  // Native click respects a disabled control; dispatchEvent can toggle it in jsdom.
  canonical.click();
  expect(screen.getByLabelText("Saved route values")).toHaveTextContent(
    '"network":"eth"',
  );
  expect(screen.getByLabelText("Saved route values")).not.toHaveTextContent(
    '"network":"bsc"',
  );
  fireEvent.click(screen.getByRole("button", { name: "Remove Old USDT" }));
  expect(canonical).toBeEnabled();
  fireEvent.click(canonical);
  expect(canonical).toBeChecked();
  expect(screen.getByLabelText("Saved route values")).toHaveTextContent(
    '"network":"bsc"',
  );
  expect(screen.getByLabelText("Saved route values")).not.toHaveTextContent(
    '"network":"eth"',
  );
});
