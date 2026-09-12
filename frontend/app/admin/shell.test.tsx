import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import AdminShell from "./shell";
import { sessionSchema } from "../identity/api";

const base = {
  user: {
    id: "synthetic",
    email: "staff@example.test",
    display_name: "Test staff",
    staff_alias: "Guide",
    role: "administrator",
    suspended: false,
    mfa_enabled: true,
    notify_updates: true,
  },
  csrf_token: "a".repeat(64),
  google_enabled: false,
  google_linked: false,
  mfa_required: false,
  capabilities: ["admin"],
  terms_version: "test",
  terms_url: "/terms",
};
for (const [label, overrides] of [
  ["pending MFA", { mfa_required: true }],
  ["customer", { capabilities: ["account"] }],
] as const) {
  it(`conceals staff navigation for ${label}`, () => {
    render(
      <MemoryRouter>
        <AdminShell
          session={sessionSchema.parse({ ...base, ...overrides })}
          title="Administration"
        >
          <main>Sign in</main>
        </AdminShell>
      </MemoryRouter>,
    );
    expect(
      screen.queryByRole("navigation", { name: "Staff navigation" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Staff sign-in guide" }),
    ).toBeInTheDocument();
  });
}
it("shows authorized modules and highlights the order detail's parent", () => {
  render(
    <MemoryRouter initialEntries={["/admin/orders/synthetic"]}>
      <AdminShell session={sessionSchema.parse(base)} title="Manage order">
        <main>Order detail</main>
      </AdminShell>
    </MemoryRouter>,
  );
  expect(
    screen
      .getByRole("navigation", { name: "Staff navigation" })
      .querySelector('[href="/admin/orders"]'),
  ).toHaveAttribute("aria-current", "page");
  expect(screen.getByText("Guide")).toBeInTheDocument();
  expect(
    screen.getByRole("searchbox", { name: "Search orders" }),
  ).toBeInTheDocument();
});
