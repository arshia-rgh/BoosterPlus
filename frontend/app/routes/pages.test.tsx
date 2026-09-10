import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import Home, { meta as homeMeta } from "./home";
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
    expect(
      screen.getByText(/launch preview · live checkout is being prepared/i),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /buy|pay/i }),
    ).not.toBeInTheDocument();
    expect(homeMeta()[0]).toEqual({
      title: "Booster Plus — Game boosting & accounts",
    });
  });
  it("shows an unavailable catalog without invented prices", () => {
    render(<Games />);
    expect(
      screen.getByRole("heading", { name: "Mobile Legends" }),
    ).toBeVisible();
    expect(screen.getByText("Coming soon")).toBeVisible();
    expect(gamesMeta()[0]).toEqual({ title: "Games — Booster Plus" });
  });
});

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useLoaderData: () => ({ games: [], next: "" }),
}));
