import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "../validation";
import { ActionVerificationDialog } from "./action-verification-dialog";
import { registerVerification } from "./action-verification";
import { post } from "./api";
import { notifySession, type Portal } from "./portal";

const settledActions: Promise<unknown>[] = [];
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
});
afterEach(async () => {
  // Unmount cancels any action left pending by an earlier assertion failure.
  cleanup();
  await Promise.all(settledActions.splice(0));
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete document.body.dataset.portal;
  window.history.replaceState({}, "", "/");
});
function fixture(portal: Portal = "admin", authenticator = true) {
  document.body.dataset.portal = portal;
  const identity = {
    portal,
    user: {
      id: "synthetic-user",
      portal,
      email: "test@example.invalid",
      display_name: "Fixture",
      role:
        portal === "admin"
          ? "owner"
          : portal === "booster"
            ? "booster"
            : "customer",
      staff_alias: "",
      suspended: false,
      mfa_enabled: authenticator,
      notify_updates: false,
    },
    csrf_token: "x".repeat(64),
    google_enabled: false,
    google_linked: false,
    mfa_required: false,
    capabilities: ["self"],
    terms_version: "test",
    terms_url: "/terms",
  };
  let verified = false,
    mutations = 0;
  const fetcher = vi.fn((url: string, options?: RequestInit) => {
    if (url.endsWith("/session"))
      return Promise.resolve(Response.json(identity));
    if (url.endsWith("/mfa/verify")) {
      if (typeof options?.body !== "string")
        throw new Error("Expected JSON fixture body");
      const value = JSON.parse(options.body) as { code: string };
      if (value.code !== "123456")
        return Promise.resolve(
          Response.json({ code: "invalid_request" }, { status: 400 }),
        );
      verified = true;
      return Promise.resolve(Response.json({ recovery_codes: [] }));
    }
    if (url.endsWith("/email/request"))
      return Promise.resolve(
        Response.json({
          challenge_id: "synthetic-challenge",
          retry_after_seconds: 60,
          expires_in_seconds: 600,
        }),
      );
    if (url.endsWith("/email/verify")) {
      verified = true;
      return Promise.resolve(Response.json({ purpose: "reauth" }));
    }
    if (url.endsWith("/protected-action")) {
      if (!verified)
        return Promise.resolve(
          Response.json({ code: "recent_auth_required" }, { status: 403 }),
        );
      mutations++;
      return Promise.resolve(Response.json({ saved: true }));
    }
    throw new Error("Unexpected fixture route");
  });
  vi.stubGlobal("fetch", fetcher);
  return { identity, fetcher, mutations: () => mutations };
}
function mount() {
  return render(
    <MemoryRouter>
      <ActionVerificationDialog />
    </MemoryRouter>,
  );
}
const schema = z.object({ saved: z.boolean() });
function action(body = { draft: "Keep this draft" }) {
  const pending = post("/protected-action", body, schema);
  // Observe teardown rejection immediately; tests still assert the original
  // promise, so a failed action cannot become a successful test result.
  settledActions.push(pending.catch(() => undefined));
  return pending;
}
function verify(code = "123456", label = "Six-digit authenticator code") {
  fireEvent.change(screen.getByLabelText(label), { target: { value: code } });
  fireEvent.click(screen.getByRole("button", { name: "Verify and continue" }));
}
it.each(["customer", "admin", "booster"] as const)(
  "resumes one %s action after authenticator verification without email",
  async (portal) => {
    const f = fixture(portal);
    mount();
    const pending = action();
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toHaveAttribute("open");
      expect(
        screen.getByLabelText("Six-digit authenticator code"),
      ).toHaveFocus();
    });
    verify();
    await expect(pending).resolves.toEqual({ saved: true });
    expect(f.mutations()).toBe(1);
    expect(f.fetcher.mock.calls.some(([url]) => url.includes("/email/"))).toBe(
      false,
    );
  },
);
it("uses email alone, focuses its field and enforces resend cooldown", async () => {
  const f = fixture("customer", false);
  mount();
  const pending = action();
  fireEvent.click(
    await screen.findByRole("button", { name: "Send email code" }),
  );
  await waitFor(() => {
    expect(screen.getByLabelText("Email verification code")).toHaveFocus();
  });
  expect(screen.getByRole("button", { name: /Resend code in/ })).toBeDisabled();
  verify("123456", "Email verification code");
  await expect(pending).resolves.toEqual({ saved: true });
  expect(f.mutations()).toBe(1);
  expect(
    f.fetcher.mock.calls.some(([url]) => url.includes("/mfa/verify")),
  ).toBe(false);
});
it("keeps invalid code feedback in the dialog and permits correction", async () => {
  const f = fixture();
  mount();
  const pending = action();
  await screen.findByLabelText("Six-digit authenticator code");
  verify("000000");
  await screen.findByRole("alert");
  await waitFor(() => {
    expect(screen.getByLabelText("Six-digit authenticator code")).toHaveFocus();
  });
  expect(f.mutations()).toBe(0);
  verify();
  await expect(pending).resolves.toEqual({ saved: true });
  expect(f.mutations()).toBe(1);
});
it.each(["cancel", "escape", "logout", "unmount"])(
  "never replays after %s",
  async (mode) => {
    const f = fixture();
    const view = mount();
    const pending = action();
    const rejected = expect(pending).rejects.toMatchObject({
      code: "verification_cancelled",
    });
    const dialog = await screen.findByRole("dialog");
    if (mode === "cancel")
      fireEvent.click(
        screen.getByRole("button", { name: "Cancel and keep editing" }),
      );
    if (mode === "escape")
      fireEvent(dialog, new Event("cancel", { cancelable: true }));
    if (mode === "logout")
      act(() => {
        notifySession("admin");
      });
    if (mode === "unmount") view.unmount();
    await rejected;
    expect(f.mutations()).toBe(0);
  },
);
it.each(["account", "realm", "route"])(
  "refuses replay after a %s change",
  async (kind) => {
    const f = fixture();
    mount();
    const pending = action();
    const rejected = expect(pending).rejects.toMatchObject({
      code: "verification_cancelled",
    });
    await screen.findByLabelText("Six-digit authenticator code");
    if (kind === "account") f.identity.user.id = "another-user";
    if (kind === "realm") document.body.dataset.portal = "customer";
    if (kind === "route")
      window.history.replaceState({}, "", "/another-record");
    if (kind === "route") {
      fireEvent.change(screen.getByLabelText("Six-digit authenticator code"), {
        target: { value: "123456" },
      });
      const submit = screen.queryByRole("button", {
        name: "Verify and continue",
      });
      if (submit) fireEvent.click(submit);
    } else verify();
    await rejected;
    expect(f.mutations()).toBe(0);
  },
);
it("does not queue another action behind an open dialog", async () => {
  const f = fixture();
  mount();
  const first = action();
  const rejected = expect(first).rejects.toMatchObject({
    code: "verification_cancelled",
  });
  await screen.findByRole("dialog");
  await expect(action()).rejects.toMatchObject({
    code: "verification_cancelled",
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Cancel and keep editing" }),
  );
  await rejected;
  expect(f.mutations()).toBe(0);
});
it.each(["network", "second-challenge"])(
  "never loops a %s failure",
  async (kind) => {
    const f = fixture();
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/session"))
          return Promise.resolve(Response.json(f.identity));
        calls++;
        return kind === "network"
          ? Promise.reject(new TypeError("Network interrupted"))
          : Promise.resolve(
              Response.json({ code: "recent_auth_required" }, { status: 403 }),
            );
      }),
    );
    const verification = vi.fn(() => Promise.resolve());
    const unregister = registerVerification(verification);
    try {
      await expect(action()).rejects.toBeDefined();
      expect(calls).toBe(kind === "network" ? 1 : 2);
      expect(verification).toHaveBeenCalledTimes(kind === "network" ? 0 : 1);
    } finally {
      unregister();
    }
  },
);
it("never substitutes action verification for unfinished staff sign-in MFA", async () => {
  const f = fixture();
  f.identity.mfa_required = true;
  const verification = vi.fn(() => Promise.resolve());
  const unregister = registerVerification(verification);
  try {
    await expect(action()).rejects.toMatchObject({
      code: "recent_auth_required",
    });
    expect(verification).not.toHaveBeenCalled();
    expect(f.mutations()).toBe(0);
  } finally {
    unregister();
  }
});
it("retains the original submitted body while waiting for verification", async () => {
  const f = fixture();
  mount();
  const draft = { draft: "Original" };
  const pending = action(draft);
  await screen.findByLabelText("Six-digit authenticator code");
  draft.draft = "Different";
  verify();
  await pending;
  const calls = f.fetcher.mock.calls.filter(([url]) =>
    url.endsWith("/protected-action"),
  );
  expect(calls).toHaveLength(2);
  expect(calls[1]?.[1]?.body).toBe(JSON.stringify({ draft: "Original" }));
});

