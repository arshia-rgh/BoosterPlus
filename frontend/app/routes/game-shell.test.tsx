import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, it, vi } from "vitest";
import GameRouteShell, { loader } from "./game-shell";
import { loadGame } from "../catalog/loaders.server";
import { emptyConfiguration } from "../catalog/model";
vi.mock("../catalog/loaders.server", () => ({ loadGame: vi.fn() }));
vi.mock("../orders/favorites", () => ({ FavoriteButton: () => null }));
vi.mock("../ui/motion", () => ({ useMotionPreference: () => "reduced" }));
it("loads the published game and renders its child inside the shared identity", async () => {
  vi.mocked(loadGame).mockResolvedValue({
    id: "release",
    game_id: "game",
    slug: "example",
    version: 1,
    paused: false,
    created_at: "2026-09-25T00:00:00Z",
    configuration: emptyConfiguration("Example game"),
  });
  const router = createMemoryRouter(
    [
      {
        path: "/games/:slug",
        loader,
        element: <GameRouteShell />,
        children: [{ index: true, element: <h2>Available services</h2> }],
      },
    ],
    { initialEntries: ["/games/example"] },
  );
  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { name: "Example game", level: 1 });
  expect(loadGame).toHaveBeenCalledWith("example");
  expect(
    screen.getByRole("heading", { name: "Available services" }),
  ).toBeVisible();
});
