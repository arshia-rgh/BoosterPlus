import { expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ArtworkImage } from "./image";
import {
  defaultGameArtwork,
  defaultGameLayout,
  rendition,
  uploadedArtwork,
  validArtwork,
} from "./model";
const asset = "/api/v1/artwork/11111111-1111-4111-8111-111111111111/wide";
it("keeps all six bundled game defaults and selects only finite uploaded derivatives", () => {
  const defaults = [
    "mobile-legends",
    "world-of-warcraft",
    "league-of-legends",
    "valorant",
    "dota-2",
    "wild-rift",
  ];
  for (const slug of defaults) {
    const path = defaultGameArtwork(slug);
    expect(path).toMatch(/^\/catalog-assets\/game-/);
    expect(rendition(path ?? "", "mobile")).toBe(path);
    expect(defaultGameLayout(slug)).toBeDefined();
  }
  expect(defaultGameArtwork("__proto__")).toBeUndefined();
  expect(defaultGameLayout("custom-game")).toBeUndefined();
  expect(rendition(asset, "card", true)).toBe(
    asset.replace("/artwork/", "/admin/artwork/").replace(/wide$/, "card"),
  );
  for (const path of [
    "https://bad.test/a.png",
    "//bad.test/a.png",
    "/catalog-assets/../private.png",
    asset + "?x=1",
    "/api/v1/media/private",
  ]) {
    expect(validArtwork(path)).toBe(false);
    expect(uploadedArtwork(path)).toBe(false);
  }
});
it("uses admin preview URLs only inside the admin workspace, with distinct phone and card sources", () => {
  const { container, unmount } = render(
    <MemoryRouter initialEntries={["/admin/catalog/game"]}>
      <ArtworkImage source={asset} placement="hero" alt="Game" />
    </MemoryRouter>,
  );
  expect(screen.getByAltText("Game")).toHaveAttribute(
    "src",
    rendition(asset, "wide", true),
  );
  expect(
    container.querySelector('source[media="(max-width: 600px)"]'),
  ).toHaveAttribute("srcset", rendition(asset, "mobile", true));
  unmount();
  const publicRender = render(
    <MemoryRouter initialEntries={["/games/test"]}>
      <ArtworkImage source={asset} placement="card" alt="Card" />
    </MemoryRouter>,
  );
  expect(screen.getByAltText("Card")).toHaveAttribute(
    "src",
    rendition(asset, "card"),
  );
  expect(publicRender.container.innerHTML).not.toContain("admin/artwork");
});
