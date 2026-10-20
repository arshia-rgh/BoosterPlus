import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import { useResource } from "../orders/resource";
import { SupplierPurchase } from "./supplier-purchase";
import {
  SupplierDelivery,
  safeRobloxURL,
  safeRedemptionURL,
  safeVerificationURL,
} from "./supplier-delivery";
import {
  customerSession,
  supplierDelivery,
  supplierProduct,
} from "../../tests/fixtures/supplier-shop/data";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
let product = supplierProduct("account"),
  delivery = supplierDelivery();
let session = customerSession;
let update = () => {};
const reload = vi.fn();
function mount(kind: "purchase" | "delivery" = "purchase", admin = false) {
  function View() {
    const [, force] = useState(0);
    update = () => {
      force((v) => v + 1);
    };
    return kind === "purchase" ? (
      <SupplierPurchase product={product} unavailable={false} />
    ) : (
      <SupplierDelivery data={delivery} admin={admin} refresh={reload} />
    );
  }
  const router = createMemoryRouter(
    [
      { path: "/games/:slug/shop/:id", element: <View /> },
      { path: "/orders/:id", element: <h1>Payment destination</h1> },
      { path: "/terms", element: <h1>Terms destination</h1> },
    ],
    { initialEntries: ["/games/example/shop/synthetic-product"] },
  );
  return { ...render(<RouterProvider router={router} />), router };
}
const quote = () => ({
  id: "synthetic-quote",
  product_id: product.id,
  release_id: product.release_id,
  quantity: "0.5",
  amount_minor: "575",
  currency: "USD",
  expires_at: new Date(Date.now() + 60000).toISOString(),
  testing: true,
});
async function review() {
  fireEvent.change(screen.getByLabelText("Player ID"), {
    target: { value: "private-player" },
  });
  fireEvent.change(screen.getByLabelText("Server"), {
    target: { value: "eu" },
  });
  fireEvent.change(screen.getByLabelText("Game password"), {
    target: { value: "private-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review current price" }));
  await screen.findByRole("heading", { name: "Review your order" });
}
beforeEach(() => {
  product = supplierProduct("account");
  delivery = supplierDelivery();
  session = structuredClone(customerSession);
  vi.mocked(useResource).mockImplementation(() => ({
    data: session,
    error: null,
    loading: false,
    reload,
  }));
  vi.mocked(post).mockResolvedValue(quote());
});
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});
it("validates required inputs, retires corrected errors, and keeps private values out of the quote", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Review current price" }));
  await waitFor(() => expect(screen.getByLabelText("Player ID")).toHaveFocus());
  await review();
  expect(post).toHaveBeenCalledTimes(1);
  expect(vi.mocked(post).mock.calls[0]?.[1]).toEqual({
    release_id: product.release_id,
    quantity: "0.5",
  });
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "Review your order" }),
    ).toHaveFocus(),
  );
  expect(screen.queryByText("private-password")).not.toBeInTheDocument();
});
it("recovers uncertain reservation using its exact original request after quote expiry", async () => {
  vi.mocked(post)
    .mockResolvedValueOnce(quote())
    .mockRejectedValueOnce(new Error("Interrupted"))
    .mockResolvedValueOnce({ order_id: "saved" });
  const { router } = mount();
  await review();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(
    screen.getByRole("button", { name: /Continue to payment|Go to payment/ }),
  );
  await screen.findByRole("button", { name: "Check this order" });
  await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
  const original = vi.mocked(post).mock.calls[1]?.[1];
  expect(screen.getByLabelText("Player ID")).toBeDisabled();
  vi.useFakeTimers();
  await act(() => vi.advanceTimersByTimeAsync(65000));
  fireEvent.click(screen.getByRole("button", { name: "Check this order" }));
  await act(() => vi.advanceTimersByTimeAsync(0));
  vi.useRealTimers();
  await screen.findByText("Payment destination");
  expect(vi.mocked(post).mock.calls[2]?.[1]).toEqual(original);
  expect(router.state.location.search).toBe("?section=payment");
});
it("invalidates a quote and protected draft when the published release changes", async () => {
  mount();
  await review();
  act(() => {
    product = { ...product, release_id: "new-release", version: 2 };
    update();
  });
  expect(
    screen.queryByRole("heading", { name: "Review your order" }),
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText("Game password")).toHaveValue("");
});
it("clears private drafts and ignores a quote arriving after a session change", async () => {
  let resolve: (value: unknown) => void = () => {};
  vi.mocked(post).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  mount();
  fireEvent.change(screen.getByLabelText("Player ID"), {
    target: { value: "private-player" },
  });
  fireEvent.change(screen.getByLabelText("Server"), {
    target: { value: "eu" },
  });
  fireEvent.change(screen.getByLabelText("Game password"), {
    target: { value: "private-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review current price" }));
  act(() => {
    window.dispatchEvent(
      new CustomEvent("boosterplus:session-changed", {
        detail: { portal: "customer" },
      }),
    );
  });
  await act(() => {
    resolve(quote());
    return Promise.resolve();
  });
  expect(
    screen.queryByRole("heading", { name: "Review your order" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByDisplayValue("private-password"),
  ).not.toBeInTheDocument();
});
it("clears revealed codes as soon as the order state changes", async () => {
  vi.mocked(post).mockResolvedValue({
    keys: [{ code: "private-delivery-code" }],
  });
  mount("delivery");
  fireEvent.click(screen.getByRole("button", { name: "Reveal my codes" }));
  await screen.findByText("private-delivery-code");
  act(() => {
    delivery = { ...supplierDelivery("held"), version: 2 };
    update();
  });
  expect(screen.queryByText("private-delivery-code")).not.toBeInTheDocument();
});
it("clears revealed codes when the parent order version changes without a supplier-state change", async () => {
  vi.mocked(post).mockResolvedValue({
    keys: [{ code: "private-delivery-code" }],
  });
  mount("delivery");
  fireEvent.click(screen.getByRole("button", { name: "Reveal my codes" }));
  await screen.findByText("private-delivery-code");
  act(() => {
    delivery = { ...delivery, order_version: 2, order_state: "on_hold" };
    update();
  });
  expect(screen.queryByText("private-delivery-code")).not.toBeInTheDocument();
});
it("expires private reveals one minute after revealing and clears stale response on blur", async () => {
  vi.useFakeTimers();
  vi.mocked(post).mockResolvedValue({
    keys: [{ code: "private-delivery-code" }],
  });
  mount("delivery");
  await act(() => vi.advanceTimersByTimeAsync(59000));
  await act(() => {
    fireEvent.click(screen.getByRole("button", { name: "Reveal my codes" }));
    return Promise.resolve();
  });
  await act(() => vi.advanceTimersByTimeAsync(2000));
  expect(screen.getByText("private-delivery-code")).toBeVisible();
  await act(() => vi.advanceTimersByTimeAsync(58000));
  expect(screen.queryByText("private-delivery-code")).not.toBeInTheDocument();
  let resolve: (value: unknown) => void = () => {};
  vi.mocked(post).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Reveal my codes" }));
  act(() => {
    window.dispatchEvent(new Event("blur"));
  });
  await act(() => {
    resolve({ keys: [{ code: "late-code" }] });
    return Promise.resolve();
  });
  expect(screen.queryByText("late-code")).not.toBeInTheDocument();
});
it("keeps an uncertain supplier outcome read-only and does not expose customer secrets to admin", () => {
  delivery = supplierDelivery("unresolved");
  mount("delivery", true);
  expect(
    screen.getByRole("heading", { name: "Checking delivery status" }),
  ).toBeVisible();
  expect(
    screen.queryByRole("button", {
      name: /Reveal|Check required action|Retry purchase/,
    }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Refresh delivery" }));
  expect(reload).toHaveBeenCalledOnce();
  expect(post).not.toHaveBeenCalled();
});
it("exposes verification errors with a useful retry and rejects foreign handoff URLs", async () => {
  delivery = supplierDelivery("pending", "account");
  vi.mocked(post).mockRejectedValueOnce(
    Object.assign(new APIError("Verify to continue"), { status: 403 }),
  );
  mount("delivery");
  fireEvent.click(
    screen.getByRole("button", { name: "Check required action" }),
  );
  await screen.findByRole("alert");
  expect(
    screen.getByRole("button", { name: "Check required action" }),
  ).toBeEnabled();
  expect(
    safeVerificationURL("https://nexus.amadeustech.dev/verify", true),
  ).toBe(false);
  expect(
    safeVerificationURL(
      "https://nexus-sandbox.amadeustech.dev.evil.invalid/verify",
      true,
    ),
  ).toBe(false);
  expect(
    safeRobloxURL("https://www.roblox.com/users/123/profile?redirect=evil"),
  ).toBe(false);
  expect(safeRedemptionURL("javascript:alert(1)")).toBe(false);
  expect(safeRedemptionURL("https://user:secret@redeem.example.invalid")).toBe(
    false,
  );
  expect(safeRedemptionURL("https://redeem.example.invalid/code")).toBe(true);
});
it.each(["pending", "completed"])(
  "hides protected controls when %s needs support review",
  (state) => {
    delivery = supplierDelivery(state);
    if (!delivery.supplier) throw new Error("Missing fixture supplier");
    delivery.supplier.needs_review = true;
    delivery.supplier.codes_available = true;
    mount("delivery");
    expect(
      screen.queryByRole("button", {
        name: /Reveal my codes|Check required action/,
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Support is reviewing/)).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Delivery needs support review" }),
    ).toBeVisible();
    expect(post).not.toHaveBeenCalled();
  },
);
it("keeps typed private details until an explicit navigation decision", async () => {
  const { router } = mount();
  fireEvent.change(screen.getByLabelText("Game password"), {
    target: { value: "private-password" },
  });
  await act(() => router.navigate("/terms"));
  expect(screen.getByRole("alert")).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Stay with purchase" }));
  expect(screen.getByLabelText("Game password")).toHaveValue(
    "private-password",
  );
  await act(() => router.navigate("/terms"));
  fireEvent.click(screen.getByRole("button", { name: "Leave this purchase" }));
  await screen.findByText("Terms destination");
  expect(
    screen.queryByDisplayValue("private-password"),
  ).not.toBeInTheDocument();
});
it("gives a manual copy fallback if the clipboard is unavailable", async () => {
  vi.mocked(post).mockResolvedValue({
    keys: [{ code: "private-delivery-code" }],
  });
  mount("delivery");
  fireEvent.click(screen.getByRole("button", { name: "Reveal my codes" }));
  await screen.findByText("private-delivery-code");
  fireEvent.click(screen.getByRole("button", { name: "Copy code 1" }));
  await screen.findByText(
    "Could not copy. Select the code and copy it manually.",
  );
});
it.each(["cancelled", "expired", "rejected", "on_hold"])(
  "blocks protected actions and payment for parent %s even with stale supplier flags",
  (orderState) => {
    delivery = { ...supplierDelivery("completed"), order_state: orderState };
    const view = mount("delivery");
    expect(
      screen.queryByRole("button", {
        name: /Reveal my codes|Check required action/,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name:
          orderState === "expired"
            ? "Order expired"
            : orderState === "rejected"
              ? "Order not accepted"
              : orderState === "cancelled"
                ? "Order cancelled"
                : "Delivery needs support review",
      }),
    ).toBeVisible();
    view.unmount();
    delivery = {
      ...supplierDelivery("awaiting_payment"),
      order_state: orderState,
    };
    mount("delivery");
    expect(
      screen.queryByRole("link", { name: "Go to payment" }),
    ).not.toBeInTheDocument();
  },
);
