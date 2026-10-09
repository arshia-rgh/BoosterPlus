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
import type { Portal } from "./portal";
import { authenticatorIssuer } from "./mfa-enrollment";

const secret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const email = "staff@example.test";

const qrName = "Authenticator setup QR code for your PLAYORA account";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});

function start(portal: Portal, alreadyEnrolled = false) {
  const issuer = authenticatorIssuer(portal);
  const url = `otpauth://totp/${encodeURIComponent(issuer)}:${email}?algorithm=SHA1&digits=6&issuer=${encodeURIComponent(issuer)}&period=30&secret=${secret}`;
  let verified = false;
  let verificationFails = false;
  const user = {
    id: "synthetic-user",
    portal,
    email,
    display_name: "Synthetic user",
    role:
      portal === "customer"
        ? "customer"
        : portal === "admin"
          ? "owner"
          : "booster",
    staff_alias: "Support",
    suspended: false,
    mfa_enabled: alreadyEnrolled,
    notify_updates: true,
  };
  const session = () => ({
    user: { ...user, mfa_enabled: alreadyEnrolled || verified },
    portal,
    csrf_token: "a".repeat(64),
    google_enabled: true,
    google_linked: true,
    mfa_required: !verified,
    capabilities: [portal === "customer" ? "account" : portal],
    terms_version: "test",
    terms_url: "/terms",
  });
  const fetcher = vi.fn((path: string) => {
    if (path.endsWith("/session"))
      return Promise.resolve(new Response(JSON.stringify(session())));
    if (path.endsWith("/mfa/enroll"))
      return Promise.resolve(new Response(JSON.stringify({ secret, url })));
    if (path.endsWith("/mfa/verify")) {
      if (verificationFails)
        return Promise.resolve(
          new Response(JSON.stringify({ code: "invalid_request" }), {
            status: 400,
          }),
        );
      verified = true;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            recovery_codes: Array.from(
              { length: 10 },
              (_, index) => `${"A".repeat(25)}${String(index)}`,
            ),
          }),
        ),
      );
    }
    return Promise.reject(new Error("Unexpected synthetic route"));
  });
  vi.stubGlobal("fetch", fetcher);
  const path = portal === "customer" ? "/login" : `/${portal}/login`;
  window.history.replaceState({}, "", path);
  const rendered = render(
    <MemoryRouter initialEntries={[path]}>
      <Login />
    </MemoryRouter>,
  );
  return {
    ...rendered,
    fetcher,
    failVerification: () => {
      verificationFails = true;
    },
    allowVerification: () => {
      verificationFails = false;
    },
  };
}

function submit(title: string) {
  const form = screen.getByRole("button", { name: title }).closest("form");
  if (!form) throw new Error("Missing fixture form");
  fireEvent.submit(form);
}

it.each(["customer", "admin", "booster"] as const)(
  "keeps %s enrollment on its portal and requires server verification before recovery codes",
  async (portal) => {
    const fixture = start(portal);
    await screen.findByRole("button", { name: "Set up authenticator" });
    submit("Set up authenticator");
    await screen.findByRole("img", { name: qrName });
    expect(fixture.container.innerHTML).not.toContain(secret);
    expect(
      screen.queryByRole("heading", { name: "Save your recovery codes" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("Six-digit authenticator code"),
    ).toHaveAttribute("inputmode", "numeric");
    fixture.failVerification();
    fireEvent.change(screen.getByLabelText("Six-digit authenticator code"), {
      target: { value: "000000" },
    });
    submit("Verify authenticator");
    await waitFor(() => {
      expect(fixture.fetcher).toHaveBeenCalledWith(
        `/api/v1/auth/portals/${portal}/mfa/verify`,
        expect.anything(),
      );
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Verify authenticator",
        }),
      ).not.toBeDisabled(),
    );
    expect(screen.getByRole("img", { name: qrName })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Save your recovery codes" }),
    ).not.toBeInTheDocument();
    fixture.allowVerification();
    submit("Verify authenticator");
    expect(
      await screen.findByRole("heading", { name: "Save your recovery codes" }),
    ).toHaveFocus();
    expect(screen.queryByRole("img", { name: qrName })).not.toBeInTheDocument();
    expect(fixture.container.innerHTML).not.toContain(secret);
  },
);

it("clears the QR on expiry and requires a fresh enrollment", async () => {
  start("admin");
  await screen.findByRole("button", { name: "Set up authenticator" });
  vi.useFakeTimers();
  await act(async () => {
    submit("Set up authenticator");
    await Promise.resolve();
  });
  expect(screen.getByRole("img", { name: qrName })).toBeVisible();
  act(() => {
    vi.advanceTimersByTime(10 * 60 * 1000);
  });
  expect(screen.queryByRole("img", { name: qrName })).not.toBeInTheDocument();
  expect(
    screen.getByText(
      "Your setup code expired. Start setup again to get a new QR code.",
    ),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Set up authenticator" }),
  ).toBeVisible();
});

it("clears the QR before leaving the page and never regenerates a key automatically", async () => {
  const fixture = start("booster");
  await screen.findByRole("button", { name: "Set up authenticator" });
  submit("Set up authenticator");
  await screen.findByRole("img", { name: qrName });
  const requests = fixture.fetcher.mock.calls.length;
  fireEvent(window, new Event("pagehide"));
  expect(screen.queryByRole("img", { name: qrName })).not.toBeInTheDocument();
  expect(fixture.fetcher).toHaveBeenCalledTimes(requests);
});

it("does not expose setup again for an already enrolled authenticator", async () => {
  const fixture = start("admin", true);
  await screen.findByLabelText("Authenticator or recovery code");
  expect(screen.queryByRole("img", { name: qrName })).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Set up authenticator" }),
  ).not.toBeInTheDocument();
  expect(
    fixture.fetcher.mock.calls.every(([path]) => path.endsWith("/session")),
  ).toBe(true);
});
