import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
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
  },
};
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useLoaderData: () => release,
}));
it("keeps paused, empty offerings navigable and compacts broken hero artwork", () => {
  render(
    <MemoryRouter initialEntries={["/games/game?path=packages"]}>
      <GamePage />
    </MemoryRouter>,
  );
  expect(screen.getByText("Ordering is paused for this game.")).toBeVisible();
  expect(
    screen.getByText("No fixed packages are published yet."),
  ).toBeVisible();
  fireEvent.error(screen.getByRole("img"));
  expect(document.querySelector(".game-hero-compact")).not.toBeNull();
  expect(document.querySelector(".game-hero-art")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Custom boosting" }));
  expect(
    screen.getByText("No custom boosting services are published yet."),
  ).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Fixed packages" })).toBeNull();
  expect(screen.getByRole("link", { name: "← All games" })).toHaveAttribute(
    "href",
    "/games?path=custom",
  );
});
it("ignores unknown offering paths without constructing destinations from arbitrary input", () => {
  expect(offeringPath(new URLSearchParams("path=unknown"))).toBe("all");
  expect(offeringPath(new URLSearchParams("path=https://example.test"))).toBe(
    "all",
  );
});
