import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { defaultHome } from "../site/content";
import { ServiceExplorer } from "./service-explorer";

it("keeps all services available while exposing only the selected content and action", () => {
  const choose = vi.fn();
  render(<ServiceExplorer content={defaultHome} chooseGame={choose} />);
  expect(screen.getAllByRole("tab")).toHaveLength(5);
  expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
  const first = screen.getByRole("tab", { name: /Boost services/ });
  expect(first).toHaveAttribute("aria-selected", "true");
  fireEvent.keyDown(first, { key: "End" });
  const last = screen.getByRole("tab", { name: /News and guides/ });
  expect(last).toHaveFocus();
  expect(last).toHaveAttribute("aria-selected", "true");
  expect(
    screen.getAllByRole("link", { name: /Choose your game/ }),
  ).toHaveLength(1);
  fireEvent.click(screen.getByRole("link", { name: /Choose your game/ }));
  expect(choose).toHaveBeenCalledOnce();
  fireEvent.keyDown(last, { key: "ArrowRight" });
  expect(first).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Next service" }));
  expect(screen.getByRole("tab", { name: /Accounts/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  fireEvent.click(screen.getByRole("button", { name: "Previous service" }));
  expect(first).toHaveAttribute("aria-selected", "true");
});
