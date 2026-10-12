import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import CustomBoostAction from "./custom-boost-action";
import { emptyConfiguration, type Release } from "./model";
afterEach(() => {
  vi.restoreAllMocks();
});
const service = {
  key: "rank",
  name: "Rank boosting",
  description: "Synthetic rank scope",
  fields: [],
  rules: [],
  evaluator: "manual-review-v1",
};
const release: Release = {
  id: "release",
  game_id: "game",
  slug: "synthetic",
  version: 1,
  paused: false,
  created_at: "2026-10-12T00:00:00Z",
  configuration: {
    ...emptyConfiguration("Synthetic game"),
    services: [service],
  },
};
function mount(path: string, data = release) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CustomBoostAction release={data} />
    </MemoryRouter>,
  );
}
it("opens the single custom form directly from fixed-package discovery", () => {
  mount("/games/synthetic?service=boost&path=packages");
  expect(
    screen.getByRole("link", { name: "Configure custom boost" }),
  ).toHaveAttribute("href", "/games/synthetic/services/rank");
});
it.each([
  "/games/synthetic",
  "/games/synthetic/news",
  "/games/synthetic/accounts",
  "/games/synthetic/shop",
  "/games/synthetic/services/rank",
  "/games/synthetic/services/rank?step=review",
])("omits a competing action on %s", (path) => {
  mount(path);
  expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
});
it("does not offer custom ordering when the game is paused or has no forms", () => {
  const view = mount("/games/synthetic?service=boost", {
    ...release,
    paused: true,
  });
  expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  view.unmount();
  mount("/games/synthetic?service=boost", {
    ...release,
    configuration: { ...release.configuration, services: [] },
  });
  expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
});
it("provides a named chooser and returns keyboard focus when dismissed", async () => {
  mount("/games/synthetic/packages/fixed", {
    ...release,
    configuration: {
      ...release.configuration,
      services: [service, { ...service, key: "coaching", name: "Coaching" }],
    },
  });
  const trigger = screen.getByRole("button", {
    name: "Configure custom boost",
  });
  fireEvent.click(trigger);
  await waitFor(() => {
    expect(screen.getByRole("link", { name: "Rank boosting" })).toHaveFocus();
  });
  expect(screen.getByRole("link", { name: "Coaching" })).toHaveAttribute(
    "href",
    "/games/synthetic/services/coaching",
  );
  fireEvent.keyDown(screen.getByRole("link", { name: "Coaching" }), {
    key: "Escape",
  });
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute("aria-expanded", "false");
});
it("moves enlarged choices into page flow when a complete action cannot fit below the header", async () => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      return DOMRect.fromRect({
        y: this.classList.contains("custom-boost-choices") ? 680 : 0,
        width: 280,
        height: 180,
      });
    },
  );
  mount("/games/synthetic?service=boost", {
    ...release,
    configuration: {
      ...release.configuration,
      services: [service, { ...service, key: "coaching", name: "Coaching" }],
    },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Configure custom boost" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("complementary")).toHaveAttribute(
      "data-choices-flow",
      "true",
    ),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Close service choices" }),
  );
  expect(screen.getByRole("complementary")).toHaveAttribute(
    "data-choices-flow",
    "false",
  );
  expect(
    screen.getByRole("button", { name: "Configure custom boost" }),
  ).toHaveFocus();
});
