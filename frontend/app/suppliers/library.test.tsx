import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useResource } from "../orders/resource";
import { APIError, post } from "../identity/api";
import { SupplierLibrary } from "./library";
import { OfferEditor } from "./editor";
import { connections, type Library } from "./model";
import {
  supplierConnection,
  supplierLibrary,
  gameID,
  importID,
} from "../../tests/fixtures/suppliers/data";
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
  get: vi.fn(),
}));
let data: Library;
const reload = vi.fn();
const games = {
  games: [{ id: gameID, name: "Mobile Legends", archived: false }],
  next: "",
};
let source: { items: ReturnType<typeof supplierConnection>[] };
beforeEach(() => {
  data = supplierLibrary();
  source = { items: connections.map(([id]) => supplierConnection(id)) };
  vi.mocked(useResource).mockImplementation((path) => ({
    data: path.startsWith("/admin/catalog")
      ? games
      : path.endsWith("/suppliers")
        ? source
        : data,
    error: null,
    loading: false,
    reload,
  }));
});
afterEach(() => vi.clearAllMocks());
function mount() {
  return render(
    <RouterProvider
      router={createMemoryRouter(
        [
          { path: "/admin/shop/suppliers", element: <SupplierLibrary /> },
          {
            path: "/admin/shop",
            element: <h1>Manual products destination</h1>,
          },
        ],
        { initialEntries: ["/admin/shop/suppliers"] },
      )}
    />,
  );
}
it("separates environments, private imports and manual products without a purchase action", () => {
  mount();
  expect(screen.getByRole("link", { name: "Manual products" })).toHaveAttribute(
    "href",
    "/admin/shop",
  );
  expect(screen.getByText("Purchasing disabled")).toBeVisible();
  expect(screen.getByText("2 imported products · 2 offers")).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Import private catalog" }),
  ).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: /publish|purchase|buy now/i }),
  ).not.toBeInTheDocument();
});
it("shows exact adjacent previews, persistent field errors and ordinary fixed-price input", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Review Player ID" }));
  expect(screen.getByText("Nexus · Sandbox · Private offer")).toBeVisible();
  expect(screen.getByText("USD 11.50")).toBeVisible();
  fireEvent.change(screen.getByLabelText("Price rule"), {
    target: { value: "fixed" },
  });
  fireEvent.change(screen.getByLabelText("Fixed unit selling price (USD)"), {
    target: { value: "12.345" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save private offer" }));
  await waitFor(() =>
    expect(
      screen.getByLabelText("Fixed unit selling price (USD)"),
    ).toHaveFocus(),
  );
  expect(post).not.toHaveBeenCalled();
  expect(
    screen.getByText(
      "Enter a positive USD price with at most two decimal places.",
    ),
  ).toBeVisible();
  fireEvent.change(screen.getByLabelText("Fixed unit selling price (USD)"), {
    target: { value: "12.50" },
  });
  expect(screen.getByText("USD 12.50")).toBeVisible();
  expect(
    screen.queryByText("Check the highlighted fields before continuing."),
  ).not.toBeInTheDocument();
  vi.mocked(post).mockResolvedValue(data.items[0]?.offers[0]?.pricing);
  fireEvent.click(screen.getByRole("button", { name: "Save private offer" }));
  await screen.findByText("Private offer saved. Nothing was published.");
  expect(post).toHaveBeenCalledWith(
    "/admin/shop/suppliers/nexus-sandbox/prices",
    expect.objectContaining({
      settings: expect.objectContaining({
        override_minor: "1250",
        markup_bps: null,
        import_id: importID,
        version: 0,
      }) as unknown,
    }),
    expect.anything(),
  );
});
it("keeps unsaved edits after conflict and guards return to the library", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Review Player ID" }));
  fireEvent.change(screen.getByLabelText("Reviewed account region"), {
    target: { value: "Global" },
  });
  vi.mocked(post).mockRejectedValue(
    new APIError("The catalog changed. Refresh and review."),
  );
  fireEvent.click(screen.getByRole("button", { name: "Save private offer" }));
  expect(
    await screen.findByText("The catalog changed. Refresh and review."),
  ).toBeVisible();
  expect(screen.getByLabelText("Reviewed account region")).toHaveValue(
    "Global",
  );
  fireEvent.click(screen.getByRole("button", { name: "Back to products" }));
  expect(
    await screen.findByRole("heading", {
      name: "Discard these offer changes?",
    }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
  expect(screen.getByLabelText("Reviewed account region")).toHaveValue(
    "Global",
  );
  fireEvent.click(screen.getByRole("button", { name: "Back to products" }));
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(reload).toHaveBeenCalledTimes(1);
  fireEvent.click(
    screen.getByRole("button", { name: "Reload saved settings" }),
  );
  expect(reload).toHaveBeenCalledTimes(2);
  expect(post).toHaveBeenCalledTimes(1);
});
it("clears corrected default-markup feedback and reloads saved settings after discard", async () => {
  mount();
  fireEvent.click(
    screen.getByRole("button", { name: "Default markup: 15.00%" }),
  );
  fireEvent.change(screen.getByLabelText("Default markup (%)"), {
    target: { value: "1001" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save default markup" }));
  await screen.findByText("Check the highlighted fields before continuing.");
  fireEvent.change(screen.getByLabelText("Default markup (%)"), {
    target: { value: "20" },
  });
  expect(
    screen.queryByText("Check the highlighted fields before continuing."),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Discard markup change" }),
  );
  expect(reload).toHaveBeenCalledTimes(1);
  expect(post).not.toHaveBeenCalled();
});
it("clears costs and unsaved drafts when the admin session changes", () => {
  mount();
  fireEvent.click(
    screen.getByRole("button", { name: "Review Account sign-in" }),
  );
  act(() => {
    window.dispatchEvent(
      new CustomEvent("boosterplus:session-changed", {
        detail: { portal: "admin" },
      }),
    );
  });
  expect(
    screen.getByRole("heading", { name: "Admin access changed" }),
  ).toBeVisible();
  expect(screen.queryByText("Supplier unit cost")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Save private offer" }),
  ).not.toBeInTheDocument();
});
it("reuses the import request identity after a lost response", async () => {
  mount();
  vi.mocked(post).mockRejectedValue(new APIError("Connection lost"));
  fireEvent.click(
    screen.getByRole("button", { name: "Import private catalog" }),
  );
  await screen.findByText("Connection lost");
  fireEvent.click(
    screen.getByRole("button", { name: "Retry same import request" }),
  );
  await waitFor(() => {
    expect(post).toHaveBeenCalledTimes(2);
  });
  expect(vi.mocked(post).mock.calls[1]?.[1]).toEqual(
    vi.mocked(post).mock.calls[0]?.[1],
  );
});
it("saves with the reviewed import identity instead of silently accepting a replacement snapshot", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Review Player ID" }));
  const previous = data.import;
  if (!previous) throw new Error("Missing fixture import");
  data = {
    ...data,
    import: { ...previous, id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" },
  };
  fireEvent.change(screen.getByLabelText("Reviewed account region"), {
    target: { value: "Global" },
  });
  vi.mocked(post).mockResolvedValue(data.items[0]?.offers[0]?.pricing);
  fireEvent.click(screen.getByRole("button", { name: "Save private offer" }));
  await screen.findByText("Private offer saved. Nothing was published.");
  expect(post).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      settings: expect.objectContaining({ import_id: importID }) as unknown,
    }),
    expect.anything(),
  );
});
it("sends offer-specific markup as basis points and keeps delivery mapping explicit", async () => {
  const product = data.items[0],
    offer = product?.offers[0],
    close = vi.fn();
  if (!product || !offer) throw new Error("Missing synthetic offer");
  render(
    <OfferEditor
      product={product}
      offer={offer}
      connection={data.connection}
      importID={importID}
      close={close}
      accessLost={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Price rule"), {
    target: { value: "markup" },
  });
  fireEvent.change(screen.getByLabelText("Offer markup (%)"), {
    target: { value: "20.25" },
  });
  fireEvent.change(screen.getByLabelText("PLAYORA game"), {
    target: { value: gameID },
  });
  fireEvent.change(screen.getByLabelText("Reviewed account region"), {
    target: { value: "Global" },
  });
  fireEvent.change(screen.getByLabelText("Reviewed delivery method"), {
    target: { value: "id" },
  });
  expect(screen.getByText("USD 12.03")).toBeVisible();
  vi.mocked(post).mockResolvedValue(offer.pricing);
  fireEvent.click(screen.getByRole("button", { name: "Save private offer" }));
  await waitFor(() => {
    expect(close).toHaveBeenCalledWith(true);
  });
  expect(post).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      settings: expect.objectContaining({
        markup_bps: 2025,
        game_id: gameID,
        region: "Global",
        delivery_method: "id",
        override_minor: "",
      }) as unknown,
    }),
    expect.anything(),
  );
});
