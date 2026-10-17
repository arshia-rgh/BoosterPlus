import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Login from "../routes/login";

const originalShow = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  "showModal",
);
const originalClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  "close",
);
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    },
  });
});
afterEach(() => {
  for (const [name, descriptor] of [
    ["showModal", originalShow],
    ["close", originalClose],
  ] as const) {
    if (descriptor)
      Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

it.each(["customer", "admin", "booster"])(
  "keeps %s recovery validation, code flow and drafts inside a dismissible dialog",
  async (portal) => {
    const requests: { url: string; body: unknown }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        if (typeof init?.body === "string")
          requests.push({
            url,
            body: JSON.parse(init.body) as unknown,
          });
        return Promise.resolve(
          new Response(
            JSON.stringify(
              url.endsWith("/session")
                ? {
                    portal,
                    user: null,
                    csrf_token: "a".repeat(64),
                    google_enabled: true,
                    google_linked: false,
                    mfa_required: false,
                    capabilities: [],
                    terms_version: "test",
                    terms_url: "/terms",
                  }
                : {
                    challenge_id: "synthetic-recovery",
                    retry_after_seconds: 120,
                    expires_in_seconds: 600,
                  },
            ),
          ),
        );
      }),
    );
    const path = portal === "customer" ? "/login" : `/${portal}/login`;
    window.history.replaceState({}, "", path);
    render(
      <MemoryRouter initialEntries={[path]}>
        <Login />
      </MemoryRouter>,
    );
    const trigger = await screen.findByRole("button", {
      name: "Lost access to your email?",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger.closest("details")).toBeNull();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Recover your account" });
    const recovery = within(dialog);
    expect(
      recovery.getByText(
        portal === "customer"
          ? /If you set up an authenticator, it will still be required\./
          : /Your authenticator remains required\./,
      ),
    ).toBeVisible();
    expect(recovery.getByLabelText("Current account email")).toHaveFocus();
    const send = recovery.getByRole("button", {
      name: "Send recovery verification code",
    });
    fireEvent.click(send);
    await waitFor(() =>
      expect(recovery.getByLabelText("Current account email")).toHaveAttribute(
        "aria-invalid",
        "true",
      ),
    );
    expect(requests).toHaveLength(0);
    fireEvent.change(recovery.getByLabelText("Current account email"), {
      target: { value: "old@example.test" },
    });
    fireEvent.change(recovery.getByLabelText("New email address"), {
      target: { value: "new@example.test" },
    });
    fireEvent.click(
      recovery.getByRole("button", { name: "Close account recovery" }),
    );
    expect(trigger).toHaveFocus();
    expect(dialog).not.toHaveAttribute("open");
    fireEvent.click(trigger);
    expect(recovery.getByLabelText("New email address")).toHaveValue(
      "new@example.test",
    );
    fireEvent.click(send);
    const code = await recovery.findByLabelText("Email verification code");
    expect(code).toHaveFocus();
    expect(requests).toHaveLength(1);
    expect(requests[0]?.body).toMatchObject({
      purpose: "recovery",
      account_email: "old@example.test",
      email: "new@example.test",
    });
    expect(requests[0]?.url).toContain(`/auth/portals/${portal}/email/request`);
    fireEvent.click(
      recovery.getByRole("button", { name: "Close account recovery" }),
    );
    fireEvent.click(trigger);
    expect(recovery.getByLabelText("Email verification code")).toBeVisible();
    expect(requests).toHaveLength(1);
  },
);
