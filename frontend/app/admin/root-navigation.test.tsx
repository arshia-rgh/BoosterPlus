import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router";
import { expect, it } from "vitest";
import AdminApp, { ErrorBoundary } from "../../admin-app/root";

function Preview() {
  return (
    <MemoryRouter initialEntries={["/account/security"]}>
      <Routes>
        <Route element={<AdminApp />}>
          <Route
            path="/account/security"
            element={
              <main>
                <h1 tabIndex={-1}>Admin security</h1>
                <Link to="/account/sessions">Sessions</Link>
              </main>
            }
          />
          <Route
            path="/account/sessions"
            element={
              <main>
                <h1 tabIndex={-1}>Admin sessions</h1>
                <Link to="?section=history">Session history</Link>
                <Link to="/missing">Unavailable record</Link>
              </main>
            }
          />
          <Route
            path="/missing"
            element={
              <ErrorBoundary
                error={{
                  status: 404,
                  statusText: "Not found",
                  internal: false,
                  data: null,
                }}
              />
            }
          />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

it("announces a new admin destination without changing initial document focus", () => {
  render(<Preview />);
  expect(
    screen.getByRole("heading", { name: "Admin security" }),
  ).not.toHaveFocus();
  fireEvent.click(screen.getByRole("link", { name: "Sessions" }));
  expect(screen.getByRole("heading", { name: "Admin sessions" })).toHaveFocus();
});

it("leaves local section focus intact and focuses an unavailable destination", () => {
  render(<Preview />);
  fireEvent.click(screen.getByRole("link", { name: "Sessions" }));
  const section = screen.getByRole("link", { name: "Session history" });
  section.focus();
  fireEvent.click(section);
  expect(section).toHaveFocus();
  fireEvent.click(screen.getByRole("link", { name: "Unavailable record" }));
  expect(
    screen.getByRole("heading", { name: "This page isn’t available." }),
  ).toHaveFocus();
});
