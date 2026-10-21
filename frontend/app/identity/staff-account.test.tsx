import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import PortalPage from "../routes/portal";
import { PortalRoutingProvider } from "../portal-router";
import { IdentityFrame } from "./frame";
import { sessionSchema } from "./api";
import AdminShell from "../admin/shell";
import CustomerShell from "../experience/customer-shell";

const origins = {
  customer: "https://playora.example",
  admin: "https://admin.playora.example",
  booster: "https://pro.playora.example",
};
function session(portal: "admin" | "booster") {
  return {
    portal,
    user: {
      id: `${portal}-identity`,
      portal,
      email: "same@example.test",
      email_verified: true,
      deleted: false,
      display_name: "Separate profile",
      role: portal === "admin" ? "owner" : "booster",
      staff_alias: "Staff",
      suspended: false,
      mfa_enabled: true,
      notify_updates: true,
    },
    csrf_token: "x".repeat(64),
    google_enabled: true,
    google_linked: false,
    mfa_required: false,
    capabilities:
      portal === "admin" ? ["admin", "owner", "self"] : ["booster", "self"],
    terms_version: "test",
    terms_url: "/terms",
  };
}
afterEach(() => {
  vi.unstubAllGlobals();
  delete document.body.dataset.portal;
  window.history.replaceState({}, "", "/");
});
function open(
  portal: "admin" | "booster",
  section: string,
  wrongSession = false,
) {
  const identity = session(portal);
  const fetcher = vi.fn((url: string, options?: RequestInit) => {
    if (url.endsWith("/session"))
      return Promise.resolve(Response.json(identity));
    if (url.endsWith("/me/sessions"))
      return Promise.resolve(
        Response.json({
          sessions: [
            {
              id: "session-id",
              portal: wrongSession ? "customer" : portal,
              current: true,
              created_at: "2026-10-08T00:00:00Z",
              last_seen_at: "2026-10-08T01:00:00Z",
              expires_at: "2026-10-09T00:00:00Z",
            },
          ],
        }),
      );
    if (url.endsWith("/me/profile")) {
      if (typeof options?.body !== "string")
        throw new Error("Missing JSON request");
      const body = JSON.parse(options.body) as {
        display_name: string;
      };
      identity.user.display_name = body.display_name;
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    if (url.endsWith("/mfa/recovery-codes"))
      return Promise.resolve(
        Response.json({
          recovery_codes: ["SYNTHETIC-RECOVERY-ONE", "SYNTHETIC-RECOVERY-TWO"],
        }),
      );
    throw new Error("Unexpected synthetic staff route");
  });
  vi.stubGlobal("fetch", fetcher);
  const path = `/account/${section}`;
  document.body.dataset.portal = portal;
  window.history.replaceState({}, "", path);
  render(
    <MemoryRouter initialEntries={[path]}>
      <PortalRoutingProvider routing={{ portal, origins }}>
        <IdentityFrame value={portal === "admin" ? AdminShell : CustomerShell}>
          <PortalPage />
        </IdentityFrame>
      </PortalRoutingProvider>
    </MemoryRouter>,
  );
  return fetcher;
}

it.each(["admin", "booster"] as const)(
  "retains the %s shell and same-host own-account navigation",
  async (portal) => {
    const fetcher = open(portal, "settings");
    await screen.findByRole("button", { name: "Save profile" });
    expect(
      screen.getByText(
        /profile, sign-in methods, authenticator and sessions belong to this workspace only/,
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("complementary", {
        name: portal === "admin" ? "Staff modules" : "Booster workspace",
      }),
    ).toBeVisible();
    for (const name of ["Security", "Sessions", "Recovery codes"]) {
      for (const link of screen.getAllByRole("link", { name }))
        expect(link.getAttribute("href")).toMatch(/^\/account\//);
    }
    expect(
      screen.queryByRole("link", { name: "My account" }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "This workspace only" },
    });
    const form = screen
      .getByRole("button", { name: "Save profile" })
      .closest("form");
    if (!form) throw new Error("Missing profile form");
    fireEvent.submit(form);
    await screen.findByText("Profile saved.");
    const mutation = fetcher.mock.calls.find(([path]) =>
      path.endsWith("/me/profile"),
    );
    expect(mutation?.[1]?.headers).toEqual(
      expect.objectContaining({ "X-Playora-Portal": portal }),
    );
  },
);

it.each(["admin", "booster"] as const)(
  "focuses the %s one-time replacement codes and returns focus after acknowledgment",
  async (portal) => {
    open(portal, "recovery");
    const button = await screen.findByRole("button", {
      name: "Replace recovery codes",
    });
    fireEvent.click(
      screen.getByLabelText("Replace my existing recovery codes"),
    );
    const form = button.closest("form");
    if (!form) throw new Error("Missing recovery form");
    fireEvent.submit(form);
    const heading = await screen.findByRole("heading", {
      name: "Save your recovery codes",
    });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByText("SYNTHETIC-RECOVERY-ONE")).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "I saved my recovery codes" }),
    );
    expect(heading).not.toBeInTheDocument();
    expect(
      screen.queryByText("SYNTHETIC-RECOVERY-ONE"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  },
);

