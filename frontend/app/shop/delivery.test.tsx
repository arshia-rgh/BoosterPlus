import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  createMemoryRouter,
  RouterProvider,
  Link,
  useLocation,
} from "react-router";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import { RecordDraftBoundary } from "../ui/record-drafts";
import ShopDeliveryPanel from "./delivery";
import { emptyDefinition, type ShopDelivery } from "./model";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
let row: ShopDelivery;
const reload = vi.fn();
beforeEach(() => {
  row = {
    order_id: "order",
    order_state: "in_progress",
    order_version: 3,
    version: 1,
    state: "processing",
    assigned_id: "staff",
    note: "",
    proof_message_id: "",
    updated_at: "2026-09-28T00:00:00Z",
    recipient_provided: true,
    purchase: {
      product_id: "product",
      release_id: "release",
      quantity: 1,
      amount_minor: "1234",
      product: { ...emptyDefinition(), title: "Fixture product" },
      variant: {
        key: "fixture",
        label: "Fixture variant",
        region: "Test",
        platform: "Test",
        server: "Test",
        currency: "USD",
        unit_amount_minor: "1234",
        min_quantity: 1,
        max_quantity: 2,
        enabled: true,
      },
    },
  };
  vi.mocked(useResource).mockImplementation((path) => ({
    data:
      path === "/auth/session"
        ? { user: { id: "staff", role: "administrator" } }
        : row,
    loading: false,
    error: null,
    reload,
  }));
});
afterEach(() => vi.resetAllMocks());
function Record() {
  const visible = useLocation().search !== "?section=messages";
  return (
    <RecordDraftBoundary>
      <Link to="?section=delivery">Delivery</Link>
      <Link to="?section=messages">Messages</Link>
      <Link to="/queue">Queue</Link>
      <div hidden={!visible}>
        <ShopDeliveryPanel
          id="order"
          admin
          visible={visible}
          changed={reload}
        />
      </div>
    </RecordDraftBoundary>
  );
}
function mount() {
  const router = createMemoryRouter(
    [
      { path: "/order", element: <Record /> },
      { path: "/queue", element: <h1>Queue destination</h1> },
    ],
    { initialEntries: ["/order"] },
  );
  return { ...render(<RouterProvider router={router} />), router };
}
it("shows the leave prompt outside a hidden delivery section and preserves the draft", async () => {
  mount();
  fireEvent.change(screen.getByLabelText("Action"), {
    target: { value: "hold" },
  });
  fireEvent.change(screen.getByLabelText("Customer-visible update"), {
    target: { value: "Unsaved delivery update" },
  });
  fireEvent.click(screen.getByRole("link", { name: "Messages" }));
  fireEvent.click(screen.getByRole("link", { name: "Queue" }));
  expect(await screen.findByRole("alert")).toBeVisible();
  expect(screen.getByRole("alert")).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Stay on order" }));
  fireEvent.click(screen.getByRole("link", { name: "Delivery" }));
  expect(screen.getByLabelText("Customer-visible update")).toHaveValue(
    "Unsaved delivery update",
  );
  expect(post).not.toHaveBeenCalled();
});
it("fences late recipient responses after refresh or changing local sections", async () => {
  let resolve: (v: unknown) => void = () => {};
  vi.mocked(post).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  mount();
  fireEvent.click(
    screen.getByRole("button", {
      name: "View my authorized recipient details",
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Refresh delivery" }));
  await act(async () => {
    resolve({ values: { player_id: "private-late-recipient" } });
    await Promise.resolve();
  });
  expect(screen.queryByText("private-late-recipient")).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", {
      name: "View my authorized recipient details",
    }),
  );
  fireEvent.click(screen.getByRole("link", { name: "Messages" }));
  await act(async () => {
    resolve({ values: { player_id: "private-late-recipient" } });
    await Promise.resolve();
  });
  fireEvent.click(screen.getByRole("link", { name: "Delivery" }));
  expect(screen.queryByText("private-late-recipient")).not.toBeInTheDocument();
});
it("retains notes across a stale delivery revision until an explicit review", async () => {
  const { router } = mount();
  fireEvent.change(screen.getByLabelText("Action"), {
    target: { value: "hold" },
  });
  fireEvent.change(screen.getByLabelText("Customer-visible update"), {
    target: { value: "Draft for current customer" },
  });
  row = { ...row, version: 2, order_version: 4 };
  await act(async () => {
    await router.navigate("?refresh=1");
  });
  expect(
    screen.getByRole("button", { name: "Confirm: Place delivery on hold" }),
  ).toBeDisabled();
  expect(screen.getByLabelText("Customer-visible update")).toHaveValue(
    "Draft for current customer",
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Review current delivery" }),
  );
  fireEvent.change(screen.getByLabelText("Action"), {
    target: { value: "hold" },
  });
  expect(screen.getByLabelText("Customer-visible update")).toHaveValue(
    "Draft for current customer",
  );
});
