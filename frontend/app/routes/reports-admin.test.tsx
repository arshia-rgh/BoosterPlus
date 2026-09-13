import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";
import Page, { meta } from "./reports-admin";
vi.mock("../identity/identity", () => ({
  default: ({
    capability,
    children,
  }: {
    capability: string;
    children: ReactNode;
  }) => <section aria-label={capability}>{children}</section>,
}));
vi.mock("../reports/pages", () => ({
  default: () => <p>Operational reports</p>,
}));
it("protects report navigation with the administrator capability", () => {
  render(<Page />);
  expect(screen.getByRole("region", { name: "admin" })).toHaveTextContent(
    "Operational reports",
  );
  expect(meta()[0]?.title).toContain("PLAYORA");
});
