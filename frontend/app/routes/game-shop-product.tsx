import { GameShop } from "../shop/public";
export { loader } from "./game";
export { GameContentError as ErrorBoundary } from "../catalog/game-shell";
export function meta() {
  return [{ title: "Shop product — PLAYORA" }];
}
export default function Page() {
  return <GameShop detail />;
}
