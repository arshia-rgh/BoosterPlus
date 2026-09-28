import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, get } from "../identity/api";
import { emptyConfiguration } from "../catalog/model";
import { detailSchema, type Detail } from "./model";
import AdminOrderWorkspace from "./admin-workspace";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
}));
vi.mock("./quote-editor", () => ({
  default: () => (
    <label>
      Quote draft
      <textarea />
    </label>
  ),
}));
vi.mock("../support/order-messages", () => ({
  default: () => (
    <label>
      Admin message draft
      <textarea />
    </label>
  ),
}));
vi.mock("../fulfillment/panel", () => ({
  default: ({ visible }: { visible: boolean }) => (
    <>
      <label>
        Assignment draft
        <textarea />
      </label>
      {visible && <p>Synthetic protected access</p>}
    </>
  ),
}));
afterEach(() => vi.clearAllMocks());
const detail = detailSchema.parse({
  order: {
    id: "order",
    version: 2,
    kind: "custom",
    state: "submitted",
    slug: "game",
    service: "boost",
    package: "",
    variant: "",
    game_name: "Game",
    created_at: "2026-09-27T00:00:00Z",
    updated_at: "2026-09-27T00:00:00Z",
  },
  offer: {
    id: "release",
    game_id: "game",
    slug: "game",
    version: 1,
    paused: false,
    created_at: "2026-09-27T00:00:00Z",
    configuration: emptyConfiguration("Game"),
  },
  answers: {},
  coupon_code: "",
  estimate: {
    release_id: "release",
    version: 1,
    evaluator: "manual-review-v1",
    expires_at: "2099-01-01T00:00:00Z",
    outcome: "manual_review",
    currency: "",
    amount_minor: "0",
    answers: {},
    lines: [],
    issues: [],
  },
});

function mount(
  query = "quote",
  state: unknown = { orderListSearch: "state=submitted&search=game" },
) {
  const router = createMemoryRouter(
    [{ path: "/admin/orders/:id", element: <AdminOrderWorkspace /> }],
    {
      initialEntries: [
        {
          pathname: "/admin/orders/order",
          search: `?section=${query}`,
          state,
        },
      ],
    },
  );
  render(<RouterProvider router={router} />);
}

it("keeps admin record identity, queue context and ordinary drafts across local sections", async () => {
  vi.mocked(get).mockResolvedValue(detail);
  mount();
  fireEvent.change(await screen.findByLabelText("Quote draft"), {
    target: { value: "Reviewed scope draft" },
  });
  fireEvent.click(screen.getByRole("link", { name: "Messages & proof" }));
  fireEvent.change(screen.getByLabelText("Admin message draft"), {
    target: { value: "Private staff reply" },
  });
  expect(screen.getByRole("heading", { name: "Order order" })).toBeVisible();
  fireEvent.click(screen.getByRole("link", { name: "Quote & agreement" }));
  expect(screen.getByLabelText("Quote draft")).toHaveValue(
    "Reviewed scope draft",
  );
  fireEvent.click(screen.getByRole("link", { name: "Messages & proof" }));
  expect(screen.getByLabelText("Admin message draft")).toHaveValue(
    "Private staff reply",
  );
  expect(screen.getByRole("link", { name: /Order queue/ })).toHaveAttribute(
    "href",
    "/admin/orders?state=submitted&search=game",
  );
});
it("hides recoverable drafts, restores them after success and clears on forbidden response", async () => {
  let status = 200;
  vi.mocked(get).mockImplementation(() => {
    if (status === 200) return Promise.resolve(detail);
    const error = new APIError("Unavailable");
    error.status = status;
    return Promise.reject(error);
  });
  mount();
  fireEvent.change(await screen.findByLabelText("Quote draft"), {
    target: { value: "Retain locally" },
  });
  status = 503;
  fireEvent.click(screen.getByRole("button", { name: "Refresh order" }));
  await screen.findByRole("button", { name: "Retry admin order" });
  expect(screen.getByLabelText("Quote draft")).not.toBeVisible();
  status = 200;
  fireEvent.click(screen.getByRole("button", { name: "Retry admin order" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Quote draft")).toBeVisible(),
  );
  expect(screen.getByLabelText("Quote draft")).toHaveValue("Retain locally");
  status = 403;
  fireEvent.click(screen.getByRole("button", { name: "Refresh order" }));
  await screen.findByRole("region", { name: "Admin order access removed" });
  expect(screen.queryByLabelText("Quote draft")).not.toBeInTheDocument();
});
it("waits for fresh authority after an admin session event instead of remounting cached private drafts", async () => {
  let resolve: (value: Detail) => void = () => {};
  let reads = 0;
  vi.mocked(get).mockImplementation(() =>
    ++reads === 1
      ? Promise.resolve(detail)
      : new Promise((done) => {
          resolve = done;
        }),
  );
  mount();
  await screen.findByLabelText("Quote draft");
  fireEvent(
    window,
    new CustomEvent("boosterplus:session-changed", {
      detail: { portal: "admin" },
    }),
  );
  expect(screen.queryByLabelText("Quote draft")).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Check admin order access" }),
  );
  expect(screen.queryByLabelText("Quote draft")).not.toBeInTheDocument();
  await act(async () => {
    resolve(detail);
    await Promise.resolve();
  });
  expect(await screen.findByLabelText("Quote draft")).toHaveValue("");
});
it("unmounts protected access when hidden while keeping the ordinary assignment draft", async () => {
  const paid = detailSchema.parse({
    ...detail,
    order: { ...detail.order, state: "in_progress" },
    contract: {
      id: "contract",
      payment_state: "settled",
      data: {
        quote_id: "",
        revision: 1,
        currency: "USD",
        subtotal_minor: "2000",
        amount_minor: "2000",
        lines: [],
        scope: "Approved scope",
        reason: "Approved",
        delivery_min_hours: 1,
        delivery_max_hours: 24,
        expires_at: "2099-01-01T00:00:00Z",
        terms_version: "terms-v1",
      },
    },
  });
  vi.mocked(get).mockResolvedValue(paid);
  mount("fulfillment");
  await screen.findByText("Synthetic protected access");
  fireEvent.change(screen.getByLabelText("Assignment draft"), {
    target: { value: "Private assignment draft" },
  });
  fireEvent.click(screen.getByRole("link", { name: "Overview" }));
  expect(
    screen.queryByText("Synthetic protected access"),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: "Fulfillment" }));
  expect(screen.getByLabelText("Assignment draft")).toHaveValue(
    "Private assignment draft",
  );
  expect(screen.getByText("Synthetic protected access")).toBeVisible();
});

it("retains intake media directory filters through local order sections", async () => {
  vi.mocked(get).mockResolvedValue(detail);
  mount("request", { mediaSearch: "state=ready&after=cursor&unknown=discard" });
  const back = await screen.findByRole("link", {
    name: /Back to media directory/,
  });
  expect(back).toHaveAttribute("href", "/admin/media?state=ready&after=cursor");
  fireEvent.click(screen.getByRole("link", { name: "Messages & proof" }));
  expect(
    screen.getByRole("link", { name: /Back to media directory/ }),
  ).toHaveAttribute("href", "/admin/media?state=ready&after=cursor");
});
