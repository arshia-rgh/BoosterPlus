import { loadGame } from "../catalog/loaders.server";
import { GamePage } from "../catalog/public";
export function meta() {
  return [{ title: "Game services — Booster Plus" }];
}
export function loader({
  params,
}: {
  params: Record<string, string | undefined>;
}) {
  return loadGame(params.slug);
}
export default GamePage;
