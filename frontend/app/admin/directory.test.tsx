import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, get, sessionSchema } from "../identity/api";
import { AuthorizedIdentity } from "../identity/frame";
import Directory from "./directory";
import Governance from "./governance";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());
function Back() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => {
        void navigate(-1);
      }}
    >
      History back
    </button>
  );
}
function mount(owner = true, audit = false) {
  const session = sessionSchema.parse({
    user: {
      id: "staff",
      email: "staff@example.test",
      display_name: "Staff",
      staff_alias: "Guide",
      role: owner ? "owner" : "administrator",
      suspended: false,
      mfa_enabled: true,
      notify_updates: true,
    },
    portal: "admin",
    csrf_token: "a".repeat(64),
    google_enabled: false,
    google_linked: false,
    mfa_required: false,
    capabilities: owner ? ["admin", "owner"] : ["admin"],
    terms_version: "test",
    terms_url: "/terms",
  });
  render(
    <MemoryRouter
      initialEntries={[
        audit
          ? "/admin?view=audit&action=old"
          : "/admin/customers?role=customer&state=active",
      ]}
    >
      <AuthorizedIdentity.Provider
        value={{ session, refresh: () => Promise.resolve() }}
      >
        <Back />
        {audit ? <Governance /> : <Directory />}
      </AuthorizedIdentity.Provider>
    </MemoryRouter>,
  );
}
it("keeps directory role filters across pagination and history and opens verification separately", async () => {
  vi.mocked(get).mockResolvedValue({ users: [], next: "next-page" });
  mount();
  await screen.findByText(/No matching identities/);
  expect(screen.getByLabelText("Role")).toHaveValue("customer");
  fireEvent.change(screen.getByLabelText("Role"), {
    target: { value: "booster" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Load users" }));
  await waitFor(() => {
    expect(get).toHaveBeenLastCalledWith(
      expect.stringContaining("role=booster"),
      expect.anything(),
      expect.any(String),
    );
  });
  fireEvent.click(screen.getByRole("link", { name: "Next users" }));
  await waitFor(() => {
    expect(get).toHaveBeenLastCalledWith(
      expect.stringMatching(/role=booster.*after=next-page/),
      expect.anything(),
      expect.any(String),
    );
  });
  fireEvent.click(screen.getByRole("button", { name: "History back" }));
  fireEvent.click(screen.getByRole("button", { name: "History back" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Role")).toHaveValue("customer");
  });
  expect(
    screen.getByRole("link", { name: /admin security in a new tab/ }),
  ).toHaveAttribute("target", "_blank");
  expect(
    screen.getByRole("link", { name: /admin security in a new tab/ }),
  ).toHaveAttribute("rel", "noopener noreferrer");
});
it("removes stale results after a failed directory read and keeps refresh available", async () => {
  vi.mocked(get).mockResolvedValue({ users: [], next: "" });
  mount();
  await screen.findByText(/No matching identities/);
  const error = new APIError("unavailable");
  error.status = 503;
  vi.mocked(get).mockRejectedValue(error);
  fireEvent.click(screen.getByRole("button", { name: "Refresh directory" }));
  await waitFor(() => {
    expect(
      screen.queryByText(/No matching identities/),
    ).not.toBeInTheDocument();
  });
  expect(
    screen.getByRole("button", { name: "Refresh directory" }),
  ).toBeInTheDocument();
});
it("keeps audit filters through history and opens verification separately", async () => {
  vi.mocked(get).mockImplementation((path) =>
    Promise.resolve(
      path.includes("recoveries")
        ? { recoveries: [] }
        : { audits: [], next: "" },
    ),
  );
  mount(true, true);
  await screen.findByText("No audit entries match these filters.");
  fireEvent.change(screen.getByLabelText("Exact audit action"), {
    target: { value: "catalog.publish" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Filter audit" }));
  await waitFor(() => {
    expect(get).toHaveBeenCalledWith(
      expect.stringContaining("action=catalog.publish"),
      expect.anything(),
      expect.any(String),
    );
  });
  fireEvent.click(screen.getByRole("button", { name: "History back" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Exact audit action")).toHaveValue("old");
  });
  expect(
    screen.getByRole("link", { name: /Verify admin identity in a new tab/ }),
  ).toHaveAttribute("target", "_blank");
});
it("does not fetch owner evidence for an administrator", () => {
  mount(false, true);
  expect(screen.getByText(/require an owner session/)).toBeInTheDocument();
  expect(get).not.toHaveBeenCalled();
});
