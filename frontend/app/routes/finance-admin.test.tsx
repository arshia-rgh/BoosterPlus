import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import Page, { meta } from "./finance-admin";
vi.mock("../identity/identity", () => ({
  default: ({
    capability,
    children,
  }: {
    capability: string;
    children: ReactNode;
  }) => <section aria-label={capability}>{children}</section>,
}));
vi.mock("../payments/finance", () => ({
  default: () => <p>Payment reconciliation</p>,
}));
it("requires administrator authority for payment finance", () => {
  expect(meta()[0]?.title).toContain("Booster Plus");
  render(<Page />);
  expect(screen.getByRole("region", { name: "admin" })).toHaveTextContent(
    "Payment reconciliation",
  );
});
