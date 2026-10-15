import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { AmbientBackdrop, SiteFooter, SiteHeader } from "./site-chrome";

afterEach(() => vi.unstubAllGlobals());
function show(path: string) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AmbientBackdrop />
      <SiteHeader />
      <SiteFooter />
    </MemoryRouter>,
  );
}
it("keeps service discovery out of global navigation and provides functional help without motion controls", () => {
  const ui = show("/games/mobile-legends");
  const nav = screen.getByRole("navigation", { name: "Main navigation" });
  expect(
    within(nav)
      .getAllByRole("link")
      .map((el) => el.textContent),
  ).toEqual(["Support", "My account"]);
  expect(
    screen.getByRole("link", { name: "Contact us & support" }),
  ).toHaveAttribute("href", "/contact");
  expect(
    screen.queryByRole("group", { name: "Background motion" }),
  ).not.toBeInTheDocument();
  expect(ui.container.querySelector(".site-ambient")).toHaveAttribute(
    "data-motion",
    "full",
  );
});
it("keeps staff footer destinations within the admin workspace", () => {
  show("/admin/orders");
  const nav = screen.getByRole("navigation", { name: "Help and policies" });
  expect(
    within(nav).getByRole("link", { name: "Support inbox" }),
  ).toHaveAttribute("href", "/admin/support");
  expect(
    within(nav).getByRole("link", { name: "Content & policies" }),
  ).toHaveAttribute("href", "/admin/content");
  expect(
    screen.queryByRole("navigation", { name: "Team access" }),
  ).not.toBeInTheDocument();
});
it("names the booster workspace and its existing assignment entry", () => {
  show("/booster/orders");
  expect(
    screen.getByRole("link", { name: "PLAYORA booster workspace" }),
  ).toHaveAttribute("href", "/booster");
  expect(
    screen.getByRole("link", { name: "Assignment conversations" }),
  ).toHaveAttribute("href", "/booster/orders");
});

it.each(["/login", "/admin/login", "/booster/login", "/login/"])(
  "keeps %s focused on its navbar and login scene",
  (path) => {
    const ui = show(path);
    expect(screen.getByRole("banner")).toBeVisible();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
    expect(ui.container.querySelector(".site-ambient")).toBeNull();
  },
);
