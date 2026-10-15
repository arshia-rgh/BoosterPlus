import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import Login from "../routes/login";

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

function open(portal: "booster" | "admin", error = "") {
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) =>
      Promise.resolve(
        path.endsWith("/session")
          ? Response.json({
              portal,
              user: null,
              csrf_token: "a".repeat(64),
              google_enabled: true,
              google_linked: false,
              mfa_required: false,
              capabilities: [],
              terms_version: "test",
              terms_url: "/terms",
            })
          : Response.json({ code: "staff_access_required" }, { status: 403 }),
      ),
    ),
  );
  const path = `/${portal}/login${error ? `?error=${error}` : ""}`;
  window.history.replaceState({}, "", path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Login />
    </MemoryRouter>,
  );
}

it.each(["admin", "booster"] as const)(
  "%s entry explains missing staff access without claiming email delivery",
  async (portal) => {
    open(portal);
    const input = await screen.findByLabelText("Work email address");
    fireEvent.change(input, { target: { value: "uninvited@example.test" } });
    const button = screen.getByRole("button", {
      name: "Send verification code",
    });
    const form = button.closest("form");
    if (!form) throw new Error("Missing staff entry form");
    fireEvent.click(screen.getByRole("checkbox", { name: /account terms/ }));
    fireEvent.submit(form);
    const error = await screen.findByText(/No verification code was sent/);
    expect(error).toBeVisible();
    await waitFor(() => expect(error).toHaveFocus());
    expect(input).toHaveValue("uninvited@example.test");
    expect(button).toBeEnabled();
    expect(
      screen.queryByLabelText("Email verification code"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Resend code/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Check your inbox/)).not.toBeInTheDocument();
  },
);

it.each(["admin", "booster"] as const)(
  "%s Google eligibility feedback distinguishes missing staff access",
  async (portal) => {
    open(portal, "staff_access");
    await screen.findByLabelText("Work email address");
    expect(screen.getByRole("alert")).toHaveTextContent(
      /access is not available for this Google account/,
    );
    expect(
      screen.queryByText(/Google verification failed/),
    ).not.toBeInTheDocument();
  },
);
