import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import Login from "../routes/login";

const anonymous = {
  portal: "admin",
  user: null,
  csrf_token: "a".repeat(64),
  google_enabled: true,
  google_linked: false,
  mfa_required: false,
  capabilities: [],
  terms_version: "test",
  terms_url: "/terms",
};
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});
function entry() {
  window.history.replaceState({}, "", "/admin/login");
  return render(
    <MemoryRouter initialEntries={["/admin/login"]}>
      <Login />
    </MemoryRouter>,
  );
}
function submit(label: string) {
  const form = screen.getByRole("button", { name: label }).closest("form");
  if (!form) throw new Error("Expected form");
  fireEvent.submit(form);
}
it("keeps role identity visible and blocks both methods during a server cooldown", async () => {
  const fetcher = vi.fn((url: string) =>
    Promise.resolve(
      url.endsWith("/session")
        ? new Response(JSON.stringify(anonymous))
        : new Response(JSON.stringify({ code: "rate_limited" }), {
            status: 429,
            headers: { "Retry-After": "60" },
          }),
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  entry();
  await screen.findByLabelText("Work email address");
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "Admin sign-in",
  );
  expect(
    screen.getByRole("link", { name: "Visit the PLAYORA website ↗" }),
  ).toHaveAttribute("href", "/");
  fireEvent.change(screen.getByLabelText("Work email address"), {
    target: { value: "staff@example.test" },
  });
  submit("Send verification code");
  await screen.findByText(/Too many attempts/);
  const buttons = screen.getAllByRole("button", {
    name: "Wait before trying again",
  });
  expect(buttons).toHaveLength(2);
  for (const button of buttons) expect(button).toBeDisabled();
  const count = fetcher.mock.calls.length;
  const googleWait = buttons[1];
  if (!googleWait) throw new Error("Expected Google cooldown control");
  fireEvent.click(googleWait);
  expect(fetcher).toHaveBeenCalledTimes(count);
  expect(
    screen.getByRole("link", { name: "Visit the PLAYORA website ↗" }),
  ).toBeEnabled();
});
it("moves focus from email verification into the staff authenticator step", async () => {
  let verified = false;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.endsWith("/session"))
        return Promise.resolve(
          new Response(
            JSON.stringify(
              verified
                ? {
                    ...anonymous,
                    user: {
                      id: "staff",
                      portal: "admin",
                      email: "staff@example.test",
                      display_name: "Staff",
                      role: "administrator",
                      staff_alias: "Staff",
                      suspended: false,
                      mfa_enabled: true,
                      notify_updates: true,
                    },
                    mfa_required: true,
                  }
                : anonymous,
            ),
          ),
        );
      if (url.endsWith("/email/request"))
        return Promise.resolve(
          new Response(
            JSON.stringify({
              challenge_id: "challenge",
              retry_after_seconds: 60,
              expires_in_seconds: 600,
            }),
          ),
        );
      if (url.endsWith("/email/verify")) {
        verified = true;
        return Promise.resolve(
          new Response(JSON.stringify({ purpose: "login" })),
        );
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    }),
  );
  entry();
  await screen.findByLabelText("Work email address");
  fireEvent.change(screen.getByLabelText("Work email address"), {
    target: { value: "staff@example.test" },
  });
  submit("Send verification code");
  const code = await screen.findByLabelText("Email verification code");
  await waitFor(() => expect(code).toHaveFocus());
  fireEvent.change(code, { target: { value: "123456" } });
  submit("Verify email code");
  const heading = await screen.findByRole("heading", {
    name: "Authenticator security",
  });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(screen.getByText("Can’t use your authenticator?")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Save profile" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Visit the PLAYORA website ↗" }),
  ).toBeInTheDocument();
});
it("blocks Google while email issuance is still in flight", async () => {
  let release: ((value: Response) => void) | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      url.endsWith("/session")
        ? Promise.resolve(new Response(JSON.stringify(anonymous)))
        : new Promise<Response>((resolve) => {
            release = resolve;
          }),
    ),
  );
  entry();
  await screen.findByLabelText("Work email address");
  submit("Send verification code");
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeDisabled(),
  );
  act(() => {
    release?.(
      new Response(
        JSON.stringify({
          challenge_id: "challenge",
          retry_after_seconds: 60,
          expires_in_seconds: 600,
        }),
      ),
    );
  });
  await screen.findByLabelText("Email verification code");
  expect(
    screen.getByRole("button", { name: "Continue with Google" }),
  ).toBeEnabled();
});

it("gives customer MFA recovery public help without a staff contact or inbox loop", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            ...anonymous,
            portal: "customer",
            user: {
              id: "customer",
              portal: "customer",
              email: "buyer@example.test",
              display_name: "Buyer",
              role: "customer",
              staff_alias: "",
              suspended: false,
              mfa_enabled: true,
              notify_updates: true,
            },
            mfa_required: true,
          }),
        ),
      ),
    ),
  );
  window.history.replaceState({}, "", "/login");
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Login />
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { name: "Authenticator security" });
  expect(screen.getByText("2 · Verify authenticator")).toHaveAttribute(
    "aria-current",
    "step",
  );
  expect(screen.queryByText(/Staff must verify/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("Can’t use your authenticator?"));
  expect(
    screen.getByRole("link", { name: "public account terms" }),
  ).toHaveAttribute("href", "/terms");
  expect(
    screen.queryByText(/established staff contact/),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: /Support inbox/ }),
  ).not.toBeInTheDocument();
});
