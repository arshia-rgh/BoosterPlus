import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import Admin from "./admin";
vi.mock("../identity/identity", () => ({
  default: ({
    title,
    capability,
    children,
  }: {
    title: string;
    capability: string;
    children: ReactNode;
  }) => (
    <>
      <h1>
        {title} {capability}
      </h1>
      {children}
    </>
  ),
}));
vi.mock("../admin/administration", () => ({
  default: () => <p>Authorized administration</p>,
}));
it("mounts administration behind the admin identity boundary", () => {
  render(<Admin />);
  expect(
    screen.getByRole("heading", { name: "Administration admin" }),
  ).toBeInTheDocument();
});
