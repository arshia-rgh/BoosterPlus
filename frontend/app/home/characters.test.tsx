import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import CharacterShowcase, {
  CharacterArt,
  viewportProgress,
} from "./characters";
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
it("clamps native viewport progress including abrupt reverse jumps", () => {
  expect(viewportProgress(1000, 500, 1000)).toBe(0);
  expect(viewportProgress(250, 500, 1000)).toBe(0.5);
  expect(viewportProgress(-500, 500, 1000)).toBe(1);
  expect(viewportProgress(-10000, 500, 1000)).toBe(1);
  expect(viewportProgress(10000, 500, 1000)).toBe(0);
});
it("offers different game characters without inventing purchasable services", async () => {
  render(
    <MemoryRouter>
      <CharacterShowcase enabled={false} />
    </MemoryRouter>,
  );
  expect(screen.getAllByRole("heading")).toHaveLength(1);
  expect(screen.getByRole("group", { name: "Game showcase" })).toBeVisible();
  for (const [game, key] of [
    ["Mobile Legends", "miya"],
    ["World of Warcraft", "illidan"],
    ["League of Legends", "ahri"],
  ] as const) {
    const button = screen.getByRole("button", { name: game });
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(document.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
    await waitFor(() => {
      expect(
        document.querySelector(".world-stage > .character-art"),
      ).toHaveAttribute("data-character", key);
    });
  }
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
