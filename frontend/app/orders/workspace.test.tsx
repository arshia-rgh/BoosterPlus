import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import {
  withDeliveryHours,
  agreedDeliveryClock,
} from "../catalog/delivery-hours";
import { emptyConfiguration } from "../catalog/model";
import { APIError, get, post, type Session } from "../identity/api";
import { detailSchema, states, type Commercial, type Detail } from "./model";
import CustomerWorkspace from "./customer-workspace";
import { Decisions } from "./parts";
import { nextAction } from "./presentation";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
  post: vi.fn(),
}));
vi.mock("../fulfillment/panel", () => ({
  default: () => <p>Work progress and proof</p>,
}));
vi.mock("../payments/checkout", () => ({
  default: () => <p>Authoritative payment details</p>,
}));
vi.mock("../payments/cases", () => ({
  default: () => <p>Formal service cases</p>,
}));
vi.mock("../resale/delivery", () => ({
  default: () => <p>Protected account handoff</p>,
}));
vi.mock("../reviews/form", () => ({
  default: () => <p>Eligible purchase feedback</p>,
}));
vi.mock("../support/order-messages", () => ({
  default: () => (
    <label>
      Private order draft
      <textarea defaultValue="" />
    </label>
  ),
}));
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
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
function resources() {
  vi.mocked(get).mockImplementation((path) =>
    Promise.resolve(path.includes("/events") ? { events: [] } : { quotes: [] }),
  );
}
it("provides a next action for every lifecycle and keeps account delivery wording distinct", () => {
  for (const state of states)
    expect(nextAction({ state, kind: "custom" })).toBeTruthy();
  expect(nextAction({ state: "in_progress", kind: "account" })).toBe(
    "Review account delivery",
  );
});
it("keeps unquoted requests minimal and restores only local list filters", async () => {
  resources();
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/orders/owned-order",
          state: { orderListSearch: "state=submitted&search=Game" },
        },
      ]}
    >
      <CustomerWorkspace
        detail={detail()}
        session={session}
        refreshing={false}
        reload={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(screen.getByRole("link", { name: "← Order list" })).toHaveAttribute(
    "href",
    "/orders?state=submitted&search=Game",
  );
  expect(screen.queryByText("Accepted total")).not.toBeInTheDocument();
  expect(screen.queryByText("Formal service cases")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Messages" })).toBeVisible();
  await waitFor(() => {
    expect(get).toHaveBeenCalled();
  });
  expect(
    screen.getByRole("heading", { name: "Requested selections", hidden: true }),
  ).not.toBeVisible();
});
it("leads completed boosts with work and feedback while keeping cases and receipts secondary", async () => {
  resources();
  const value = {
    ...detail("completed"),
    contract: { id: "contract", payment_state: "settled", data: price },
  };
  render(
    <MemoryRouter>
      <CustomerWorkspace
        detail={value}
        session={session}
        refreshing={false}
        reload={vi.fn()}
      />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("link", { name: "Progress & sessions" }));
  expect(screen.getByText("Work progress and proof")).toBeVisible();
  expect(screen.getByText("Eligible purchase feedback")).toBeVisible();
  expect(screen.queryByText("Formal service cases")).not.toBeInTheDocument();
  expect(
    screen.queryByText("Authoritative payment details"),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Cancel unpaid order" }),
  ).not.toBeInTheDocument();
  await waitFor(() => {
    expect(get).toHaveBeenCalled();
  });
});
it("shows completed account handoff and preserves account-purchase feedback", async () => {
  resources();
  render(
    <MemoryRouter>
      <CustomerWorkspace
        detail={{
          ...detail("completed", "account"),
          contract: { id: "contract", payment_state: "settled", data: price },
        }}
        session={session}
        refreshing={false}
        reload={vi.fn()}
      />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("link", { name: "Delivery" }));
  expect(screen.getByText("Protected account handoff")).toBeVisible();
  expect(screen.getByText("Eligible purchase feedback")).toBeVisible();
  expect(screen.queryByText("Work progress and proof")).not.toBeInTheDocument();
  await waitFor(() => {
    expect(get).toHaveBeenCalled();
  });
});
it("blocks expired or changed-terms acceptance and binds valid decisions to the observed revision", async () => {
  const value = {
    ...detail("quoted"),
    quote: { id: "quote", state: "offered", data: price },
  };
  const done = vi.fn();
  const view = render(
    <MemoryRouter>
      <Decisions detail={value} admin={false} termsValid={false} done={done} />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByLabelText("I accept this quote and its terms"));
  expect(screen.getByRole("button", { name: "Accept quote" })).toBeDisabled();
  view.rerender(
    <MemoryRouter>
      <Decisions
        detail={{
          ...value,
          quote: {
            ...value.quote,
            data: { ...price, expires_at: "2000-01-01T00:00:00Z" },
          },
        }}
        admin={false}
        done={done}
      />
    </MemoryRouter>,
  );
  expect(screen.getByRole("button", { name: "Accept quote" })).toBeDisabled();
  expect(screen.getByText(/This quote has expired/)).toBeVisible();
  view.rerender(
    <MemoryRouter>
      <Decisions detail={value} admin={false} done={done} />
    </MemoryRouter>,
  );
  const failure = new APIError("The quote changed. Review it again.");
  vi.mocked(post).mockRejectedValue(failure);
  fireEvent.click(screen.getByRole("button", { name: "Accept quote" }));
  fireEvent.click(screen.getByRole("button", { name: "Accept quote" }));
  await screen.findByText(failure.message);
  expect(post).toHaveBeenCalledOnce();
  expect(post).toHaveBeenCalledWith(
    "/orders/owned-order/accept",
    expect.objectContaining({
      version: 2,
      quote_id: "quote",
      accept_terms: true,
      terms_version: "terms-v2",
    }),
    expect.anything(),
  );
  expect(done).not.toHaveBeenCalled();
});

