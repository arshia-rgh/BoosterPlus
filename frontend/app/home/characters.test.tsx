import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import CharacterShowcase, {
  CharacterArt,
  viewportProgress,
} from "./characters";
it("clamps native viewport progress including abrupt reverse jumps", () => {
  expect(viewportProgress(1000, 500, 1000)).toBe(0);
  expect(viewportProgress(250, 500, 1000)).toBe(0.5);
  expect(viewportProgress(-500, 500, 1000)).toBe(1);
  expect(viewportProgress(-10000, 500, 1000)).toBe(1);
  expect(viewportProgress(10000, 500, 1000)).toBe(0);
});
it("offers different game characters without inventing purchasable services", () => {
  render(
    <MemoryRouter>
      <CharacterShowcase enabled={false} />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("heading", { name: "Iori Yagami · Chou" }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "World of Warcraft" }));
  expect(
    screen.getByRole("heading", { name: "Illidan Stormrage" }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "League of Legends" }));
  expect(screen.getByRole("heading", { name: "Ahri" })).toBeVisible();
  expect(screen.getAllByRole("link")).toHaveLength(1);
  expect(screen.getByRole("link")).toHaveAttribute("href", "/games");
});
it("missing image and missing observer retain a static safe decoration", () => {
  const view = render(<CharacterArt character="iori" enabled />);
  const asset = view.container.querySelector("image");
  if (!asset) throw new Error("Missing poster");
  expect(view.container.querySelector("[data-active=true]")).toBeNull();
  fireEvent.error(asset);
  expect(view.container.querySelector("svg")).toBeNull();
  expect(view.container.querySelector(".character-fallback")).not.toBeNull();
});
