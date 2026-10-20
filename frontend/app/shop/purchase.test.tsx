import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import { useResource } from "../orders/resource";
import { GameShop } from "./public";
import { emptyDefinition, type PublicProduct } from "./model";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
const reload = vi.fn();
let product: PublicProduct;
let signedIn = true;
let failure: unknown = null;
beforeEach(() => {
  signedIn = true;
  failure = null;
  product = {
    id: "product",
    game_id: "game",
    game_slug: "fixture",
    release_id: "release",
    version: 1,
    supplier_available: false,
    available: { fixture: 4 },
    definition: {
      ...emptyDefinition(),
      title: "Fixture item",
      description: "Synthetic purchase",
      variants: [
        {
          key: "fixture",
          label: "Fixture variant",
          region: "Test region",
          platform: "Test platform",
          server: "Test server",
          currency: "USD",
          unit_amount_minor: "1234",
          min_quantity: 1,
          max_quantity: 2,
          enabled: true,
        },
      ],
      recipient: [
        {
          key: "player_id",
          label: "Player ID",
          help: "Game identifier only",
          required: true,
          max_length: 32,
        },
      ],
    },
  };
  vi.mocked(useResource).mockImplementation((path) => ({
    data:
      path === "/auth/session"
        ? {
            user: signedIn ? { id: "customer", role: "customer" } : null,
            mfa_required: false,
            terms_version: "terms",
          }
        : failure
          ? null
          : product,
    error: path === "/auth/session" ? null : failure,
    loading: false,
    reload,
  }));
});
afterEach(() => vi.resetAllMocks());
function mount() {
  const router = createMemoryRouter(
    [
      {
        path: "/games/:slug/shop/:id",
        loader: () => ({
          slug: "fixture",
          configuration: {
            discovery: { capabilities: [{ service: "shop", state: "active" }] },
          },
          paused: false,
        }),
        element: <GameShop detail />,
      },
      { path: "/orders/:id", element: <h1>Owned payment destination</h1> },
      { path: "/games/:slug/shop", element: <h1>Shop destination</h1> },
    ],
    {
      initialEntries: [
        {
          pathname: "/games/fixture/shop/product",
          state: { shopSearch: "q=fixture&region=Test" },
        },
      ],
    },
  );
  return { ...render(<RouterProvider router={router} />), router };
}
async function review() {
  await screen.findByText("Fixture item");
  fireEvent.click(
    screen.getByRole("button", { name: "Continue to recipient" }),
  );
  expect(
    screen.getByRole("heading", { name: "Where should we deliver?" }),
  ).toHaveFocus();
  fireEvent.change(screen.getByLabelText("Player ID (required)"), {
    target: { value: "private-recipient" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review purchase" }));
  expect(
    screen.getByRole("heading", { name: "Review your purchase" }),
  ).toHaveFocus();
  fireEvent.click(screen.getByRole("checkbox"));
}
it("keeps private fields out of browsing, signs in first and preserves safe intent", async () => {
  signedIn = false;
  mount();
  expect(
    await screen.findByRole("link", { name: "Sign in to continue" }),
  ).toHaveAttribute(
    "href",
    "/login?returnTo=%2Fgames%2Ffixture%2Fshop%2Fproduct",
  );
  expect(
    screen.queryByLabelText("Player ID (required)"),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to shop" })).toHaveAttribute(
    "href",
    "/games/fixture/shop?q=fixture&region=Test",
  );
});
it("locks an uncertain reservation and retries exactly once with its original key", async () => {
  vi.mocked(post)
    .mockRejectedValueOnce(new Error("Network interrupted"))
    .mockResolvedValueOnce({ order_id: "purchased" });
  const { router } = mount();
  await review();
  fireEvent.click(
    screen.getByRole("button", { name: "Reserve and continue to payment" }),
  );
  await screen.findByRole("button", { name: "Retry reservation" });
  await waitFor(() =>
    expect(
      screen.getByRole("region", { name: "Reservation recovery" }),
    ).toHaveFocus(),
  );
  expect(post).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Edit recipient" })).toBeDisabled();
  expect(screen.queryByText("private-recipient")).not.toBeInTheDocument();
  const initial = vi.mocked(post).mock.calls[0]?.[1];
  fireEvent.click(screen.getByRole("button", { name: "Retry reservation" }));
  await screen.findByText("Owned payment destination");
  expect(post).toHaveBeenCalledTimes(2);
  expect(vi.mocked(post).mock.calls[1]?.[1]).toEqual(initial);
  expect(router.state.location.search).toBe("?section=payment");
});
it("retains a draft across transport refresh and requires fresh acceptance after publication changes", async () => {
  const { router } = mount();
  await review();
  failure = Object.assign(new APIError("Unavailable"), { status: 503 });
  await act(async () => {
    await router.navigate("?variant=fixture&quantity=1");
  });
  expect(
    screen.getByRole("button", { name: "Reserve and continue to payment" }),
  ).toBeDisabled();
  failure = null;
  product = { ...product, release_id: "next" };
  await act(async () => {
    await router.navigate("?variant=fixture&quantity=2");
  });
  await screen.findByText(/published product changed/);
  fireEvent.click(
    screen.getByRole("button", { name: "Continue to recipient" }),
  );
  expect(screen.getByLabelText("Player ID (required)")).toHaveValue(
    "private-recipient",
  );
  fireEvent.click(screen.getByRole("button", { name: "Review purchase" }));
  expect(screen.getByRole("checkbox")).not.toBeChecked();
});
it("clears private drafts on customer session loss and fences a late reservation result", async () => {
  let resolve: (value: unknown) => void = () => {};
  vi.mocked(post).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const { router } = mount();
  await review();
  fireEvent.click(
    screen.getByRole("button", { name: "Reserve and continue to payment" }),
  );
  signedIn = false;
  act(() => {
    window.dispatchEvent(
      new CustomEvent("boosterplus:session-changed", {
        detail: { portal: "customer" },
      }),
    );
  });
  await act(async () => {
    resolve({ order_id: "old-customer" });
    await Promise.resolve();
  });
  expect(router.state.location.pathname).toBe("/games/fixture/shop/product");
  await waitFor(() =>
    expect(
      screen.queryByDisplayValue("private-recipient"),
    ).not.toBeInTheDocument(),
  );
});
it("removes obsolete recipient fields after publication changes before another reservation", async () => {
  vi.mocked(post).mockResolvedValue({ order_id: "purchased" });
  const { router } = mount();
  await review();
  product = {
    ...product,
    release_id: "new-schema",
    definition: {
      ...product.definition,
      recipient: [
        {
          key: "server_id",
          label: "Server ID",
          help: "Destination only",
          required: true,
          max_length: 32,
        },
      ],
    },
  };
  await act(async () => {
    await router.navigate("?variant=fixture&quantity=1");
  });
  await screen.findByText(/published product changed/);
  fireEvent.click(
    screen.getByRole("button", { name: "Continue to recipient" }),
  );
  expect(screen.queryByLabelText("Player ID (required)")).toBeNull();
  fireEvent.change(screen.getByLabelText("Server ID (required)"), {
    target: { value: "new-server" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review purchase" }));
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(
    screen.getByRole("button", { name: "Reserve and continue to payment" }),
  );
  await screen.findByText("Owned payment destination");
  expect(post).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      release_id: "new-schema",
      recipient: { server_id: "new-server" },
    }),
    expect.anything(),
  );
});

it("identifies and focuses invalid recipient fields while retaining every entered value", async () => {
  product.definition.recipient.push({
    key: "server_id",
    label: "Server ID",
    help: "Destination server",
    required: true,
    max_length: 16,
  });
  mount();
  await screen.findByText("Fixture item");
  fireEvent.click(
    screen.getByRole("button", { name: "Continue to recipient" }),
  );
  const player = screen.getByLabelText("Player ID (required)");
  const server = screen.getByLabelText("Server ID (required)");
  const submit = screen.getByRole("button", { name: "Review purchase" });
  fireEvent.change(player, { target: { value: "x".repeat(33) } });
  fireEvent.change(server, { target: { value: "1234" } });
  expect(submit).toBeEnabled();
  fireEvent.click(submit);
  await waitFor(() => expect(player).toHaveFocus());
  expect(player).toHaveAttribute("aria-invalid", "true");
  expect(player).toHaveAccessibleDescription(/32 characters or fewer/);
  expect(server).not.toHaveAttribute("aria-invalid");
  expect(player).toHaveValue("x".repeat(33));
  expect(server).toHaveValue("1234");
  expect(post).not.toHaveBeenCalled();
  server.focus();
  fireEvent.click(submit);
  await waitFor(() => expect(player).toHaveFocus());
  fireEvent.change(player, { target: { value: "accepted-player" } });
  fireEvent.change(server, { target: { value: "   " } });
  fireEvent.click(submit);
  await waitFor(() => expect(server).toHaveFocus());
  expect(server).toHaveAccessibleDescription(/Enter Server ID/);
  expect(player).not.toHaveAttribute("aria-invalid");
  fireEvent.change(server, { target: { value: "1234" } });
  fireEvent.click(submit);
  expect(
    screen.getByRole("heading", { name: "Review your purchase" }),
  ).toHaveFocus();
  expect(post).not.toHaveBeenCalled();
});

it("counts recipient Unicode characters consistently and allows blank optional fields", async () => {
  product.definition.recipient.push({
    key: "delivery_note",
    label: "Extra ID",
    help: "Optional",
    required: false,
    max_length: 8,
  });
  mount();
  await screen.findByText("Fixture item");
  fireEvent.click(
    screen.getByRole("button", { name: "Continue to recipient" }),
  );
  fireEvent.change(screen.getByLabelText("Player ID (required)"), {
    target: { value: "🎮".repeat(32) },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review purchase" }));
  expect(
    screen.getByRole("heading", { name: "Review your purchase" }),
  ).toHaveFocus();
  expect(screen.getByText("Not provided")).toBeInTheDocument();
});