it("validates incomplete codes inline without requesting verification", async () => {
  const f = fixture();
  mount();
  const pending = action();
  const rejected = expect(pending).rejects.toMatchObject({
    code: "verification_cancelled",
  });
  const input = await screen.findByLabelText("Six-digit authenticator code");
  verify("12");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Enter the six-digit code",
  );
  expect(input).toHaveFocus();
  expect(
    f.fetcher.mock.calls.some(([url]) => url.endsWith("/mfa/verify")),
  ).toBe(false);
  fireEvent.click(
    screen.getByRole("button", { name: "Cancel and keep editing" }),
  );
  await rejected;
});
it("respects server verification cooldown without confusing email resend", async () => {
  const f = fixture();
  const original = f.fetcher.getMockImplementation();
  if (!original) throw new Error("Fixture fetch implementation missing");
  f.fetcher.mockImplementation((url, options) =>
    url.endsWith("/mfa/verify")
      ? Promise.resolve(
          Response.json(
            { code: "rate_limited" },
            { status: 429, headers: { "Retry-After": "60" } },
          ),
        )
      : original(url, options),
  );
  mount();
  const pending = action();
  const rejected = expect(pending).rejects.toMatchObject({
    code: "verification_cancelled",
  });
  await screen.findByLabelText("Six-digit authenticator code");
  verify();
  expect(
    await screen.findByRole("button", { name: /Try again in/ }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Email code" }));
  expect(screen.getByRole("button", { name: "Send email code" })).toBeEnabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Cancel and keep editing" }),
  );
  await rejected;
  expect(f.mutations()).toBe(0);
});
