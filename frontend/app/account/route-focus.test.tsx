import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router";
import { expect, it } from "vitest";
import AccountRouteFocus from "./route-focus";
function Workspace({ ready }: { ready: boolean }) {
  return (
    <>
      <AccountRouteFocus />
      <main>{ready && <h1 tabIndex={-1}>My orders</h1>}</main>
    </>
  );
}
function App({ ready = true }: { ready?: boolean }) {
  return (
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Link to="/orders">Order history</Link>} />
        <Route path="/orders" element={<Workspace ready={ready} />} />
      </Routes>
    </MemoryRouter>
  );
}
it("focuses the heading when client navigation first mounts the workspace", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("link", { name: "Order history" }));
  expect(screen.getByRole("heading", { name: "My orders" })).toHaveFocus();
});
it("waits for a delayed destination heading", async () => {
  const view = render(<App ready={false} />);
  fireEvent.click(screen.getByRole("link", { name: "Order history" }));
  view.rerender(<App ready />);
  await waitFor(() => expect(screen.getByRole("heading")).toHaveFocus());
});
it("preserves normal focus on initial document entry", () => {
  render(
    <MemoryRouter initialEntries={["/orders"]}>
      <Workspace ready />
    </MemoryRouter>,
  );
  expect(screen.getByRole("heading")).not.toHaveFocus();
});
