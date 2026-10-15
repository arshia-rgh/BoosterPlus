import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { get, APIError } from "../identity/api";
import CustomerActivity from "./activity";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
}));
const session = {
  portal: "customer" as const,
  user: { id: "a" },
  mfa_required: false,
  capabilities: ["account"],
};
const empty = {
  attention: [],
  active: [],
  upcoming: [],
  messages: [],
  progress: [],
  more_active: false,
  more_attention: false,
  more_upcoming: false,
  more_messages: false,
};
const order = {
  id: "owned-order",
  game_name: "Example game",
  kind: "custom",
  state: "in_progress",
  updated_at: "2026-09-27T00:00:00Z",
};
function desktop() {
  const measure = vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("matchMedia", measure);
  return measure;
}
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
it("keeps anonymous and staff portal pages free of customer activity requests", async () => {
  desktop();
  vi.mocked(get).mockResolvedValue({ ...session, user: null });
  const view = render(
    <MemoryRouter>
      <CustomerActivity />
    </MemoryRouter>,
  );
  await waitFor(() => {
    expect(get).toHaveBeenCalled();
  });
  expect(screen.queryByRole("button", { name: /Orders & support/ })).toBeNull();
  expect(
    vi.mocked(get).mock.calls.some(([path]) => path === "/me/overview"),
  ).toBe(false);
  view.unmount();
  vi.mocked(get).mockClear();
  render(
    <MemoryRouter initialEntries={["/booster"]}>
      <CustomerActivity />
    </MemoryRouter>,
  );
  expect(get).not.toHaveBeenCalled();
});
it("shows only owned server-reported progress and clears it when the customer session changes", async () => {
  desktop();
  let signed = true;
  vi.mocked(get).mockImplementation((path) =>
    Promise.resolve(
      path === "/auth/session"
        ? { ...session, user: signed ? session.user : null }
        : {
            ...empty,
            active: [order],
            progress: [
              {
                order_id: order.id,
                reported_percent: 42,
                updated_at: order.updated_at,
              },
            ],
          },
    ),
  );
  render(
    <MemoryRouter>
      <CustomerActivity />
    </MemoryRouter>,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: /Orders & support/ }),
  );
  expect(
    await screen.findByRole("link", { name: /View order owned-order/ }),
  ).toHaveAttribute("href", "/orders/owned-order");
  expect(screen.getByText("42% reported complete")).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Chat with support" }),
  ).toHaveAttribute("href", "/support");
  signed = false;
  await act(() =>
    window.dispatchEvent(
      new CustomEvent("boosterplus:session-changed", {
        detail: { portal: "customer" },
      }),
    ),
  );
  await waitFor(() =>
    expect(screen.queryByText("Example game")).not.toBeInTheDocument(),
  );
  expect(
    screen.queryByRole("button", { name: /Orders & support/ }),
  ).not.toBeInTheDocument();
});
it("keeps failed activity distinct from empty work and provides retry", async () => {
  const measure = desktop();
  let failed = true;
  vi.mocked(get).mockImplementation((path) =>
    path === "/auth/session"
      ? Promise.resolve(session)
      : failed
        ? Promise.reject(new APIError("Updates unavailable"))
        : Promise.resolve(empty),
  );
  render(
    <MemoryRouter>
      <CustomerActivity />
    </MemoryRouter>,
  );
  const trigger = await screen.findByRole("button", {
    name: /Orders & support/,
  });
  // The lazy panel initializes its responsive state in a mount effect. Wait for
  // that initialization before testing the separate failed-request retry flow.
  await waitFor(() => {
    expect(measure).toHaveBeenCalledWith("(max-width: 700px)");
  });
  fireEvent.click(trigger);
  await screen.findByText(/We could not load your current orders/);
  expect(screen.queryByText(/No active orders/)).not.toBeInTheDocument();
  failed = false;
  fireEvent.click(screen.getByRole("button", { name: "Refresh orders" }));
  expect(await screen.findByText(/No active orders/)).toBeVisible();
});

it("does not reopen an activity request after its API announces lost access", async () => {
  desktop();
  vi.mocked(get).mockImplementation((path) =>
    path === "/auth/session"
      ? Promise.resolve(session)
      : Promise.resolve().then(() => {
          window.dispatchEvent(
            new CustomEvent("boosterplus:session-changed", {
              detail: { portal: "customer" },
            }),
          );
          const error = new APIError("Access removed");
          error.status = 403;
          throw error;
        }),
  );
  render(
    <MemoryRouter>
      <CustomerActivity />
    </MemoryRouter>,
  );
  await waitFor(() => {
    expect(
      vi.mocked(get).mock.calls.some(([path]) => path === "/me/overview"),
    ).toBe(true);
  });
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: /Orders & support/ }),
    ).not.toBeInTheDocument(),
  );
  expect(
    vi.mocked(get).mock.calls.filter(([path]) => path === "/auth/session"),
  ).toHaveLength(1);
});

it("uses the protected workspace session without a second sign-in check", async () => {
  desktop();
  vi.mocked(get).mockResolvedValue(empty);
  render(
    <MemoryRouter initialEntries={["/account"]}>
      <CustomerActivity session={session} />
    </MemoryRouter>,
  );
  await screen.findByRole("button", { name: /Orders & support/ });
  expect(
    vi.mocked(get).mock.calls.some(([path]) => path === "/auth/session"),
  ).toBe(false);
});
it("respects a public-page session cooldown on focus", async () => {
  desktop();
  const error = new APIError("Wait before retrying");
  error.status = 429;
  error.retryAt = Date.now() + 60000;
  vi.mocked(get).mockRejectedValue(error);
  render(
    <MemoryRouter>
      <CustomerActivity />
    </MemoryRouter>,
  );
  await waitFor(() => {
    expect(get).toHaveBeenCalledTimes(1);
  });
  await act(async () => {
    await Promise.resolve();
    window.dispatchEvent(new Event("focus"));
  });
  expect(get).toHaveBeenCalledTimes(1);
  expect(
    screen.queryByRole("button", { name: /Orders & support/ }),
  ).not.toBeInTheDocument();
});
