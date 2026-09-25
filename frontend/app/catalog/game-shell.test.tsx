import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, Link, Outlet, RouterProvider } from "react-router";
import { beforeAll, afterAll, expect, it, vi } from "vitest";
import { GameShell, GameContentError, GameUnavailable } from "./game-shell";
import { emptyConfiguration, type Release } from "./model";
vi.mock("../orders/favorites", () => ({ FavoriteButton: () => null }));
const release: Release = {
  id: "r",
  game_id: "g",
  slug: "example",
  version: 1,
  paused: true,
  created_at: "2026-09-25T00:00:00Z",
  configuration: {
    ...emptyConfiguration("Example game"),
    asset: "/game.png",
    asset_alt: "Example game artwork",
    description: "Your published game introduction.",
  },
};
it("keeps the game identity mounted through nested navigation and image failure", async () => {
  const router = createMemoryRouter(
    [
      {
        path: "/games/:slug",
        element: (
          <GameShell release={release}>
            <Outlet />
          </GameShell>
        ),
        children: [
          {
            index: true,
            element: <Link to="services/boost">Configure boost</Link>,
          },
          {
            path: "services/:service",
            element: (
              <>
                <h2>Configure your goal</h2>
                <Link to="/games/example?path=custom">Back to custom</Link>
              </>
            ),
          },
        ],
      },
    ],
    { initialEntries: ["/games/example?path=custom"] },
  );
  render(<RouterProvider router={router} />);
  const heading = screen.getByRole("heading", {
    level: 1,
    name: "Example game",
  });
  fireEvent.click(screen.getByRole("link", { name: "Configure boost" }));
  await screen.findByRole("heading", { name: "Configure your goal" });
  expect(screen.getByRole("heading", { level: 1 })).toBe(heading);
  expect(screen.getByText("Your published game introduction.")).toBeVisible();
  expect(screen.getByRole("link", { name: "← All games" })).toHaveAttribute(
    "href",
    "/games?path=custom",
  );
  fireEvent.error(screen.getByAltText("Example game artwork"));
  expect(document.querySelector(".game-stage-compact")).toBeVisible();
  expect(screen.getByText("Ordering is paused for this game.")).toBeVisible();
  fireEvent.click(screen.getByRole("link", { name: "Back to custom" }));
  await screen.findByRole("link", { name: "Configure boost" });
  expect(screen.getByRole("heading", { level: 1 })).toBe(heading);
});
it.each([404, 503])(
  "retains game context when a child section fails (%s)",
  async (status) => {
    const router = createMemoryRouter(
      [
        {
          path: "/games/:slug",
          element: (
            <GameShell release={release}>
              <Outlet />
            </GameShell>
          ),
          children: [
            {
              path: "services/:service",
              loader: () => {
                // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router consumes thrown Responses as loader HTTP errors.
                throw new Response(null, { status });
              },
              errorElement: <GameContentError />,
            },
          ],
        },
      ],
      { initialEntries: ["/games/example/services/missing"] },
    );
    render(<RouterProvider router={router} />);
    await screen.findByRole("heading", {
      name:
        status === 404
          ? "This option is unavailable"
          : "This section could not load",
    });
    expect(
      screen.getByRole("heading", { level: 1, name: "Example game" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Back to game services" }),
    ).toHaveAttribute("href", "/games/example");
  },
);
it.each([404, 503])(
  "offers a bounded recovery if the game itself fails (%s)",
  async (status) => {
    const router = createMemoryRouter(
      [
        {
          path: "/games/:slug",
          loader: () => {
            // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router consumes thrown Responses as loader HTTP errors.
            throw new Response(null, { status });
          },
          errorElement: <GameUnavailable />,
        },
      ],
      { initialEntries: ["/games/example"] },
    );
    render(<RouterProvider router={router} />);
    await screen.findByRole("heading", {
      name: status === 404 ? "Game unavailable" : "We couldn't load this game",
    });
    expect(
      screen.getByRole("link", { name: "Choose another game" }),
    ).toHaveAttribute("href", "/games");
  },
);

vi.mock("../ui/motion", () => ({ useMotionPreference: () => "reduced" }));
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    value: vi.fn(),
    configurable: true,
  });
});
afterAll(() => {
  Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

it("retries a failed child without losing game identity and focuses the recovered section", async () => {
  let attempts = 0;
  const router = createMemoryRouter(
    [
      {
        path: "/games/:slug",
        element: (
          <GameShell release={release}>
            <Outlet />
          </GameShell>
        ),
        children: [
          {
            path: "reviews",
            loader: () => {
              if (attempts++ === 0) {
                // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router consumes thrown Responses as loader HTTP errors.
                throw new Response(null, { status: 503 });
              }
              return null;
            },
            element: <h2>Game reviews</h2>,
            errorElement: <GameContentError />,
          },
        ],
      },
    ],
    { initialEntries: ["/games/example/reviews"] },
  );
  render(<RouterProvider router={router} />);
  const retry = await screen.findByRole("button", {
    name: "Retry this section",
  });
  const identity = screen.getByRole("heading", { level: 1 });
  fireEvent.click(retry);
  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Game reviews" })).toHaveFocus();
  });
  expect(screen.getByRole("heading", { level: 1 })).toBe(identity);
  expect(document.querySelector(".game-shell")).toHaveAttribute(
    "data-motion",
    "reduced",
  );
});

it("collapses an SSR image that already failed before hydration", () => {
  const complete = vi
    .spyOn(HTMLImageElement.prototype, "complete", "get")
    .mockReturnValue(true);
  try {
    const router = createMemoryRouter(
      [
        {
          path: "/games/:slug",
          element: (
            <GameShell release={release}>
              <h2>Available services</h2>
            </GameShell>
          ),
        },
      ],
      { initialEntries: ["/games/example"] },
    );
    render(<RouterProvider router={router} />);
    expect(document.querySelector(".game-stage-compact")).toBeVisible();
    expect(
      screen.queryByAltText("Example game artwork"),
    ).not.toBeInTheDocument();
    expect(document.querySelector(".game-backdrop")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Example game",
    );
  } finally {
    complete.mockRestore();
  }
});
