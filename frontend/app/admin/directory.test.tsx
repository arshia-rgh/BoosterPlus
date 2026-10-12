import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import {
  APIError,
  command,
  get,
  sessionSchema,
  userSchema,
} from "../identity/api";
import { AuthorizedIdentity } from "../identity/frame";
import Directory from "./directory";
import Governance from "./governance";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
  command: vi.fn(),
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
function mount(owner = true, audit = false, refresh = vi.fn(async () => {})) {
  const session = sessionSchema.parse({
    user: {
      id: "staff",
      portal: "admin",
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
      <AuthorizedIdentity.Provider value={{ session, refresh }}>
        <Back />
        {audit ? <Governance /> : <Directory />}
      </AuthorizedIdentity.Provider>
    </MemoryRouter>,
  );
}

const directoryUser = userSchema.parse({
  id: "target-admin",
  portal: "admin",
  email: "target@example.test",
  display_name: "Target Administrator",
  staff_alias: "Guide",
  role: "administrator",
  suspended: false,
  mfa_enabled: true,
  notify_updates: true,
  email_verified: true,
  deleted: false,
});

function submitUserAction(name: string) {
  const button = screen.getByRole("button", { name });
  const form = button.closest("form");
  if (!form) throw new Error("Missing action form");
  for (const checkbox of within(form).queryAllByRole("checkbox"))
    fireEvent.click(checkbox);
  button.focus();
  fireEvent.submit(form);
}

it.each([
  ["Change role", "Role updated and active sessions revoked."],
  ["Revoke all active sessions", "All active sessions revoked."],
  ["Suspend account", "Account suspended."],
])(
  "keeps completion context and focuses the refreshed identity after %s",
  async (action, message) => {
    const refresh = vi.fn(async () => {});
    let completeRead:
      | ((page: { users: (typeof directoryUser)[]; next: string }) => void)
      | undefined;
    vi.mocked(get).mockResolvedValueOnce({ users: [directoryUser], next: "" });
    vi.mocked(command).mockResolvedValue(undefined);
    mount(true, false, refresh);
    const name = await screen.findByText("Target Administrator", {
      selector: "strong",
    });
    const summary = name.closest("summary");
    if (!summary) throw new Error("Missing identity summary");
    fireEvent.click(summary);
    if (action === "Change role") {
      const details = summary.closest("details");
      if (!details) throw new Error("Missing identity card");
      fireEvent.change(
        within(details).getByRole("combobox", { name: "Role" }),
        { target: { value: "owner" } },
      );
    }
    vi.mocked(get).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeRead = resolve;
        }),
    );
    submitUserAction(action);
    await screen.findByText(`Target Administrator: ${message}`);
    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.getByText("Loading identities…")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Customers & staff" }),
    ).not.toHaveFocus();
    // The loading render precedes useResource's passive request effect.
    // Await the request itself before releasing its deliberately held response.
    await waitFor(() => {
      expect(completeRead).toBeTypeOf("function");
    });
    await act(async () => {
      if (!completeRead) throw new Error("Directory was not refreshed");
      completeRead({
        users: [
          {
            ...directoryUser,
            role: action === "Change role" ? "owner" : directoryUser.role,
            suspended: action === "Suspend account",
          },
        ],
        next: "",
      });
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(
        screen
          .getByText("Target Administrator", { selector: "strong" })
          .closest("summary"),
      ).toHaveFocus();
    });
    expect(
      screen.getByText(`Target Administrator: ${message}`),
    ).toHaveAttribute("role", "status");
    // Ordinary later refreshes never steal focus or repeat a completion transition.
    vi.mocked(get).mockResolvedValue({ users: [directoryUser], next: "" });
    const manualRefresh = screen.getByRole("button", {
      name: "Refresh directory",
    });
    manualRefresh.focus();
    fireEvent.click(manualRefresh);
    await waitFor(() =>
      expect(screen.queryByText("Loading identities…")).not.toBeInTheDocument(),
    );
    expect(manualRefresh).toHaveFocus();
  },
);

