import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, post, userSchema } from "../identity/api";
import { PortalRoutingProvider } from "../portal-router";
import StaffInvitation from "./staff-invitation";
import { UserControls } from "./user-controls";

vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());
const origins = {
  customer: "https://playora.example",
  admin: "https://admin.playora.example",
  booster: "https://pro.playora.example",
};
function account(portal: "admin" | "booster" | "customer") {
  return userSchema.parse({
    id: `separate-${portal}-id`,
    portal,
    email: "same@example.test",
    display_name: "New staff",
    staff_alias: "",
    role: portal === "admin" ? "administrator" : portal,
    suspended: false,
    mfa_enabled: false,
    notify_updates: true,
  });
}
function open(portal: "admin" | "booster") {
  const refresh = vi.fn();
  render(
    <MemoryRouter initialEntries={["/customers"]}>
      <PortalRoutingProvider routing={{ portal: "admin", origins }}>
        <StaffInvitation refresh={refresh} />
      </PortalRoutingProvider>
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Staff email address"), {
    target: { value: "same@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Display name (optional)"), {
    target: { value: "New staff" },
  });
  fireEvent.change(screen.getByLabelText("Workspace"), {
    target: { value: portal },
  });
  fireEvent.click(screen.getByRole("checkbox"));
  const form = screen
    .getByRole("button", { name: "Create staff access" })
    .closest("form");
  if (!form) throw new Error("Staff access form missing");
  fireEvent.submit(form);
  return refresh;
}
it.each(["admin", "booster"] as const)(
  "creates separate %s access without sending an email",
  async (portal) => {
    vi.mocked(post).mockResolvedValue(account(portal));
    const refresh = open(portal);
    await screen.findByText(
      "Staff access created. No invitation email was sent.",
    );
    expect(post).toHaveBeenCalledExactlyOnceWith(
      "/admin/staff/invitations",
      {
        email: "same@example.test",
        portal,
        role: portal === "admin" ? "administrator" : "booster",
        display_name: "New staff",
      },
      userSchema,
    );
    expect(refresh).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("link", {
        name: `Open the ${portal} sign-in page in a new tab`,
      }),
    ).toHaveAttribute(
      "href",
      portal === "admin" ? "/login" : `${origins.booster}/login`,
    );
    expect(screen.getByText(/a dialog asks for/)).toBeVisible();
  },
);
it("rejects a response for another realm without showing successful access", async () => {
  vi.mocked(post).mockResolvedValue(account("customer"));
  const refresh = open("booster");
  await screen.findByRole("alert");
  expect(screen.getByRole("alert")).toHaveTextContent(
    "did not match this invitation",
  );
  expect(refresh).not.toHaveBeenCalled();
  expect(
    screen.queryByText("Staff access created. No invitation email was sent."),
  ).not.toBeInTheDocument();
});
it("keeps a failed sensitive action inside admin verification", async () => {
  vi.mocked(post).mockRejectedValue(
    Object.assign(
      new APIError("Verify your identity before this sensitive action."),
      { code: "recent_auth_required", status: 403 },
    ),
  );
  const refresh = open("admin");
  await screen.findByRole("alert");
  expect(refresh).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Verify to continue here" }),
  ).toBeVisible();
  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: "Create staff access" }),
    ).toBeEnabled();
  });
});
it.each(["customer", "booster"] as const)(
  "does not offer cross-realm role conversion for a %s identity",
  (portal) => {
    render(
      <MemoryRouter>
        <UserControls
          user={account(portal)}
          owner
          refresh={() => Promise.resolve()}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("New staff"));
    expect(
      screen.queryByRole("heading", { name: "Change role" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Role" }),
    ).not.toBeInTheDocument();
  },
);
it("limits owner role changes to admin identities", () => {
  render(
    <MemoryRouter>
      <UserControls
        user={account("admin")}
        owner
        refresh={() => Promise.resolve()}
      />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByText("New staff"));
  expect(screen.getByRole("combobox", { name: "Role" })).toHaveValue(
    "administrator",
  );
  expect(
    screen.getAllByRole("option").map((item) => item.getAttribute("value")),
  ).toEqual(["administrator", "owner"]);
});
