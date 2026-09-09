import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import Identity from "./identity";
import { command, get, errorMessage, APIError, sessionSchema } from "./api";
const user = {
  id: "test-id",
  email: "person@example.test",
  display_name: "Person",
  role: "customer",
  staff_alias: "",
  suspended: false,
  mfa_enabled: false,
  notify_updates: true,
};
const session = {
  user: null,
  csrf_token: "a".repeat(64),
  google_enabled: false,
  google_linked: false,
  mfa_required: false,
  capabilities: [],
  terms_version: "test-v1",
  terms_url: "/terms",
};
afterEach(() => vi.unstubAllGlobals());
function show() {
  render(
    <MemoryRouter>
      <Identity title="Your account" />
    </MemoryRouter>,
  );
}
it("loads passwordless sign-in without credentials in storage", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(session)));
  vi.stubGlobal("fetch", fetcher);
  show();
  expect(screen.getByRole("status")).toHaveTextContent("Loading");
  await screen.findByRole("button", { name: "Send verification code" });
  expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  expect(localStorage.length).toBe(0);
});
it("shows a generic failure and allows retry", async () => {
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new Error("private database detail"))
    .mockResolvedValueOnce(new Response(JSON.stringify(session)));
  vi.stubGlobal("fetch", fetcher);
  show();
  await screen.findByRole("alert");
  expect(screen.queryByText(/private database/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry connection" }));
  await screen.findByRole("button", { name: "Send verification code" });
});
it("gates staff before second-factor verification", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ...session,
          user: { ...user, role: "owner" },
          mfa_required: true,
        }),
      ),
    ),
  );
  show();
  await screen.findByText(
    "Authenticator verification is required to finish signing in.",
  );
  expect(
    screen.queryByRole("button", { name: "Save profile" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Administration" }),
  ).not.toBeInTheDocument();
});
it("never renders admin data for a customer", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ ...session, user, capabilities: ["account"] }),
        ),
      ),
  );
  render(
    <MemoryRouter>
      <Identity title="Administration" capability="admin" />
    </MemoryRouter>,
  );
  await screen.findByText("You do not have access to this portal.");
  expect(
    screen.queryByRole("button", { name: "Load users" }),
  ).not.toBeInTheDocument();
});
it("gets a fresh CSRF token for every mutation and uses same-origin cookies", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(session)))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetcher);
  await command("/auth/logout");
  expect(fetcher).toHaveBeenNthCalledWith(
    2,
    "/api/v1/auth/logout",
    expect.objectContaining({
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": session.csrf_token,
      },
    }),
  );
});
it("validates server roles and redacts unknown errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ ...session, user: { ...user, role: "superuser" } }),
        ),
      ),
  );
  await expect(get("/auth/session", sessionSchema)).rejects.toThrow();
  expect(errorMessage(new Error("secret"))).not.toContain("secret");
  expect(errorMessage(new APIError("Safe public error"))).toBe(
    "Safe public error",
  );
});
it("renders mapped verification failures", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(session)))
    .mockResolvedValueOnce(new Response(JSON.stringify(session)))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ code: "rate_limited" }), { status: 429 }),
    );
  vi.stubGlobal("fetch", fetcher);
  show();
  await screen.findByRole("button", { name: "Send verification code" });
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "person@example.test" },
  });
  fireEvent.click(screen.getByRole("checkbox"));
  const form = screen
    .getByRole("button", { name: "Send verification code" })
    .closest("form");
  if (!form) throw new Error("Missing form");
  fireEvent.submit(form);
  await waitFor(() =>
    expect(screen.getByText(/Too many attempts/)).toBeInTheDocument(),
  );
});
it("ignores older session responses after a newer refresh", async () => {
  let older: ((response: Response) => void) | undefined;
  const delayed = new Promise<Response>((resolve) => {
    older = resolve;
  });
  const fetcher = vi
    .fn()
    .mockReturnValueOnce(delayed)
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ ...session, user, capabilities: ["account"] }),
      ),
    );
  vi.stubGlobal("fetch", fetcher);
  show();
  fireEvent(window, new Event("focus"));
  await screen.findByRole("button", { name: "Save profile" });
  if (!older) throw new Error("Missing response resolver");
  older(new Response(JSON.stringify(session)));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Save profile" }),
    ).toBeInTheDocument(),
  );
});
