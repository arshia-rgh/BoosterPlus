import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { APIError, get, post } from "../identity/api";
import { useResource } from "../orders/resource";
import { ShopProductEditor } from "./editor";
import { emptyDefinition, type Draft } from "./model";
import { invalidNumericFields } from "../ui/numeric-fields";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
const id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  reload = vi.fn();
let row: Draft,
  error: unknown = null;
beforeEach(() => {
  row = {
    id,
    game_id: "game",
    slug: "item",
    game: "Fixture game",
    version: 1,
    state: "draft",
    draft: { ...emptyDefinition(), title: "Fixture item" },
    current_release: "",
    stocks: [],
    updated_at: "2026-09-28T00:00:00Z",
  };
  error = null;
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.mocked(useResource).mockImplementation((path) => ({
    data: path.endsWith("/releases?after=0")
      ? { items: [], next: 0 }
      : error
        ? null
        : row,
    error,
    loading: false,
    reload,
  }));
});
afterEach(() => vi.clearAllMocks());
function mount(section = "basics") {
  const router = createMemoryRouter(
    [
      { path: "/admin/shop/:id", element: <ShopProductEditor /> },
      { path: "/admin/shop", element: <h1>Shop list destination</h1> },
      { path: "/admin/login", element: <h1>Separate admin sign-in</h1> },
    ],
    {
      initialEntries: [
        {
          pathname: `/admin/shop/${id}`,
          search: `?section=${section}`,
          state: { shopSearch: "state=draft&q=fixture" },
        },
      ],
    },
  );
  return { ...render(<RouterProvider router={router} />), router };
}
it("preserves product drafts across local sections and guards leaving with list context", async () => {
  const { router } = mount();
  fireEvent.change(screen.getByLabelText("Product title"), {
    target: { value: "Unsaved item" },
  });
  fireEvent.click(screen.getByRole("link", { name: "Terms" }));
  await screen.findByLabelText("Delivery terms");
  fireEvent.click(screen.getByRole("link", { name: "Details" }));
  expect(await screen.findByLabelText("Product title")).toHaveValue(
    "Unsaved item",
  );
  fireEvent.click(screen.getByRole("link", { name: /Shop products/ }));
  expect(await screen.findByRole("alert")).toHaveFocus();
  expect(router.state.location.pathname).toBe(`/admin/shop/${id}`);
  fireEvent.click(screen.getByRole("button", { name: "Stay with this draft" }));
  fireEvent.click(screen.getByRole("link", { name: /Shop products/ }));
  fireEvent.click(
    screen.getByRole("button", { name: "Discard edits and leave" }),
  );
  await screen.findByText("Shop list destination");
  expect(router.state.location.search).toBe("?state=draft&q=fixture");
  expect(post).not.toHaveBeenCalled();
});

