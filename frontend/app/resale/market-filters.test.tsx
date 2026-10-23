import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { get } from "../identity/api";
import MarketFilters from "./market-filters";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
}));
const originalShow = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  "showModal",
);
const originalClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  "close",
);
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    },
  });
});
afterEach(() => {
  for (const [name, descriptor] of [
    ["showModal", originalShow],
    ["close", originalClose],
  ] as const) {
    if (descriptor)
      Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

function mount(query = "", global = false) {
  const apply = vi.fn();
  render(
    <MemoryRouter>
      <MarketFilters
        params={new URLSearchParams(query)}
        {...(!global ? { gameSlug: "game" } : {})}
        apply={apply}
        clear={vi.fn()}
      />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
  return apply;
}
it("keeps search outside and discards unsubmitted filters when closed", () => {
  const apply = mount("currency=USD&max_minor=1000");
  fireEvent.change(screen.getByLabelText("Search accounts"), {
    target: { value: "Unsaved search" },
  });
  fireEvent.change(screen.getByLabelText("Maximum price"), {
    target: { value: "45.67" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
  expect(screen.getByLabelText("Maximum price")).toHaveValue("10.00");
  expect(screen.getByLabelText("Search accounts")).toHaveValue(
    "Unsaved search",
  );
  expect(apply).not.toHaveBeenCalled();
});
it("keeps game context and rejects ambiguous or rounded price comparisons", async () => {
  const apply = mount();
  expect(screen.queryByLabelText("Game")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Maximum price"), {
    target: { value: "12.345" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Maximum price")).toHaveFocus();
  });
  expect(apply).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Maximum price")).toHaveAccessibleDescription(
    "Enter a positive price with at most two decimal places.",
  );
  fireEvent.change(screen.getByLabelText("Maximum price"), {
    target: { value: "12.34" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
  await waitFor(() => {
    expect(
      screen.getByLabelText("Listing currency", { exact: true }),
    ).toHaveFocus();
  });
  fireEvent.change(screen.getByLabelText("Listing currency", { exact: true }), {
    target: { value: "usd" },
  });
  fireEvent.change(screen.getByLabelText("Sort accounts", { exact: true }), {
    target: { value: "price_asc" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
  expect(apply).toHaveBeenCalledWith({
    slug: "game",
    currency: "USD",
    max_minor: "1234",
    sort: "price_asc",
  });
});
it("validates currency and removing its chip also removes dependent price filters", async () => {
  const apply = mount("currency=USD&max_minor=1000&sort=price_desc");
  fireEvent.change(screen.getByLabelText("Listing currency", { exact: true }), {
    target: { value: "US" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
  await waitFor(() => {
    expect(
      screen.getByLabelText("Listing currency", { exact: true }),
    ).toHaveFocus();
  });
  expect(
    screen.getByText("Enter a three-letter listing currency, such as USD."),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Remove listing currency filter: USD" }),
  );
  expect(apply).toHaveBeenCalledWith({ slug: "game", sort: "newest" });
});
it("loads bounded game choices, retains missing selections and supports retry", async () => {
  vi.mocked(get)
    .mockResolvedValueOnce({
      games: [{ slug: "one", name: "First game" }],
      next: "one",
    })
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({
      games: [{ slug: "two", name: "Second game" }],
      next: "",
    });
  const apply = mount(
    "slug=old&currency=EUR&max_minor=100&sort=price_desc",
    true,
  );
  expect(screen.getByLabelText("Game")).toHaveValue("old");
  await screen.findByRole("option", { name: "First game" });
  fireEvent.click(screen.getByRole("button", { name: "More game choices" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Retry game choices" }),
  );
  await screen.findByRole("option", { name: "Second game" });
  expect(
    screen.getByRole("option", { name: "First game" }),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Game"), { target: { value: "two" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
  expect(apply).toHaveBeenCalledWith(
    expect.objectContaining({
      slug: "two",
      max_minor: "100",
      currency: "EUR",
      sort: "price_desc",
    }),
  );
});
