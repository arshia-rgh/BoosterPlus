import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { useContext, createElement } from "react";
import { expect, it, vi } from "vitest";
import Browse from "./browse";
import Workspace from "./workspace";
import { IdentityFrame } from "../identity/frame";
vi.mock("../experience/surface", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
function IdentityChild() {
  const Frame = useContext(IdentityFrame);
  return createElement(Frame, {
    session: null,
    title: "Sign in",
    children: <h1>Private route boundary</h1>,
  });
}
it("renders the public outlet", () => {
  render(
    <MemoryRouter>
      <Routes>
        <Route element={<Browse />}>
          <Route index element={<h1>Catalog</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByRole("heading", { name: "Catalog" })).toBeVisible();
});
it("provides the customer frame without replacing the identity boundary", () => {
  render(
    <MemoryRouter>
      <Routes>
        <Route element={<Workspace />}>
          <Route index element={<IdentityChild />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("region", { name: "Account introduction" }),
  ).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Private route boundary" }),
  ).toBeVisible();
});
