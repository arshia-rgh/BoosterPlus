import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { command, post } from "../identity/api";
import { useResource } from "./resource";
import Favorites, { FavoriteButton } from "./favorites";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
  command: vi.fn(),
}));
vi.mock("./resource", () => ({ useResource: vi.fn() }));
afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});
it("moves from the disabled save action to the saved destination", async () => {
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  vi.mocked(post).mockResolvedValue({});
  render(
    <MemoryRouter>
      <FavoriteButton kind="game" slug="synthetic" />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Save to favorites" }));
  const link = await screen.findByRole("link", { name: "View favorites" });
  await waitFor(() => expect(link).toHaveFocus());
  expect(
    screen.getByRole("button", { name: "Saved to favorites" }),
  ).toBeDisabled();
});
it("focuses the local failed-save notice and leaves retry available", async () => {
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  vi.mocked(post).mockRejectedValue(new Error("Unavailable"));
  render(
    <MemoryRouter>
      <FavoriteButton kind="game" slug="synthetic" />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Save to favorites" }));
  await screen.findByRole("alert");
  await waitFor(() =>
    expect(
      screen.getByRole("group", { name: "Favorite could not be saved" }),
    ).toHaveFocus(),
  );
  expect(
    screen.getByRole("button", { name: "Save to favorites" }),
  ).toBeEnabled();
});
it("keeps keyboard context after removing a saved row", async () => {
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  vi.mocked(command).mockResolvedValue(undefined);
  const reload = vi.fn();
  vi.mocked(useResource).mockReturnValue({
    data: {
      favorites: [
        {
          id: "synthetic",
          kind: "game",
          slug: "synthetic",
          service: "",
          package: "",
          name: "Synthetic game",
          available: true,
        },
      ],
      next: "",
    },
    loading: false,
    error: null,
    reload,
  });
  render(
    <MemoryRouter>
      <Favorites />
    </MemoryRouter>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Remove Synthetic game" }),
  );
  await waitFor(() => {
    expect(reload).toHaveBeenCalledOnce();
  });
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "Your saved offers" }),
    ).toHaveFocus(),
  );
});
