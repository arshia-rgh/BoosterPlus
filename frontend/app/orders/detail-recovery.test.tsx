import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { emptyConfiguration } from "../catalog/model";
import { APIError, get, type Session, userSchema } from "../identity/api";
import { detailSchema, type Commercial, type Detail } from "./model";
import OrderDetail from "./detail";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
}));
vi.mock("./customer-workspace", () => ({
  default: ({
    reload,
    suspended,
  }: {
    reload: () => void;
    suspended: boolean;
  }) => (
    <div>
      <textarea aria-label="Unsent draft" disabled={suspended} />
      <button onClick={reload}>Refresh order fixture</button>
    </div>
  ),
}));
afterEach(() => vi.clearAllMocks());
const price: Commercial = {
  quote_id: "quote",
  revision: 2,
  currency: "USD",
  subtotal_minor: "2200",
  amount_minor: "2200",
  lines: [],
  scope: "Reviewed scope",
  reason: "Updated target",
  delivery_min_hours: 2,
  delivery_max_hours: 24,
  expires_at: "2099-01-01T00:00:00Z",
  terms_version: "terms-v2",
};
const session: Session = {
  portal: "customer",
  csrf_token: "x".repeat(48),
  user: null,
  google_enabled: false,
  google_linked: false,
  mfa_required: false,
  capabilities: ["account"],
  terms_version: "terms-v2",
  terms_url: "/terms",
};
function detail(
  state: Detail["order"]["state"] = "submitted",
  kind: Detail["order"]["kind"] = "custom",
) {
  return detailSchema.parse({
    order: {
      id: "owned-order",
      version: 2,
      kind,
      state,
      slug: "game",
      service: "boost",
      package: "",
      variant: "",
      game_name: "A very long game name",
      created_at: "2026-09-01T10:00:00Z",
      updated_at: "2026-09-13T10:00:00Z",
    },
    offer: {
      id: "release",
      game_id: "game",
      slug: "game",
      version: 1,
      paused: false,
      created_at: "2026-09-01T10:00:00Z",
      configuration: emptyConfiguration("Game"),
    },
    answers: {},
    coupon_code: "",
    estimate: {
      release_id: "release",
      version: 1,
      evaluator: "manual-review-v1",
      expires_at: price.expires_at,
      outcome: "manual_review",
      currency: "",
      amount_minor: "0",
      answers: {},
      lines: [],
      issues: [],
    },
  });
}

const signed = {
  ...session,
  user: userSchema.parse({
    id: "customer",
    email: "fixture@example.invalid",
    display_name: "Fixture",
    role: "customer",
    staff_alias: "",
    suspended: false,
    mfa_enabled: false,
    notify_updates: true,
  }),
};
function mount() {
  return render(
    <MemoryRouter initialEntries={["/orders/owned-order"]}>
      <Routes>
        <Route path="/orders/:id" element={<OrderDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}
it("retains hidden drafts through a transient order refresh, then discards them after confirmed access loss", async () => {
  let status = 200;
  vi.mocked(get).mockImplementation((path) => {
    if (path === "/auth/session") return Promise.resolve(signed);
    if (status !== 200) {
      const error = new APIError("Refresh unavailable");
      error.status = status;
      return Promise.reject(error);
    }
    return Promise.resolve(detail());
  });
  mount();
  fireEvent.change(await screen.findByLabelText("Unsent draft"), {
    target: { value: "Keep this unsent message" },
  });
  status = 503;
  fireEvent.click(
    screen.getByRole("button", { name: "Refresh order fixture" }),
  );
  await screen.findByRole("button", { name: "Retry order access" });
  expect(screen.getByLabelText("Unsent draft")).not.toBeVisible();
  expect(screen.getByLabelText("Unsent draft")).toBeDisabled();
  status = 200;
  fireEvent.click(screen.getByRole("button", { name: "Retry order access" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Unsent draft")).toBeVisible(),
  );
  expect(screen.getByLabelText("Unsent draft")).toHaveValue(
    "Keep this unsent message",
  );
  status = 403;
  fireEvent.click(
    screen.getByRole("button", { name: "Refresh order fixture" }),
  );
  await screen.findByRole("link", { name: "Customer sign-in" });
  expect(screen.queryByLabelText("Unsent draft")).not.toBeInTheDocument();
  expect(screen.queryByText("A very long game name")).not.toBeInTheDocument();
});
it.each(["anonymous", "factor", "capability"])(
  "fails closed after a successful session response revokes %s access",
  async (reason) => {
    let revoked = false;
    vi.mocked(get).mockImplementation((path) =>
      Promise.resolve(
        path === "/auth/session"
          ? revoked
            ? {
                ...signed,
                user: reason === "anonymous" ? null : signed.user,
                mfa_required: reason === "factor",
                capabilities: reason === "capability" ? [] : ["account"],
              }
            : signed
          : detail(),
      ),
    );
    mount();
    await screen.findByLabelText("Unsent draft");
    revoked = true;
    fireEvent.click(
      screen.getByRole("button", { name: "Refresh order fixture" }),
    );
    await screen.findByRole("link", { name: "Customer sign-in" });
    expect(screen.queryByLabelText("Unsent draft")).not.toBeInTheDocument();
    expect(screen.queryByText("A very long game name")).not.toBeInTheDocument();
  },
);

it("clears the record on an API session event without repeatedly refetching a denied order", async () => {
  let blocked = false;
  vi.mocked(get).mockImplementation((path) => {
    if (path === "/auth/session") return Promise.resolve(signed);
    if (blocked)
      return Promise.resolve().then(() => {
        window.dispatchEvent(
          new CustomEvent("boosterplus:session-changed", {
            detail: { portal: "customer" },
          }),
        );
        const error = new APIError("Access removed");
        error.status = 403;
        throw error;
      });
    return Promise.resolve(detail());
  });
  mount();
  await screen.findByLabelText("Unsent draft");
  blocked = true;
  fireEvent.click(
    screen.getByRole("button", { name: "Refresh order fixture" }),
  );
  await screen.findByRole("link", { name: "Customer sign-in" });
  expect(screen.queryByLabelText("Unsent draft")).not.toBeInTheDocument();
  expect(
    vi
      .mocked(get)
      .mock.calls.filter(([path]) => path === "/orders/owned-order"),
  ).toHaveLength(2);
});
