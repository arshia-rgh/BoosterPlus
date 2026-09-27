import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { emptyConfiguration } from "../catalog/model";
import { APIError, get, post } from "../identity/api";
import { detailSchema, type Commercial, type Detail } from "../orders/model";
import OrderMessages from "./order-messages";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
  post: vi.fn(),
}));
vi.mock("./thread", () => ({
  default: ({
    conversationID,
    visible,
  }: {
    conversationID: string;
    visible: boolean;
  }) => <textarea aria-label={conversationID + " draft"} disabled={!visible} />,
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

it("retains a shared draft through visibility checks and transient failure, but clears it after access denial", async () => {
  const order = detail("in_progress");
  order.contract = { id: "contract", payment_state: "settled", data: price };
  let status = 200;
  vi.mocked(get).mockImplementation(() => {
    if (status !== 200) {
      const error = new APIError("Access unavailable");
      error.status = status;
      return Promise.reject(error);
    }
    return Promise.resolve({
      order_id: order.order.id,
      coordination_id: "shared-thread",
    });
  });
  vi.mocked(post).mockResolvedValue({ id: "private-thread" });
  const view = render(
    <MemoryRouter
      initialEntries={[
        "/orders/owned-order?section=messages&channel=coordination",
      ]}
    >
      <OrderMessages detail={order} visible />
    </MemoryRouter>,
  );
  fireEvent.change(await screen.findByLabelText("shared-thread draft"), {
    target: { value: "Shared draft" },
  });
  fireEvent.click(screen.getByRole("link", { name: "Private support" }));
  await screen.findByLabelText("private-thread draft");
  status = 503;
  fireEvent.click(screen.getByRole("link", { name: "Shared coordination" }));
  await screen.findByRole("button", { name: "Retry coordination access" });
  expect(screen.getByLabelText("shared-thread draft")).not.toBeVisible();
  expect(screen.getByLabelText("shared-thread draft")).toHaveValue(
    "Shared draft",
  );
  status = 200;
  fireEvent.click(
    screen.getByRole("button", { name: "Retry coordination access" }),
  );
  await waitFor(() =>
    expect(screen.getByLabelText("shared-thread draft")).toBeVisible(),
  );
  expect(screen.getByLabelText("shared-thread draft")).toHaveValue(
    "Shared draft",
  );
  fireEvent.click(screen.getByRole("link", { name: "Private support" }));
  status = 403;
  fireEvent.click(screen.getByRole("link", { name: "Shared coordination" }));
  await waitFor(() =>
    expect(
      screen.queryByLabelText("shared-thread draft"),
    ).not.toBeInTheDocument(),
  );
  view.unmount();
});
