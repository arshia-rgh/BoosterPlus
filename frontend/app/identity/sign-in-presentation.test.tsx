import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import Login from "../routes/login";

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

it.each(["customer", "admin", "booster"])(
  "keeps %s consent below email submission and required for both methods",
  async (portal) => {
    const fetcher = vi.fn((url: string) =>
      Promise.resolve(
        url.endsWith("/session")
          ? new Response(
              JSON.stringify({
                portal,
                user: null,
                csrf_token: "a".repeat(64),
                google_enabled: true,
                google_linked: false,
                mfa_required: false,
                capabilities: [],
                terms_version: "test",
                terms_url: "/terms",
              }),
            )
          : new Response(
              JSON.stringify({
                challenge_id: "synthetic",
                retry_after_seconds: 120,
                expires_in_seconds: 600,
              }),
            ),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    const path = portal === "customer" ? "/login" : `/${portal}/login`;
    window.history.replaceState({}, "", path);
    render(
      <MemoryRouter initialEntries={[path]}>
        <Login />
      </MemoryRouter>,
    );
    const send = await screen.findByRole("button", {
      name: "Send verification code",
    });
    const consent = screen.getByRole("checkbox", { name: /account terms/ });
    expect(send.compareDocumentPosition(consent)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.queryByText(/or use email/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no password/i)).not.toBeInTheDocument();
    if (portal === "customer") {
      expect(screen.getByText("Sign in or create your account")).toBeVisible();
    } else {
      expect(
        screen.getByText(
          `Use your invited ${portal} account. Email or Google verification is followed by your authenticator.`,
        ),
      ).toBeVisible();
    }
    fireEvent.change(
      screen.getByLabelText(
        portal === "customer" ? "Email address" : "Work email address",
      ),
      {
        target: { value: "synthetic@example.test" },
      },
    );
    const before = fetcher.mock.calls.length;
    for (const button of [
      screen.getByRole("button", { name: "Continue with Google" }),
      send,
    ]) {
      fireEvent.click(button);
      await waitFor(() => expect(consent).toHaveFocus());
      expect(consent).toHaveAccessibleDescription(
        "Accept the account terms to continue.",
      );
      expect(fetcher).toHaveBeenCalledTimes(before);
    }
    fireEvent.click(consent);
    fireEvent.click(send);
    await screen.findByLabelText("Email verification code");
    expect(
      fetcher.mock.calls.filter(([url]) => url.endsWith("/email/request")),
    ).toHaveLength(1);
  },
);
