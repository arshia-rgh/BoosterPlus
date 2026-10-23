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
  const last = screen.getByRole("tab", { name: /Crypto payment/ });
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

it("keeps the requested service order and a responsive scene for every selection", () => {
  const { container } = render(
    <ServiceExplorer content={defaultHome} chooseGame={vi.fn()} />,
  );
  const names = [
    "Boost services",
    "Accounts",
    "In-game shops",
    "News and guides",
    "Crypto payment",
  ];
  const kinds = ["boost", "accounts", "shop", "news", "payment"];
  const tabs = screen.getAllByRole("tab");
  expect(tabs.map((tab) => tab.textContent)).toEqual(
    names.map((name, i) => `0${String(i + 1)}${name}`),
  );
  for (const [i, tab] of tabs.entries()) {
    fireEvent.click(tab);
    const image =
      container.querySelector<HTMLImageElement>(".service-scene img");
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveAttribute(
      "src",
      `/artwork/service-scenes/${kinds.at(i) ?? "boost"}-v1-800.webp`,
    );
    expect(image).toHaveAttribute("width", "1200");
    expect(image).toHaveAttribute("height", "750");
    expect(image?.getAttribute("srcset")).toContain("480w");
    expect(container.querySelectorAll(".service-scene")).toHaveLength(1);
  }
});

it("reserves the artwork frame through loading and failure without blocking navigation", () => {
  const { container } = render(
    <ServiceExplorer content={defaultHome} chooseGame={vi.fn()} />,
  );
  const image = container.querySelector(".service-scene img");
  if (!image) throw new Error("Missing selected service artwork");
  expect(container.querySelector(".service-scene")).toHaveAttribute(
    "data-image-state",
    "loading",
  );
  fireEvent.load(image);
  expect(container.querySelector(".service-scene")).toHaveAttribute(
    "data-image-state",
    "ready",
  );
  fireEvent.error(image);
  expect(container.querySelector(".service-scene")).toHaveAttribute(
    "data-image-state",
    "failed",
  );
  fireEvent.click(screen.getByRole("button", { name: "Next service" }));
  expect(screen.getByRole("tab", { name: /Accounts/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(container.querySelector(".service-scene")).toHaveAttribute(
    "data-image-state",
    "loading",
  );
});