it("compares the previous and offered scope, amount and timing without accepting automatically", async () => {
  const current = {
    ...detail("quoted"),
    quote: { id: "quote", state: "offered", data: price },
  };
  vi.mocked(get).mockImplementation((path) =>
    Promise.resolve(
      path.includes("/events")
        ? { events: [] }
        : {
            quotes: [
              current.quote,
              {
                id: "previous",
                state: "withdrawn",
                data: {
                  ...price,
                  quote_id: "previous",
                  revision: 1,
                  amount_minor: "2000",
                  scope: "Earlier scope",
                  delivery_max_hours: 36,
                },
              },
            ],
          },
    ),
  );
  render(
    <MemoryRouter>
      <CustomerWorkspace
        detail={current}
        session={session}
        refreshing={false}
        reload={vi.fn()}
      />
    </MemoryRouter>,
  );
  fireEvent.click(
    screen.getByText("What changed from the previous price?", { exact: true }),
  );
  const comparison = await screen.findByRole("table");
  expect(within(comparison).getByText("USD 20.00")).toBeVisible();
  expect(within(comparison).getByText("USD 22.00")).toBeVisible();
  expect(within(comparison).getByText("Earlier scope")).toBeVisible();
  expect(within(comparison).getByText("Reviewed scope")).toBeVisible();
  expect(post).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Accept quote" })).toBeDisabled();
});
it("explains saved custom requests without claiming payment or confusing package purchases", () => {
  resources();
  const view = render(
    <MemoryRouter>
      <CustomerWorkspace
        detail={detail()}
        session={session}
        refreshing={false}
        reload={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("region", { name: "Request confirmation" }),
  ).toHaveTextContent("Your request is with our team.");
  expect(
    screen.getByRole("region", { name: "Request confirmation" }),
  ).toHaveTextContent("No payment is due for this request.");
  view.rerender(
    <MemoryRouter>
      <CustomerWorkspace
        detail={detail("needs_information")}
        session={session}
        refreshing={false}
        reload={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("region", { name: "Request confirmation" }),
  ).toHaveTextContent("Our team needs more information.");
  view.rerender(
    <MemoryRouter>
      <CustomerWorkspace
        detail={detail("rejected")}
        session={session}
        refreshing={false}
        reload={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("region", { name: "Request confirmation" }),
  ).toHaveTextContent("Read the reason in Order activity.");
  view.rerender(
    <MemoryRouter>
      <CustomerWorkspace
        detail={detail("awaiting_payment", "package")}
        session={session}
        refreshing={false}
        reload={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(
    screen.queryByRole("region", { name: "Request confirmation" }),
  ).not.toBeInTheDocument();
});

it("retains order identity, list context and a local message draft through section changes", async () => {
  resources();
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/orders/owned-order",
          state: { orderListSearch: "state=quoted&search=Game" },
        },
      ]}
    >
      <CustomerWorkspace
        detail={detail()}
        session={session}
        refreshing={false}
        reload={vi.fn()}
      />
    </MemoryRouter>,
  );
  const heading = screen.getByRole("heading", { name: "Order owned-order" });
  fireEvent.click(screen.getByRole("link", { name: "Messages" }));
  fireEvent.change(screen.getByLabelText("Private order draft"), {
    target: { value: "Keep this local draft" },
  });
  fireEvent.click(screen.getByRole("link", { name: "Overview" }));
  expect(screen.getByLabelText("Private order draft")).not.toBeVisible();
  fireEvent.click(screen.getByRole("link", { name: "Messages" }));
  expect(screen.getByLabelText("Private order draft")).toHaveValue(
    "Keep this local draft",
  );
  expect(screen.getByRole("heading", { name: "Order owned-order" })).toBe(
    heading,
  );
  expect(screen.getByRole("link", { name: "← Order list" })).toHaveAttribute(
    "href",
    "/orders?state=quoted&search=Game",
  );
  expect(screen.getByRole("link", { name: "Payment" })).toHaveAttribute(
    "href",
    "/orders/owned-order?section=payment",
  );
  await waitFor(() => {
    expect(get).toHaveBeenCalled();
  });
});
it("keeps unpaid progress unavailable and reopens checkout from a fresh mount", async () => {
  resources();
  render(
    <MemoryRouter initialEntries={["/orders/owned-order?section=progress"]}>
      <CustomerWorkspace
        detail={{
          ...detail("awaiting_payment"),
          contract: { id: "c", payment_state: "unissued", data: price },
        }}
        session={session}
        refreshing={false}
        reload={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(
    screen.getByText(/Progress and scheduling become available/),
  ).toBeVisible();
  expect(screen.queryByText("Work progress and proof")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: "Payment" }));
  expect(screen.getByText("Authoritative payment details")).toBeVisible();
  fireEvent.click(screen.getByRole("link", { name: "Overview" }));
  expect(
    screen.queryByText("Authoritative payment details"),
  ).not.toBeInTheDocument();
  await waitFor(() => {
    expect(get).toHaveBeenCalled();
  });
});

it("distinguishes requested timing from the new agreed quote clock", async () => {
  const current = {
    ...detail("quoted"),
    quote: {
      id: "quote",
      state: "offered",
      data: { ...price, delivery_basis: "payment_and_access_v1" },
    },
  };
  const service = {
    key: "boost",
    name: "Boost",
    description: "",
    evaluator: "manual-review-v1",
    fields: [],
    rules: [],
  };
  current.offer.configuration.services = [
    { ...service, ...withDeliveryHours(service) },
  ];
  current.answers = { delivery_min_hours: "12", delivery_max_hours: "18" };
  vi.mocked(get).mockImplementation((path) =>
    Promise.resolve(
      path.includes("/events") ? { events: [] } : { quotes: [current.quote] },
    ),
  );
  render(
    <MemoryRouter>
      <CustomerWorkspace
        detail={current}
        session={session}
        refreshing={false}
        reload={vi.fn()}
      />
    </MemoryRouter>,
  );
  fireEvent.click(
    screen.getByText("What changed from the previous price?", { exact: true }),
  );
  const comparison = await screen.findByRole("table");
  expect(within(comparison).getByText("12–18 hours requested")).toBeVisible();
  expect(within(comparison).getByText(agreedDeliveryClock)).toBeVisible();
  expect(
    within(comparison).getByText(/Requested only; not yet an agreement/),
  ).toBeVisible();
  expect(post).not.toHaveBeenCalled();
});
