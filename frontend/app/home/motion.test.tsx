import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteFooter } from "../ui/site-chrome";
import { HomePage } from "./page";
import { sceneProgress, useRankScene } from "./motion";

let reduced = false;
const mediaChanges = new Set<() => void>();
beforeEach(() => {
  reduced = false;
  mediaChanges.clear();
  localStorage.clear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: reduced,
      addEventListener: (_: string, callback: () => void) => {
        mediaChanges.add(callback);
      },
      removeEventListener: (_: string, callback: () => void) => {
        mediaChanges.delete(callback);
      },
    })),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
      <SiteFooter />
    </MemoryRouter>,
  );
}
describe("accessible homepage motion", () => {
  it("clamps overscroll and handles an unscrollable scene", () => {
    expect(sceneProgress(100, 1500, 500)).toBe(0);
    expect(sceneProgress(-500, 1500, 500)).toBe(0.5);
    expect(sceneProgress(-2000, 1500, 500)).toBe(1);
    expect(sceneProgress(0, 500, 500)).toBe(0);
  });
  it("follows device changes and ignores obsolete stored website overrides", () => {
    localStorage.setItem("boosterplus.motion", "reduced");
    renderHome();
    expect(screen.getByRole("main")).toHaveAttribute("data-motion", "full");
    expect(
      screen.queryByRole("button", { name: /background motion/i }),
    ).not.toBeInTheDocument();
    reduced = true;
    act(() => {
      for (const notify of mediaChanges) notify();
    });
    expect(screen.getByRole("main")).toHaveAttribute("data-motion", "reduced");
    reduced = false;
    act(() => {
      for (const notify of mediaChanges) notify();
    });
    expect(screen.getByRole("main")).toHaveAttribute("data-motion", "full");
  });
  it("honors device reduction without using browser storage", () => {
    const read = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("Blocked");
      });
    reduced = true;
    renderHome();
    expect(screen.getByRole("main")).toHaveAttribute("data-motion", "reduced");
    expect(read).not.toHaveBeenCalled();
  });
  it("cancels paused animations and removes scroll observers on unmount", () => {
    const cancel = vi.fn();
    const animate = vi.fn(() => ({ pause: vi.fn(), cancel, currentTime: 0 }));
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      value: animate,
    });
    const remove = vi.spyOn(window, "removeEventListener");
    function Scene() {
      const ref = useRankScene(true);
      return (
        <section ref={ref}>
          <div className="rank-start" />
          <div className="rank-finish" />
          <div className="profile-stage" />
          <div className="rank-orbit" />
          <div className="journey-fill" />
        </section>
      );
    }
    const { container, unmount } = render(<Scene />);
    expect(container.querySelector("section")).toHaveAttribute(
      "data-enhanced",
      "true",
    );
    expect(animate).toHaveBeenCalledTimes(5);
    unmount();
    expect(cancel).toHaveBeenCalledTimes(5);
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
    Reflect.deleteProperty(Element.prototype, "animate");
  });
  it("retains visible service navigation if the animation API fails", () => {
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      value: vi.fn(() => {
        throw new Error("Unavailable");
      }),
    });
    const { container } = renderHome();
    expect(container.querySelector(".rank-journey")).toBeNull();
    expect(
      screen.getAllByRole("link", { name: /Choose your game/i })[0],
    ).toHaveAttribute("href", "#game-selection");
    Reflect.deleteProperty(Element.prototype, "animate");
  });
});