it.each(["admin", "booster"] as const)(
  "keeps %s sessions and recovery management inside the staff shell",
  async (portal) => {
    open(portal, "sessions");
    await screen.findByRole("button", { name: "Sign out this device" });
    expect(
      screen.getByRole("heading", { level: 1, name: "Your sessions" }),
    ).toBeVisible();
    for (const link of screen.getAllByRole("link", {
      name: "Recovery codes",
    }))
      expect(link).toHaveAttribute("href", "/account/recovery");
    expect(
      screen.getByText(
        `These sessions belong only to your ${portal} account. Separate PLAYORA accounts have their own sessions.`,
      ),
    ).toBeVisible();
  },
);

it("does not show another realm’s session metadata", async () => {
  open("admin", "sessions", true);
  await screen.findByText(/Session information did not match this workspace/);
  expect(
    screen.queryByRole("button", { name: "Sign out this device" }),
  ).not.toBeInTheDocument();
});

it.each(["admin", "booster"] as const)(
  "rejects a customer identity disguised as a %s session",
  (portal) => {
    const forged = session(portal);
    expect(
      sessionSchema.safeParse({
        ...forged,
        user: { ...forged.user, portal: "customer" },
      }).success,
    ).toBe(false);
    const missing = { ...forged.user } as Record<string, unknown>;
    delete missing.portal;
    expect(sessionSchema.safeParse({ ...forged, user: missing }).success).toBe(
      false,
    );
  },
);

it.each(["admin", "booster"] as const)(
  "keeps %s recovery and sensitive verification in its own shell",
  async (portal) => {
    open(portal, "recovery");
    await screen.findByRole("button", { name: "Replace recovery codes" });
    expect(screen.getByText(/Each recovery code replaces one/)).toBeVisible();
    expect(
      screen.getByRole("complementary", {
        name: portal === "admin" ? "Staff modules" : "Booster workspace",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        /Email verification alone does not remove the second factor/,
      ),
    ).toBeInTheDocument();
  },
);
it.each(["admin", "booster"] as const)(
  "does not offer disabling MFA in %s security",
  async (portal) => {
    open(portal, "security");
    await screen.findByRole("heading", { name: "Authenticator security" });
    expect(
      screen.queryByRole("button", { name: "Verify authenticator" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Disable authenticator" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Manage recovery codes" }),
    ).toHaveAttribute("href", "/account/recovery");
    expect(
      screen.getByRole("complementary", {
        name: portal === "admin" ? "Staff modules" : "Booster workspace",
      }),
    ).toBeVisible();
  },
);
