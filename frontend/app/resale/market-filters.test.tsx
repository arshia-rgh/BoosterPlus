import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { get } from "../identity/api";
import MarketFilters from "./market-filters";

vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
}));
beforeEach(() =>
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
);
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("retains unsubmitted filters when a resize moves them into and out of the mobile drawer", () => {
  let changed = () => {};
  const media = {
    matches: false,
    addEventListener: (_: string, callback: () => void) => {
      changed = callback;
    },
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("matchMedia", () => media);
  render(
    <MarketFilters
      params={new URLSearchParams()}
      gameSlug="game"
      apply={vi.fn()}
      clear={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Search accounts"), {
    target: { value: "Unsaved search" },
  });
  fireEvent.change(screen.getByLabelText("Listing currency"), {
    target: { value: "USD" },
  });
  fireEvent.change(screen.getByLabelText("Maximum price (USD)"), {
    target: { value: "45.67" },
  });
  fireEvent.change(screen.getByLabelText("Sort accounts"), {
    target: { value: "price_desc" },
  });
  for (const matches of [true, false]) {
    // jsdom lacks the native dialog method; browser qualification covers focus.
    const dialog = document.querySelector("dialog");
    if (dialog) dialog.close = vi.fn();
    act(() => {
      media.matches = matches;
      changed();
    });
    expect(screen.getByLabelText("Search accounts")).toHaveValue(
      "Unsaved search",
    );
    expect(screen.getByLabelText("Maximum price (USD)")).toHaveValue("45.67");
    expect(screen.getByLabelText("Sort accounts")).toHaveValue("price_desc");
  }
});
it("keeps game context and rejects ambiguous or rounded price comparisons", () => {
  const apply = vi.fn();
  render(
    <MarketFilters
      params={new URLSearchParams("after=old-cursor")}
      gameSlug="game"
      apply={apply}
      clear={vi.fn()}
    />,
  );
  expect(screen.queryByLabelText("Game")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Maximum price"), {
    target: { value: "12.345" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Apply account filters" }),
  );
  expect(apply).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Maximum price")).toBeInvalid();
  expect(screen.getByLabelText("Maximum price")).toHaveFocus();
  fireEvent.blur(screen.getByLabelText("Maximum price"));
  expect(
    screen.getByText("Enter a positive price with at most two decimal places."),
  ).toBeVisible();
  expect(screen.getByLabelText("Maximum price")).toHaveAccessibleDescription(
    "Optional · up to two decimal places. Enter a positive price with at most two decimal places.",
  );
  fireEvent.change(screen.getByLabelText("Maximum price"), {
    target: { value: "12.34" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Apply account filters" }),
  );
  expect(screen.getByLabelText("Listing currency")).toBeInvalid();
  expect(screen.getByLabelText("Listing currency")).toHaveFocus();
  expect(
    screen.getByText("Enter a listing currency to compare prices."),
  ).toBeVisible();
  expect(apply).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Listing currency"), {
    target: { value: "usd" },
  });
  fireEvent.change(screen.getByLabelText("Sort accounts"), {
    target: { value: "price_asc" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Apply account filters" }),
  );
  expect(apply).toHaveBeenCalledWith({
    slug: "game",
    currency: "USD",
    max_minor: "1234",
    sort: "price_asc",
    search: "",
    region: "",
    rank: "",
  });
});
it("shows a persistent inline currency error even when no price filter was entered", () => {
  const apply = vi.fn();
  render(
    <MarketFilters
      params={new URLSearchParams()}
      gameSlug="game"
      apply={apply}
      clear={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Listing currency"), {
    target: { value: "US" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Apply account filters" }),
  );
  expect(screen.getByLabelText("Listing currency")).toHaveFocus();
  expect(
    screen.getByText("Enter a three-letter listing currency, such as USD."),
  ).toBeVisible();
  expect(apply).not.toHaveBeenCalled();
});
it("loads bounded game choices, retains a selected missing game, and retries without losing choices", async () => {
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
  const apply = vi.fn();
  render(
    <MarketFilters
      params={
        new URLSearchParams(
          "slug=old&currency=EUR&max_minor=100&sort=price_desc",
        )
      }
      apply={apply}
      clear={vi.fn()}
    />,
  );
  expect(screen.getByLabelText("Game")).toHaveValue("old");
  expect(screen.getByLabelText("Maximum price (EUR)")).toHaveValue("1.00");
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
  fireEvent.click(
    screen.getByRole("button", { name: "Apply account filters" }),
  );
  await waitFor(() => {
    expect(apply).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "two",
        max_minor: "100",
        currency: "EUR",
        sort: "price_desc",
      }),
    );
  });
});