it("keeps numeric draft errors in the correct section and focuses the invalid quantity again after returning", async () => {
  row.draft.variants = [
    {
      key: "test",
      label: "Test item",
      region: "Global",
      platform: "Mobile",
      server: "Test",
      currency: "USD",
      unit_amount_minor: "1000",
      min_quantity: 1,
      max_quantity: 2,
      enabled: true,
    },
  ];
  let rejectRepeatedSave: (() => void) | undefined;
  vi.mocked(post).mockImplementation((_path, body) => {
    const invalid = Object.assign(new APIError("Invalid number"), {
      status: 400,
      issues: invalidNumericFields(body),
    });
    if (vi.mocked(post).mock.calls.length === 1) return Promise.reject(invalid);
    return new Promise((_resolve, reject) => {
      rejectRepeatedSave = () => {
        reject(invalid);
      };
    });
  });
  const { router } = mount("variants");
  const quantity = screen.getByLabelText("Minimum quantity");
  fireEvent.change(quantity, { target: { value: "1.5" } });
  fireEvent.click(screen.getByRole("button", { name: "Save product draft" }));
  await waitFor(() => {
    expect(router.state.location.search).toBe(
      "?section=variants&field=variants.0.min_quantity",
    );
    expect(quantity).toBeVisible();
    expect(quantity).toHaveFocus();
    expect(quantity).toHaveValue("1.5");
    expect(quantity).toHaveAttribute("aria-invalid", "true");
    expect(quantity).toHaveAccessibleDescription(/whole number/);
  });
  const quantityFocus = vi.spyOn(quantity, "focus");
  try {
    fireEvent.click(screen.getByRole("link", { name: "Terms" }));
    const terms = await screen.findByLabelText("Delivery terms");
    await waitFor(() => {
      expect(router.state.location.search).toContain("section=terms");
      expect(terms).toBeVisible();
      expect(quantity).not.toBeVisible();
    });
    terms.focus();
    await act(async () => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => {
          resolve();
        }),
      );
    });
    expect(terms).toHaveFocus();
    expect(quantityFocus).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Save product draft" }));
    expect(post).toHaveBeenCalledTimes(2);
    await act(async () => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => {
          resolve();
        }),
      );
    });
    expect(router.state.location.search).toContain("section=terms");
    expect(terms).toBeVisible();
    expect(quantity).not.toBeVisible();
    expect(quantityFocus).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Save product draft" }),
    ).toBeDisabled();
    expect(rejectRepeatedSave).toBeDefined();
    await act(async () => {
      rejectRepeatedSave?.();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(router.state.location.search).toBe(
        "?section=variants&field=variants.0.min_quantity",
      );
      expect(quantity).toBeVisible();
      expect(quantity).toHaveFocus();
      expect(quantity).toHaveValue("1.5");
      expect(quantity).toHaveAttribute("aria-invalid", "true");
      expect(quantity).toHaveAccessibleDescription(/whole number/);
      expect(
        screen.getByRole("button", { name: "Save product draft" }),
      ).toBeEnabled();
    });
    expect(quantityFocus).toHaveBeenCalledOnce();
  } finally {
    quantityFocus.mockRestore();
  }
});
it("retains ordinary edits during transport failure and clears them on denied access", async () => {
  const { router } = mount();
  fireEvent.change(screen.getByLabelText("Product title"), {
    target: { value: "Private draft" },
  });
  error = Object.assign(new APIError("Unavailable"), { status: 503 });
  await act(async () => {
    await router.navigate("?section=terms");
  });
  expect(screen.getByText(/details are hidden/)).toBeVisible();
  error = null;
  await act(async () => {
    await router.navigate("?section=basics");
  });
  expect(screen.getByLabelText("Product title")).toHaveValue("Private draft");
  error = Object.assign(new APIError("Denied"), { status: 403 });
  await act(async () => {
    await router.navigate("?section=terms");
  });
  expect(screen.getByText(/Product access changed/)).toBeVisible();
  expect(screen.queryByDisplayValue("Private draft")).not.toBeInTheDocument();
});
it("publishes only a saved preview and preserves the acknowledged revision during refresh", async () => {
  row.draft.reviewed = true;
  vi.mocked(get).mockResolvedValue({ draft: structuredClone(row), issues: [] });
  mount("publication");
  expect(
    screen.queryByRole("button", { name: "Publish reviewed revision" }),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Preview saved revision" }),
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Publish reviewed revision" }),
  );
  expect(post).not.toHaveBeenCalled();
  vi.mocked(post).mockResolvedValue({
    ...row,
    version: 2,
    state: "published",
    current_release: "release",
  });
  fireEvent.click(screen.getByRole("button", { name: "Confirm publish" }));
  await waitFor(() => {
    expect(post).toHaveBeenCalledWith(
      `/admin/shop/products/${id}/publish`,
      { version: 1 },
      expect.anything(),
    );
  });
  expect(await screen.findByText("Saved revision 2")).toBeVisible();
  expect(reload).toHaveBeenCalled();
});
it("never overwrites a dirty draft on a newer revision or publishes unsaved edits", async () => {
  const { router } = mount();
  fireEvent.change(screen.getByLabelText("Product title"), {
    target: { value: "My draft" },
  });
  row = { ...row, version: 2, draft: { ...row.draft, title: "Other editor" } };
  await act(async () => {
    await router.navigate("?section=publication");
  });
  expect(screen.getByText("A newer revision is available")).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Preview saved revision" }),
  ).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Discard my edits and use revision 2" }),
  );
  await act(async () => {
    await router.navigate("?section=basics");
  });
  expect(screen.getByLabelText("Product title")).toHaveValue("Other editor");
});
it("clears private drafts immediately when a write denies access", async () => {
  mount();
  fireEvent.change(screen.getByLabelText("Product title"), {
    target: { value: "Do not retain" },
  });
  vi.mocked(post).mockRejectedValue(
    Object.assign(new APIError("Denied"), { status: 403 }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Save product draft" }));
  expect(await screen.findByText(/Product access changed/)).toBeVisible();
  expect(screen.queryByDisplayValue("Do not retain")).not.toBeInTheDocument();
});
it("requires stock commitment review and rejects a capacity below commitments", async () => {
  row = {
    ...row,
    state: "published",
    current_release: "release",
    stocks: [
      {
        variant_key: "item",
        version: 1,
        total: 8,
        reserved: 2,
        committed: 3,
        available: 3,
      },
    ],
  };
  mount("stock");
  fireEvent.change(screen.getByLabelText("Total capacity for item"), {
    target: { value: "4" },
  });
  fireEvent.change(screen.getByLabelText("Capacity change reason for item"), {
    target: { value: "Verified capacity update" },
  });
  fireEvent.click(
    screen.getByLabelText("I reviewed the stock commitments for item"),
  );
  expect(
    screen.getByRole("button", { name: "Update item capacity" }),
  ).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Total capacity for item"), {
    target: { value: "10" },
  });
  expect(
    screen.getByRole("button", { name: "Update item capacity" }),
  ).toBeDisabled();
  fireEvent.click(
    screen.getByLabelText("I reviewed the stock commitments for item"),
  );
  vi.mocked(post).mockResolvedValue({
    ...row,
    version: 2,
    stocks: [{ ...row.stocks[0], version: 2, total: 10, available: 5 }],
  });
  fireEvent.click(screen.getByRole("button", { name: "Update item capacity" }));
  await waitFor(() => {
    expect(post).toHaveBeenCalledWith(
      `/admin/shop/products/${id}/stock`,
      {
        version: 1,
        stock_version: 1,
        variant_key: "item",
        total: 10,
        reason: "Verified capacity update",
      },
      expect.anything(),
    );
  });
});
it("guards stock drafts across sections and prevents departure while capacity is saving", async () => {
  row = {
    ...row,
    state: "published",
    current_release: "release",
    stocks: [
      {
        variant_key: "item",
        version: 1,
        total: 8,
        reserved: 2,
        committed: 3,
        available: 3,
      },
    ],
  };
  const { router } = mount("stock");
  fireEvent.change(screen.getByLabelText("Capacity change reason for item"), {
    target: { value: "Stock draft to retain" },
  });
  fireEvent.click(screen.getByRole("link", { name: "Terms" }));
  await screen.findByLabelText("Delivery terms");
  fireEvent.click(screen.getByRole("link", { name: /Shop products/ }));
  expect(
    await screen.findByRole("heading", { name: "Keep your product draft?" }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Stay with this draft" }));
  await act(async () => {
    await router.navigate("?section=stock");
  });
  expect(screen.getByLabelText("Capacity change reason for item")).toHaveValue(
    "Stock draft to retain",
  );
  vi.mocked(post).mockReturnValue(new Promise(() => {}));
  fireEvent.click(
    screen.getByLabelText("I reviewed the stock commitments for item"),
  );
  fireEvent.click(screen.getByRole("button", { name: "Update item capacity" }));
  fireEvent.click(screen.getByRole("link", { name: /Shop products/ }));
  expect(
    await screen.findByRole("button", { name: "Discard edits and leave" }),
  ).toBeDisabled();
});
it("clears the entire private editor when publication history denies the record", async () => {
  vi.mocked(useResource).mockImplementation((path) => ({
    data: path.includes("/releases") ? null : row,
    error: path.includes("/releases")
      ? Object.assign(new APIError("Gone"), { status: 404 })
      : null,
    loading: false,
    reload,
  }));
  mount("history");
  expect(await screen.findByText(/Product access changed/)).toBeVisible();
  expect(screen.queryByText("Fixture item")).not.toBeInTheDocument();
});
it("links validation to the correct local section and associates the field error", async () => {
  mount();
  fireEvent.change(screen.getByLabelText("Product title"), {
    target: { value: "Edited" },
  });
  const invalid = new APIError("Invalid");
  invalid.issues = [
    {
      path: "policy.delivery_terms",
      message: "Provide explicit delivery terms.",
    },
  ];
  vi.mocked(post).mockRejectedValue(invalid);
  fireEvent.click(screen.getByRole("button", { name: "Save product draft" }));
  const correction = await screen.findByRole("link", {
    name: "Delivery and commercial terms · Delivery terms: Provide explicit delivery terms.",
  });
  fireEvent.click(correction);
  const input = await screen.findByLabelText("Delivery terms");
  await waitFor(() => expect(input).toHaveFocus());
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAccessibleDescription("Provide explicit delivery terms.");
});
