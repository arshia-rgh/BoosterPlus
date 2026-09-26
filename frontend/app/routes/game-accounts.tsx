import { GameAccounts } from "../catalog/game-accounts";
export { loader } from "./game";
export { GameContentError as ErrorBoundary } from "../catalog/game-shell";
export function meta() {
  return [{ title: "Game accounts — PLAYORA" }];
}
export default GameAccounts;
