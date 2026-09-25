import { Outlet, useLoaderData } from "react-router";
import { loadGame } from "../catalog/loaders.server";
import { GameShell } from "../catalog/game-shell";
import type { Release } from "../catalog/model";
export { GameUnavailable as ErrorBoundary } from "../catalog/game-shell";
export function loader({
  params,
}: {
  params: Record<string, string | undefined>;
}) {
  return loadGame(params.slug);
}
export default function GameRouteShell() {
  return (
    <GameShell release={useLoaderData<Release>()}>
      <Outlet />
    </GameShell>
  );
}