it.each(["absent", "unavailable"])(
  "returns completed directory action focus to the heading when the refreshed identity is %s",
  async (outcome) => {
    vi.mocked(get).mockResolvedValueOnce({ users: [directoryUser], next: "" });
    vi.mocked(command).mockResolvedValue(undefined);
    mount();
    const summary = (
      await screen.findByText("Target Administrator", { selector: "strong" })
    ).closest("summary");
    if (!summary) throw new Error("Missing identity summary");
    fireEvent.click(summary);
    if (outcome === "absent")
      vi.mocked(get).mockResolvedValueOnce({ users: [], next: "" });
    else vi.mocked(get).mockRejectedValueOnce(new APIError("unavailable"));
    submitUserAction("Revoke all active sessions");
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Customers & staff" }),
      ).toHaveFocus(),
    );
    expect(
      screen.getByText("Target Administrator: All active sessions revoked."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Target Administrator", { selector: "strong" }),
    ).not.toBeInTheDocument();
  },
);

it("keeps failed actions in their form without announcing completion or refreshing authority", async () => {
  const refresh = vi.fn(async () => {});
  vi.mocked(get).mockResolvedValue({ users: [directoryUser], next: "" });
  vi.mocked(command).mockRejectedValueOnce(new APIError("forbidden"));
  mount(true, false, refresh);
  const summary = (
    await screen.findByText("Target Administrator", { selector: "strong" })
  ).closest("summary");
  if (!summary) throw new Error("Missing identity summary");
  fireEvent.click(summary);
  submitUserAction("Revoke all active sessions");
  await screen.findByText("forbidden");
  expect(
    screen.queryByText("Target Administrator: All active sessions revoked."),
  ).not.toBeInTheDocument();
  expect(refresh).not.toHaveBeenCalled();
  expect(summary.closest("details")).toHaveAttribute("open");
});

it.each(["empty", "unavailable"])(
  "returns resolved recovery focus to its queue with persistent success when reload is %s",
  async (outcome) => {
    const recovery = {
      id: "recovery-one",
      user_id: "target-admin",
      new_email: "recovery@example.test",
      created_at: "2026-10-08T00:00:00Z",
    };
    let resolved = false;
    vi.mocked(get).mockImplementation((path) => {
      if (!path.includes("recoveries"))
        return Promise.resolve({ audits: [], next: "" });
      if (!resolved) return Promise.resolve({ recoveries: [recovery] });
      return outcome === "empty"
        ? Promise.resolve({ recoveries: [] })
        : Promise.reject(new APIError("unavailable"));
    });
    vi.mocked(command).mockImplementationOnce(() => {
      resolved = true;
      return Promise.resolve();
    });
    mount(true, true);
    await screen.findByText("Requested destination: recovery@example.test");
    fireEvent.change(
      screen.getByLabelText("Independent support case reference"),
      { target: { value: "case-fixture" } },
    );
    submitUserAction("Resolve recovery");
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Account recovery requests" }),
      ).toHaveFocus(),
    );
    expect(
      screen.getByText("Recovery for target-admin rejected."),
    ).toHaveAttribute("role", "status");
    expect(
      screen.queryByText("Requested destination: recovery@example.test"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Resolve recovery" }),
    ).not.toBeInTheDocument();
  },
);
it("keeps directory role filters across pagination and history and keeps verification in context", async () => {
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
    screen.getByText(/If this action needs fresh verification/),
  ).toBeVisible();
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
it("keeps audit filters through history and keeps verification in context", async () => {
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
    screen.getByText(/If this action needs fresh verification/),
  ).toBeVisible();
});
it("does not fetch owner evidence for an administrator", () => {
  mount(false, true);
  expect(screen.getByText(/require an owner session/)).toBeInTheDocument();
  expect(get).not.toHaveBeenCalled();
});

it("exposes staff provisioning only to owners and keeps the workspace filter separate from auth context", async () => {
  vi.mocked(get).mockResolvedValue({ users: [], next: "" });
  mount(false);
  await screen.findByText(/No matching identities/);
  expect(
    screen.queryByRole("button", { name: "Create staff access" }),
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Workspace"), {
    target: { value: "booster" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Load users" }));
  await waitFor(() => {
    expect(get).toHaveBeenLastCalledWith(
      expect.stringContaining("portal_filter=booster"),
      expect.anything(),
      expect.any(String),
    );
  });
});
