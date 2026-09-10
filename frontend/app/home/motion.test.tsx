import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "./page";
import { sceneProgress, setMotionPreference, useRankScene } from "./motion";

let reduced = false;
let mediaChange: (() => void) | undefined;
beforeEach(() => {
  reduced = false;
  localStorage.clear();
  setMotionPreference(false);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: reduced,
      addEventListener: (_: string, callback: () => void) => {
        mediaChange = callback;
      },
      removeEventListener: vi.fn(),
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
  it("persists reduced motion and still honors OS reduction in system mode", () => {
    renderHome();
    expect(screen.getByRole("main")).toHaveAttribute("data-motion", "full");
    fireEvent.click(screen.getByRole("button", { name: "Reduced" }));
    expect(localStorage.getItem("boosterplus.motion")).toBe("reduced");
    expect(screen.getByRole("main")).toHaveAttribute("data-motion", "reduced");
    reduced = true;
    fireEvent.click(screen.getByRole("button", { name: "System" }));
    expect(screen.getByRole("main")).toHaveAttribute("data-motion", "reduced");
    reduced = false;
    act(() => {
      mediaChange?.();
    });
    expect(screen.getByRole("main")).toHaveAttribute("data-motion", "full");
  });
  it("keeps preferences usable when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Blocked");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("Blocked");
    });
    setMotionPreference(false);
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Reduced" }));
    expect(screen.getByRole("main")).toHaveAttribute("data-motion", "reduced");
    fireEvent.click(screen.getByRole("button", { name: "System" }));
    expect(screen.getByRole("main")).toHaveAttribute("data-motion", "full");
  });
  it("uses the selected preference when only storage writes fail", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Reduced" }));
    expect(screen.getByRole("main")).toHaveAttribute("data-motion", "reduced");
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
  it("retains static profiles if the animation API fails", () => {
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      value: vi.fn(() => {
        throw new Error("Unavailable");
      }),
    });
    const { container } = renderHome();
    expect(container.querySelector(".rank-journey")).not.toHaveAttribute(
      "data-enhanced",
    );
    expect(
      screen.getByRole("link", { name: /find your boost/i }),
    ).toHaveAttribute("href", "/games");
    Reflect.deleteProperty(Element.prototype, "animate");
  });
});
