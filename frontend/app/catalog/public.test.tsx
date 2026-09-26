import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeAll, afterAll, expect, it, vi } from "vitest";
import { GameShell } from "./game-shell";
import { GamePage, offeringPath } from "./public";
import { emptyConfiguration, type Release } from "./model";
const release: Release = {
  id: "r",
  game_id: "g",
  slug: "game",
  version: 1,
  paused: true,
  created_at: "2026-09-14T00:00:00Z",
  configuration: {
    ...emptyConfiguration("A game with a long descriptive title"),
    asset: "/failed-art.png",
    asset_alt: "Example game artwork",
  },
};
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useLoaderData: () => release,
}));
it("blocks paused service entry and preserves game identity after failed artwork", () => {
  render(
    <MemoryRouter initialEntries={["/games/game?path=packages"]}>
      <GameShell release={release}>
        <GamePage />
      </GameShell>
    </MemoryRouter>,
  );
  expect(screen.getByText("Ordering is paused for this game.")).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Boosting is currently unavailable" }),
  ).toBeVisible();
  expect(screen.queryByRole("link", { name: /Configure/ })).toBeNull();
  fireEvent.error(screen.getByRole("img"));
  expect(document.querySelector(".game-stage-compact")).not.toBeNull();
  fireEvent.click(
    screen.getByRole("link", { name: "← Back to choose a service" }),
  );
  expect(
    screen.getByRole("heading", { name: "Choose a service" }),
  ).toBeVisible();
  expect(screen.getByRole("link", { name: "← All games" })).toHaveAttribute(
    "href",
    "/games",
  );
});
it("ignores unknown offering paths without constructing destinations from arbitrary input", () => {
  expect(offeringPath(new URLSearchParams("path=unknown"))).toBe("all");
  expect(offeringPath(new URLSearchParams("path=https://example.test"))).toBe(
    "all",
  );
});

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
