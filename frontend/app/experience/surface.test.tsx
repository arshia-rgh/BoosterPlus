import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Surface from "./surface";
let reduced = false;
const changes = new Set<() => void>();
beforeEach(() => {
  localStorage.clear();
  reduced = false;
  changes.clear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: reduced,
      addEventListener: (_: string, notify: () => void) => {
        changes.add(notify);
      },
      removeEventListener: (_: string, notify: () => void) => {
        changes.delete(notify);
      },
    })),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("cancels decorative motion immediately when the device requests reduced motion", () => {
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
  reduced = true;
  act(() => {
    for (const notify of changes) notify();
  });
  expect(cancel).toHaveBeenCalledOnce();
  expect(view.container.firstChild).toHaveAttribute("data-motion", "reduced");
  expect(screen.getByRole("heading")).toBeVisible();
  reduced = false;
  act(() => {
    for (const notify of changes) notify();
  });
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
