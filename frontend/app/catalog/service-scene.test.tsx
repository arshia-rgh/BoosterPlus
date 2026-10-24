import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { ServiceScene } from "./service-scene";
import { emptyConfiguration, type Release } from "./model";
const release: Release = {
  id: "fixture",
  game_id: "fixture",
  slug: "mobile-legends",
  version: 1,
  created_at: "2026-10-24T00:00:00Z",
  paused: false,
  configuration: emptyConfiguration("Mobile Legends"),
};
it.each(["boost", "accounts", "shop", "news"] as const)(
  "uses only the approved MLBB scene for %s",
  (kind) => {
    const view = render(<ServiceScene release={release} kind={kind} />);
    const image = view.container.querySelector(".game-service-art-scene");
    expect(image).toHaveAttribute(
      "src",
      `/artwork/mlbb-services/${kind}-v1-960.jpg`,
    );
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveAttribute("loading", "lazy");
  },
);
it("never assigns MLBB heroes to another game, including missing artwork", () => {
  const game = {
    ...release,
    slug: "world-of-warcraft",
    configuration: {
      ...release.configuration,
      asset: "/catalog-assets/game-wow-640.jpg",
    },
  };
  const view = render(<ServiceScene release={game} kind="accounts" />);
  expect(view.container.querySelector("img")).toHaveAttribute(
    "src",
    game.configuration.asset,
  );
  expect(view.container.querySelectorAll("img")).toHaveLength(1);
  view.rerender(
    <ServiceScene
      release={{ ...game, configuration: { ...game.configuration, asset: "" } }}
      kind="accounts"
    />,
  );
  expect(view.container.querySelector("img")).toBeNull();
});
