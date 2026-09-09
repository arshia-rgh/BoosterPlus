import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import Portal from "./portal";

for (const [path, title] of [
  ["/account", "Your account"],
  ["/admin", "Administration"],
  ["/booster", "Booster portal"],
] as const) {
  it(`renders the ${path} shell without private data or fake sign-in`, () => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <Portal />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(
      screen.getByText(/Secure sign-in is being prepared/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
}
