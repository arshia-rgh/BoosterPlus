import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Surface from "./surface";
import { setMotionPreference } from "../home/motion";
beforeEach(() => {
  localStorage.clear();
  setMotionPreference(false);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("cancels decorative motion immediately when reduced motion is selected", () => {
  const cancel = vi.fn(),
    animate = vi.fn(() => ({ cancel }));
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    value: animate,
  });
  const view = render(
    <MemoryRouter>
      <Surface kind="browse">
        <h1>Always visible</h1>
      </Surface>
    </MemoryRouter>,
  );
  expect(animate).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Reduced" }));
  expect(cancel).toHaveBeenCalledOnce();
  expect(view.container.firstChild).toHaveAttribute("data-motion", "reduced");
  expect(screen.getByRole("heading")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "System" }));
  expect(animate).toHaveBeenCalledTimes(2);
  view.unmount();
  expect(cancel).toHaveBeenCalledTimes(2);
});
it("leaves usable content when the browser rejects animation", () => {
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    value: () => {
      throw new Error("Unsupported");
    },
  });
  render(
    <MemoryRouter>
      <Surface kind="workspace">
        <button type="button">Continue</button>
      </Surface>
    </MemoryRouter>,
  );
  expect(screen.getByRole("button", { name: "Continue" })).toBeVisible();
});
