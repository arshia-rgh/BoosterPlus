import { render, screen } from "@testing-library/react";
import { MemoryRouter, createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import Home, { meta as homeMeta, loader as homeLoader } from "./home";
import Games, { meta as gamesMeta } from "./games";

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("prelaunch catalog", () => {
  it("provides a real game navigation link without offering unavailable checkout", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("link", { name: /explore games/i }),
    ).toHaveAttribute("href", "/games");
    expect(screen.getByText(/Review the scope and terms/i)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /buy|pay/i }),
    ).not.toBeInTheDocument();
    expect(homeMeta()[0]).toEqual({
      title: "PLAYORA — Game boosting & accounts",
    });
  });
  it("shows an unavailable catalog without invented prices", () => {
    render(
      <RouterProvider
        router={createMemoryRouter([{ path: "/games", element: <Games /> }], {
          initialEntries: ["/games"],
        })}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Mobile Legends" }),
    ).toBeVisible();
    expect(screen.getByText("Coming soon")).toBeVisible();
    expect(gamesMeta()[0]).toEqual({ title: "Games — PLAYORA" });
  });
});

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useLoaderData: () => ({ games: [], next: "" }),
}));

it("loads published homepage content through the server boundary", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          kind: "home",
          version: 0,
          release_id: "",
          label: "",
          data: {},
          updated_at: "2026-01-01T00:00:00Z",
        }),
      ),
    ),
  );
  expect((await homeLoader()).start_rank).toBe("Warrior");
});

it("renders homepage share metadata only with configured public origin", async () => {
  vi.stubEnv("PUBLIC_SITE_ORIGIN", "https://playora.example");
  try {
    expect(homeMeta({ data: await homeLoader() })).toContainEqual({
      property: "og:url",
      content: "https://playora.example/",
    });
  } finally {
    vi.unstubAllEnvs();
  }
});
