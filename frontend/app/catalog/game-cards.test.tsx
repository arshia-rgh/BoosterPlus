import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import GameCards from "./game-cards";
import type { Listing } from "./model";

type Game = Listing["games"][number];
function game(name: string, capabilities: Game["capabilities"] = []): Game {
  return {
    id: name,
    slug: name.toLowerCase(),
    name,
    description: "",
    asset: "",
    asset_alt: "",
    published: true,
    paused: false,
    archived: false,
    revision: 1,
    capabilities,
  };
}
const activeBoost = {
  service: "boost" as const,
  state: "active" as const,
  description: "",
  reason: "",
};
const activeNews = { ...activeBoost, service: "news" as const };

it("puts all available games first, preserving order within groups and input data", () => {
  const games = [
    game("Placeholder"),
    { ...game("Paused", [activeBoost]), paused: true },
    game("NewsOnly", [activeNews]),
    game("PausedService", [{ ...activeBoost, state: "paused" }]),
    game("MobileLegends", [activeBoost, activeNews]),
  ];
  const original = [...games];
  render(
    <MemoryRouter>
      <GameCards games={games} headingLevel={2} intent="?path=custom" />
    </MemoryRouter>,
  );
  expect(
    screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
  ).toEqual([
    "NewsOnly",
    "MobileLegends",
    "Placeholder",
    "Paused",
    "PausedService",
  ]);
  expect(games).toEqual(original);
  expect(screen.getAllByRole("link")).toHaveLength(2);
  expect(screen.getByRole("link", { name: /NewsOnly/ })).toHaveAttribute(
    "href",
    "/games/newsonly?path=custom",
  );
  expect(screen.getAllByText("Services currently unavailable")).toHaveLength(3);
});

it("shows all four offered service labels, including News", () => {
  const services = ["boost", "accounts", "shop", "news"] as const;
  render(
    <MemoryRouter>
      <GameCards
        games={[
          game(
            "Mobile Legends",
            services.map((service) => ({ ...activeBoost, service })),
          ),
        ]}
      />
    </MemoryRouter>,
  );
  const card = screen.getByRole("link");
  for (const label of ["Boosting", "Accounts", "Shop", "News"])
    expect(within(card).getByText(label, { exact: true })).toBeVisible();
});

it("keeps off services hidden and news-only paused cards noninteractive", () => {
  render(
    <MemoryRouter>
      <GameCards
        games={[
          game("News paused", [
            { ...activeBoost, state: "off" },
            { ...activeNews, state: "paused" },
          ]),
        ]}
      />
    </MemoryRouter>,
  );
  expect(screen.getByText("News · paused")).toBeVisible();
  expect(screen.queryByText("Boosting")).not.toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

it("preserves legacy capability fallback and reacts to changed availability", () => {
  const legacy = game("Legacy");
  delete legacy.capabilities;
  const next = game("Next", [activeNews]);
  const view = render(
    <MemoryRouter>
      <GameCards games={[game("Off"), legacy, next]} />
    </MemoryRouter>,
  );
  expect(
    screen.getAllByRole("link").map((el) => el.getAttribute("href")),
  ).toEqual(["/games/legacy", "/games/next"]);
  view.rerender(
    <MemoryRouter>
      <GameCards games={[{ ...legacy, paused: true }, next]} />
    </MemoryRouter>,
  );
  expect(screen.getAllByRole("heading").map((el) => el.textContent)).toEqual([
    "Next",
    "Legacy",
  ]);
  expect(screen.getAllByRole("link")).toHaveLength(1);
});

it("renders an empty filtered game list without adding fallback cards", () => {
  const { container } = render(
    <MemoryRouter>
      <GameCards games={[]} />
    </MemoryRouter>,
  );
  expect(container.querySelector(".discovery-game-grid")).toBeEmptyDOMElement();
});
