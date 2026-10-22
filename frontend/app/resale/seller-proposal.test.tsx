import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import { useResource } from "../orders/resource";
import SellerOffers from "./offers";
import { routeKey, sellerRouteIssue, SellerRoute } from "./seller-route";
import {
  fixtureDefaults,
  fixturePolicy,
  fixtureSession,
  fixtureOtherRoute,
} from "../../tests/fixtures/seller-offer/data";

vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
afterEach(() => vi.clearAllMocks());

it("names payout networks even when saved labels are short and excludes unsupported recording networks", () => {
  const resource = {
    data: {
      published: {
        id: "policy",
        data: {
          routes: [
            { code: "usdtbsc", label: "USDT", network: "bsc" },
            { code: "usdttrc20", label: "USDT", network: "trx" },
            { code: "btc", label: "BTC", network: "btc" },
          ],
        },
      },
    },
    loading: false,
    error: null,
    reload: vi.fn(),
  };
  render(
    <SellerRoute
      resource={resource}
      terms={{ currency: "usdtbsc", network: "bsc" }}
      change={vi.fn()}
    />,
  );
  expect(
    screen.getByRole("option", { name: "USDT · BNB Smart Chain (BEP20)" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("option", { name: "USDT · TRON (TRC20)" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: /BTC/ })).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(
    "USDT · BNB Smart Chain (BEP20)",
  );
});

function setup() {
  const policy = {
    data: fixturePolicy,
    error: null as unknown,
    loading: false,
    reload: vi.fn(),
  };
  const responses = new Map<string, ReturnType<typeof useResource>>();
  vi.mocked(useResource).mockImplementation((path) => {
    if (path === "/admin/finance/policy") return policy;
    const old = responses.get(path);
    if (old) return old;
    const result = {
      data: path.endsWith("/offers")
        ? { offers: [] }
        : path === "/auth/session"
          ? fixtureSession
          : fixtureDefaults,
      error: null,
      loading: false,
      reload: vi.fn(),
    };
    responses.set(path, result);
    return result;
  });
  const component = (
    <MemoryRouter>
      <SellerOffers
        id="synthetic-submission"
        version={2}
        state="approved_pending_terms"
        admin
        view="agreement"
        changed={vi.fn()}
      />
    </MemoryRouter>
  );
  return { policy, ...render(component), component };
}
function fill() {
  fireEvent.click(
    screen.getByRole("button", { name: "Use approved consignment terms" }),
  );
  // Applying policy wording never silently selects a financial route.
  expect(screen.getByLabelText("Payout asset and network")).toHaveValue("");
  fireEvent.change(screen.getByLabelText("Payout asset and network"), {
    target: { value: routeKey({ currency: "usdtbsc", network: "bsc" }) },
  });
  for (const [label, value] of [
    ["Agreed account base price (USD)", "100"],
    ["Crypto units per USD", "1"],
    ["Conversion quote source", "Synthetic quote"],
    [
      "Conversion quote time",
      new Date(Date.now() - 60000).toISOString().slice(0, 16),
    ],
  ])
    fireEvent.change(screen.getByLabelText(label ?? ""), { target: { value } });
}
const submit = () =>
  fireEvent.click(
    screen.getByRole("button", { name: "Propose exact seller terms" }),
  );

it("shows and focuses repeated bare 422 failures next to submit without losing the draft", async () => {
  setup();
  fill();
  vi.mocked(post).mockImplementation(() =>
    Promise.reject(
      Object.assign(
        new APIError(
          "Review the highlighted account details before continuing.",
        ),
        { code: "resale_invalid", status: 422 },
      ),
    ),
  );
  for (let i = 1; i <= 2; i++) {
    submit();
    await waitFor(() => {
      expect(post).toHaveBeenCalledTimes(i);
    });
    await waitFor(() =>
      expect(screen.getByRole("alert").parentElement).toHaveFocus(),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The seller offer was not sent",
    );
    expect(
      screen.getByLabelText("Agreed account base price (USD)"),
    ).toHaveValue("100");
    expect(screen.getByLabelText("Seller proceeds basis")).toHaveValue(
      fixtureDefaults.seller_consignment.proceeds_basis,
    );
  }
  expect(vi.mocked(post).mock.calls[0]?.[1]).toEqual(
    vi.mocked(post).mock.calls[1]?.[1],
  );
});

it("focuses a server-rejected route and clears the conversion quote when selecting a new route", async () => {
  const view = setup();
  fill();
  vi.mocked(post).mockRejectedValue(
    Object.assign(
      new APIError("Review the highlighted account details before continuing."),
      {
        code: "resale_invalid",
        status: 422,
        issues: [
          {
            path: "terms.currency",
            message: "Refresh payout routes and select again.",
          },
        ],
      },
    ),
  );
  submit();
  const route = screen.getByLabelText("Payout asset and network");
  await waitFor(() => expect(route).toHaveFocus());
  expect(route).toHaveAttribute("aria-invalid", "true");
  view.policy.data = {
    ...fixturePolicy,
    published: { id: "new-policy", data: { routes: [fixtureOtherRoute] } },
  };
  view.rerender(
    <MemoryRouter>
      <SellerOffers
        id="synthetic-submission"
        version={2}
        state="approved_pending_terms"
        admin
        view="agreement"
        changed={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(
    screen.getByText(/selected route is no longer published/),
  ).toBeVisible();
  fireEvent.change(route, {
    target: { value: routeKey({ currency: "usdttrc20", network: "trx" }) },
  });
  expect(screen.getByLabelText("Agreed account base price (USD)")).toHaveValue(
    "100.00",
  );
  expect(screen.getByLabelText("Crypto units per USD")).toHaveValue("");
  expect(screen.getByLabelText("Conversion quote source")).toHaveValue("");
  expect(screen.getByLabelText("Conversion quote time")).toHaveValue("");
  submit();
  expect(post).toHaveBeenCalledOnce();
});

it("ignores unpublished draft routes and blocks unavailable policy data with a local retry", () => {
  const view = setup();
  fill();
  expect(
    screen.queryByRole("option", { name: fixtureOtherRoute.label }),
  ).not.toBeInTheDocument();
  view.policy.error = new Error("Synthetic unavailable policy");
  view.rerender(
    <MemoryRouter>
      <SellerOffers
        id="synthetic-submission"
        version={2}
        state="approved_pending_terms"
        admin
        view="agreement"
        changed={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("button", { name: "Propose exact seller terms" }),
  ).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Your entries are preserved",
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Refresh payout routes" }),
  );
  expect(view.policy.reload).toHaveBeenCalledOnce();
  expect(screen.getByLabelText("Agreed account base price (USD)")).toHaveValue(
    "100",
  );
  expect(post).not.toHaveBeenCalled();
});

it("requires a current published route independently of automatic-payment switches", () => {
  const resource = {
    data: fixturePolicy,
    error: null,
    loading: false,
    reload: vi.fn(),
  };
  const terms = { currency: "usdtbsc", network: "bsc" };
  expect(sellerRouteIssue(resource, terms)).toBeNull();
  expect(
    sellerRouteIssue(resource, { currency: "usdt", network: "bsc" }),
  ).toMatch(/Choose an available/);
  expect(sellerRouteIssue({ ...resource, loading: true }, terms)).toMatch(
    /Wait/,
  );
  expect(sellerRouteIssue({ ...resource, data: null }, terms)).toMatch(
    /could not be checked/,
  );
  expect(
    sellerRouteIssue({ ...resource, data: { published: null } }, terms),
  ).toMatch(/No payout route/);
});
