import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import Login from "../routes/login";
import type { Portal } from "./portal";

function submit(label: string) {
  const form = screen.getByRole("button", { name: label }).closest("form");
  if (!form) throw new Error("Missing email form");
  fireEvent.submit(form);
}

const timings = { retry_after_seconds: 75, expires_in_seconds: 180 };
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
  delete document.body.dataset.portal;
});
async function open(portal: Portal, next?: () => Promise<Response>) {
  let requests = 0;
  const bodies: unknown[] = [];
  const fetcher = vi.fn((path: string, options?: RequestInit) => {
    if (path.endsWith("/session"))
      return Promise.resolve(
        Response.json({
          portal,
          user: null,
          csrf_token: "x".repeat(64),
          google_enabled: false,
          google_linked: false,
          mfa_required: false,
          capabilities: [],
          terms_version: "test-v1",
          terms_url: "/terms",
        }),
      );
    if (path.endsWith("/email/request")) {
      requests++;
      if (typeof options?.body !== "string")
        throw new Error("Missing JSON request");
      bodies.push(JSON.parse(options.body));
      if (requests > 1 && next) return next();
      return Promise.resolve(
        Response.json(
          { challenge_id: `challenge-${String(requests)}`, ...timings },
          { status: 202 },
        ),
      );
    }
    throw new Error("Unexpected synthetic auth request");
  });
  vi.stubGlobal("fetch", fetcher);
  const path = portal === "customer" ? "/login" : `/${portal}/login`;
  window.history.replaceState({}, "", path);
  render(
    <MemoryRouter initialEntries={[path]}>
      <Login />
    </MemoryRouter>,
  );
  const input = await screen.findByLabelText(
    portal === "customer" ? "Email address" : "Work email address",
  );
  fireEvent.change(input, { target: { value: "same@example.test" } });
  fireEvent.click(screen.getByRole("checkbox"));
  vi.useFakeTimers();
  await act(async () => {
    submit("Send verification code");
    await vi.advanceTimersByTimeAsync(0);
  });
  return { bodies, fetcher, count: () => requests };
}

it.each(["customer", "admin", "booster"] as const)(
  "shows server timing and resends in the %s realm without signing in",
  async (portal) => {
    const fixture = await open(portal);
    expect(screen.getByLabelText("Email verification code")).toHaveFocus();
    expect(
      screen.getByRole("button", { name: "Resend code in 1:15" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Verify email code" }),
    ).toBeEnabled();
    expect(screen.getByText("Code expires in 3:00.")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Email verification code"), {
      target: { value: "123456" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(75000);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Resend code" }));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fixture.count()).toBe(2);
    expect(fixture.bodies[1]).toEqual(fixture.bodies[0]);
    expect(screen.getByLabelText("Email verification code")).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "Resend code in 1:15" }),
    ).toBeDisabled();
    expect(screen.getByText(/Another code was requested/)).toBeVisible();
    expect(
      fixture.fetcher.mock.calls
        .filter(([path]) => path.endsWith("/email/request"))
        .every(([path]) => path.includes(`/portals/${portal}/`)),
    ).toBe(true);
    expect(
      fixture.fetcher.mock.calls.some(([path]) =>
        path.endsWith("/email/verify"),
      ),
    ).toBe(false);
  },
);

it("uses the rate-limit response deadline for failed resends", async () => {
  const fixture = await open("admin", () =>
    Promise.resolve(
      Response.json(
        { code: "rate_limited" },
        { status: 429, headers: { "Retry-After": "120" } },
      ),
    ),
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(75000);
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Resend code" }));
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(
    screen.getByRole("button", { name: "Resend code in 2:00" }),
  ).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent("Too many attempts");
  fireEvent.click(screen.getByRole("button", { name: "Resend code in 2:00" }));
  expect(fixture.count()).toBe(2);
});

it("guards concurrent resends and handles a lost connection without inventing success", async () => {
  let reject: ((error: Error) => void) | undefined;
  const fixture = await open(
    "booster",
    () =>
      new Promise<Response>((_resolve, fail) => {
        reject = fail;
      }),
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(75000);
  });
  await act(async () => {
    const button = screen.getByRole("button", {
      name: "Resend code",
    });
    fireEvent.click(button);
    fireEvent.click(button);
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(fixture.count()).toBe(2);
  expect(
    screen.getByRole("button", { name: "Verify email code" }),
  ).toBeDisabled();
  await act(async () => {
    reject?.(new Error("private transport detail"));
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(screen.getByRole("alert")).toHaveTextContent(
    "The service is unavailable",
  );
  expect(
    screen.queryByText(/Another code was requested/),
  ).not.toBeInTheDocument();
  expect(screen.queryByText(/private transport/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Resend code" })).toBeEnabled();
});

it("expires the old challenge and allows a fresh request without submitting an expired code", async () => {
  const fixture = await open("customer");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(181000);
  });
  expect(
    screen.getByText("This code has expired. Request a new code below."),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Verify email code" }),
  ).toBeDisabled();
  submit("Verify email code");
  expect(
    fixture.fetcher.mock.calls.some(([path]) => path.endsWith("/email/verify")),
  ).toBe(false);
  expect(screen.getByRole("button", { name: "Resend code" })).toBeEnabled();
});

it("does not bypass the current cooldown by changing the email form", async () => {
  const fixture = await open("customer");
  fireEvent.click(screen.getByRole("button", { name: "Change email address" }));
  expect(
    screen.getByRole("button", { name: "Send verification code" }),
  ).toBeDisabled();
  expect(screen.getByText("Request another code in 1:15.")).toBeVisible();
  submit("Send verification code");
  expect(fixture.count()).toBe(1);
});

it("does not replace a working challenge when resend timing is missing", async () => {
  const fixture = await open("customer", () =>
    Promise.resolve(
      Response.json({ challenge_id: "incomplete" }, { status: 202 }),
    ),
  );
  fireEvent.change(screen.getByLabelText("Email verification code"), {
    target: { value: "123456" },
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(75000);
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Resend code" }));
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(fixture.count()).toBe(2);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "The service is unavailable",
  );
  expect(screen.getByLabelText("Email verification code")).toHaveValue(
    "123456",
  );
  expect(
    screen.queryByText(/Another code was requested/),
  ).not.toBeInTheDocument();
});
