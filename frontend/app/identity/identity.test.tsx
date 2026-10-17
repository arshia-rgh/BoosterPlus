import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import Identity, { Form, Text } from "./identity";
import {
  command,
  get,
  post,
  errorMessage,
  APIError,
  sessionSchema,
} from "./api";
const user = {
  portal: "customer",
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
  portal: "customer",
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
it("explains why an unenrolled customer has no recovery codes and links to setup", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        ...session,
        user,
        capabilities: ["account", "self"],
      }),
    ),
  );
  render(
    <MemoryRouter initialEntries={["/account/recovery"]}>
      <Identity title="Recovery codes" view="recovery" />
    </MemoryRouter>,
  );
  expect(
    await screen.findByText(/there are no recovery codes yet/),
  ).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Set up an authenticator" }),
  ).toHaveAttribute("href", "/account/security");
  expect(screen.queryByText(/A recovery code replaces/)).toBeNull();
  expect(screen.queryByText(/If fresh verification is needed/)).toBeNull();
});
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
    "/api/v1/auth/portals/customer/logout",
    expect.objectContaining({
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": session.csrf_token,
        "X-Playora-Portal": "customer",
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
  await waitFor(() => {
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  fireEvent(
    window,
    new CustomEvent("boosterplus:session-changed", {
      detail: { portal: "customer" },
    }),
  );
  await screen.findByRole("button", { name: "Save profile" });
  if (!older) throw new Error("Missing response resolver");
  older(new Response(JSON.stringify(session)));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Save profile" }),
    ).toBeInTheDocument(),
  );
});

it("keeps safe input and blocks repeated form submission during a server cooldown", async () => {
  vi.useFakeTimers();
  try {
    const limited = new APIError("Wait for the supplied retry time.");
    limited.status = 429;
    limited.retryAt = Date.now() + 2000;
    const submit = vi.fn().mockRejectedValue(limited);
    render(
      <MemoryRouter>
        <Form title="Send request" submit={submit}>
          <Text name="note" label="Safe note" />
        </Form>
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("Safe note").closest("form")).toHaveAttribute(
      "method",
      "post",
    );
    fireEvent.change(screen.getByLabelText("Safe note"), {
      target: { value: "Preserve this draft" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send request" }));
      await Promise.resolve();
    });
    expect(
      screen.getByRole("button", { name: "Wait before trying again" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Safe note")).toHaveValue(
      "Preserve this draft",
    );
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Wait before trying again" })
        .closest("form") ?? document.body,
    );
    expect(submit).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("button", { name: "Send request" })).toBeEnabled();
  } finally {
    vi.useRealTimers();
  }
});

it("respects cooldown on focus and allows only one explicit retry in flight", async () => {
  vi.useFakeTimers();
  try {
    let finish: ((response: Response) => void) | undefined;
    const retry = new Promise<Response>((resolve) => {
      finish = resolve;
    });
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: "rate_limited" }), {
          status: 429,
          headers: { "Retry-After": "2" },
        }),
      )
      .mockReturnValueOnce(retry);
    vi.stubGlobal("fetch", fetcher);
    await act(async () => {
      show();
      await Promise.resolve();
    });
    expect(
      screen.getByRole("heading", { name: "Please wait before trying again" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Retry connection" }),
    ).toBeDisabled();
    fireEvent(window, new Event("focus"));
    fireEvent(
      window,
      new CustomEvent("boosterplus:session-changed", {
        detail: { portal: "customer" },
      }),
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    fireEvent.click(screen.getByRole("button", { name: "Retry connection" }));
    expect(
      screen.getByRole("button", { name: "Checking connection…" }),
    ).toBeDisabled();
    fireEvent(window, new Event("focus"));
    expect(fetcher).toHaveBeenCalledTimes(2);
    await act(async () => {
      finish?.(new Response(JSON.stringify(session)));
      await Promise.resolve();
    });
    expect(
      screen.getByRole("button", { name: "Send verification code" }),
    ).toBeVisible();
  } finally {
    vi.useRealTimers();
  }
});

it("names rate limiting even without a valid Retry-After header", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: "rate_limited" }), {
        status: 429,
        headers: { "Retry-After": "invalid" },
      }),
    ),
  );
  show();
  await screen.findByRole("heading", {
    name: "Please wait before trying again",
  });
  expect(
    screen.getByRole("button", { name: "Retry connection" }),
  ).toBeEnabled();
});

it("links server validation to the matching field and preserves other inputs", async () => {
  const error = new APIError("Check these fields.");
  error.issues = [
    { path: "display_name", message: "Use at least three characters." },
  ];
  const submit = vi
    .fn()
    .mockRejectedValueOnce(error)
    .mockResolvedValueOnce(undefined);
  render(
    <MemoryRouter>
      <Form title="Profile" submit={submit}>
        <Text
          name="display_name"
          label="Display name"
          help="Your visible name"
        />
        <Text name="note" label="Note" />
      </Form>
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Display name"), {
    target: { value: "Al" },
  });
  fireEvent.change(screen.getByLabelText("Note"), {
    target: { value: "Retain this" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Profile" }));
  const link = await screen.findByRole("link", {
    name: "Display name: Use at least three characters.",
  });
  expect(screen.getByLabelText("Display name")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(screen.getByLabelText("Display name")).toHaveAccessibleDescription(
    "Your visible name Use at least three characters.",
  );
  await waitFor(() => {
    expect(screen.getByLabelText("Display name")).toHaveFocus();
  });
  fireEvent.click(link);
  expect(screen.getByLabelText("Display name")).toHaveFocus();
  fireEvent.change(screen.getByLabelText("Display name"), {
    target: { value: "Alice" },
  });
  expect(screen.getByLabelText("Display name")).not.toHaveAttribute(
    "aria-invalid",
  );
  expect(screen.getByLabelText("Note")).toHaveValue("Retain this");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.queryByText("Check these fields.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Profile" }));
  await screen.findByText("Request completed.");
});

it("explains a provider minimum failure without exposing provider details", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "payment_below_minimum",
          detail: "private upstream detail",
        }),
        { status: 400 },
      ),
    ),
  );
  await expect(get("/orders/synthetic/payment", sessionSchema)).rejects.toThrow(
    "No checkout was created",
  );
  await expect(
    get("/orders/synthetic/payment", sessionSchema),
  ).rejects.not.toThrow("private upstream detail");
});

it.each([Number.NaN, Infinity, -Infinity])(
  "rejects non-finite numeric input before any request or null serialization (%s)",
  async (invalid) => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const error = await post(
      "/admin/example",
      { configuration: { packages: [{ stock_limit: invalid }] } },
      sessionSchema,
    ).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(APIError);
    expect(error).toMatchObject({
      status: 400,
      issues: [
        {
          path: "packages.0.stock_limit",
          message: "Enter a whole number before continuing.",
        },
      ],
    });
    expect(fetcher).not.toHaveBeenCalled();
  },
);
