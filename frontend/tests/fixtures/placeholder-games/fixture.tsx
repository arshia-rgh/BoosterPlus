import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  useLoaderData,
} from "react-router";
import { GamePage, GameCatalog } from "../../../app/catalog/public";
import Surface from "../../../app/experience/surface";
import "../../../app/experience/experience.css";
import { GameShell } from "../../../app/catalog/game-shell";
import {
  emptyConfiguration,
  configurationSchema,
  type Release,
  type Listing,
} from "../../../app/catalog/model";
import games from "./games.json";
import "../../../app/styles.css";
import "../../../app/ui/design-system.css";
import "../../../app/ui/champagne.css";
import "../../../app/ui/workspace.css";
const releases: Release[] = games.map((game) => ({
  id: game.id,
  game_id: game.id,
  slug: game.slug,
  version: 1,
  paused: false,
  created_at: "2026-10-23T00:00:00Z",
  configuration: configurationSchema.parse({
    ...emptyConfiguration(game.configuration.name),
    ...game.configuration,
  }),
}));
const listing: Listing = {
  next: "",
  games: releases.map((r) => ({
    id: r.game_id,
    slug: r.slug,
    name: r.configuration.name,
    description: r.configuration.description,
    asset: r.configuration.asset,
    asset_alt: r.configuration.asset_alt,
    hero_layout: r.configuration.hero_layout,
    paused: false,
    published: true,
    archived: false,
    revision: 1,
    capabilities: r.configuration.discovery?.capabilities,
  })),
};
const firstGame = listing.games[0];
if (!firstGame) throw new Error("Missing fixture games");
// Keep the active game last in the source to exercise availability ordering.
listing.games.push({
  ...firstGame,
  id: "synthetic-active",
  slug: "mobile-legends",
  name: "Mobile Legends",
  asset: "/catalog-assets/game-mlbb-1536.jpg",
  asset_alt: "Mobile Legends game artwork",
  capabilities: [
    { service: "boost", state: "active", description: "", reason: "" },
    { service: "accounts", state: "active", description: "", reason: "" },
    { service: "shop", state: "active", description: "", reason: "" },
    { service: "news", state: "active", description: "", reason: "" },
  ],
});
function Page() {
  const release = useLoaderData<Release>();
  return (
    <Surface kind="browse">
      <GameShell release={release}>
        <GamePage />
      </GameShell>
    </Surface>
  );
}
const router = createBrowserRouter([
  {
    path: "/",
    loader: () => listing,
    Component: () => (
      <Surface kind="browse">
        <GameCatalog />
      </Surface>
    ),
  },
  {
    path: "/games",
    loader: () => listing,
    Component: () => (
      <Surface kind="browse">
        <GameCatalog />
      </Surface>
    ),
  },
  {
    path: "/games/:slug/*",
    loader: ({ params }) => {
      const r = releases.find((g) => g.slug === params.slug);
      if (!r) throw new Error("Missing fixture game");
      return r;
    },
    Component: Page,
  },
]);
const root = document.getElementById("root");
if (!root) throw new Error("Missing root");
createRoot(root).render(<RouterProvider router={router} />);
