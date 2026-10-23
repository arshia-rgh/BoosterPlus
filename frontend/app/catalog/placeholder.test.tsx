import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, it, vi } from "vitest";
import { GamePage } from "./public";
import { GameDiscovery } from "./game-discovery";
import { emptyConfiguration, type Release } from "./model";
import { isPlaceholderGame } from "./placeholder";
const resource = vi.hoisted(() => vi.fn());
vi.mock("../orders/resource", () => ({ useResource: resource }));
const release: Release = {
  id: "release",
  game_id: "game",
  slug: "future",
  version: 1,
  paused: false,
  created_at: "2026-10-23T00:00:00Z",
  configuration: {
    ...emptyConfiguration("Future game"),
    reviewed: true,
    discovery: {
      capabilities: (["boost", "accounts", "shop", "news"] as const).map(
        (service) => ({ service, state: "off", description: "", reason: "" }),
      ),
      promotions: [],
    },
  },
};
it("shows an honest empty game page without discovery requests or purchase links", async () => {
  function Page() {
    return (
      <GameDiscovery release={release} selected={null}>
        <GamePage />
      </GameDiscovery>
    );
  }
  const router = createMemoryRouter(
    [{ path: "/games/future", loader: () => release, Component: Page }],
    { initialEntries: ["/games/future"] },
  );
  render(<RouterProvider router={router} />);
  expect(
    await screen.findByRole("heading", {
      name: "Services are not available yet",
    }),
  ).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Browse all games" }),
  ).toHaveAttribute("href", "/games");
  expect(screen.queryByText("Choose a service")).toBeNull();
  expect(screen.queryByText("Read customer reviews")).toBeNull();
  expect(resource).not.toHaveBeenCalled();
});
it("limits the quiet placeholder presentation to empty explicit all-off catalogs", () => {
  expect(isPlaceholderGame(release)).toBe(true);
  expect(isPlaceholderGame({ ...release, paused: true })).toBe(false);
  expect(
    isPlaceholderGame({
      ...release,
      configuration: { ...release.configuration, discovery: undefined },
    }),
  ).toBe(false);
  expect(
    isPlaceholderGame({
      ...release,
      configuration: {
        ...release.configuration,
        discovery: {
          ...release.configuration.discovery,
          capabilities: [
            { service: "boost", state: "off", description: "", reason: "" },
          ],
        },
      },
    }),
  ).toBe(false);
  for (const service of ["boost", "accounts", "shop", "news"] as const) {
    const c = structuredClone(release);
    const capability = c.configuration.discovery?.capabilities.find(
      (p) => p.service === service,
    );
    if (!capability) throw new Error("Missing fixture capability");
    capability.state = "active";
    expect(isPlaceholderGame(c)).toBe(false);
  }
});
