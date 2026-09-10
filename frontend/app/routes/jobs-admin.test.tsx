import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import Page, { meta } from "./jobs-admin";
vi.mock("../identity/identity", () => ({
  default: ({
    capability,
    children,
  }: {
    capability: string;
    children: ReactNode;
  }) => <section aria-label={capability}>{children}</section>,
}));
vi.mock("../operations/jobs", () => ({
  default: () => <p>Safe task inspection</p>,
}));
it("requires administrator authority for background task recovery", () => {
  expect(meta()[0]?.title).toContain("Booster Plus");
  render(<Page />);
  expect(screen.getByRole("region", { name: "admin" })).toHaveTextContent(
    "Safe task inspection",
  );
});
