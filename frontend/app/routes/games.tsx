import { loadCatalog } from "../catalog/loaders.server";
import { GameCatalog } from "../catalog/public";
export function meta() {
  return [
    { title: "Games — Booster Plus" },
    {
      name: "description",
      content:
        "Browse published games, custom boosting services and fixed packages.",
    },
  ];
}
export function loader({ request }: { request: Request }) {
  return loadCatalog(request);
}
export default GameCatalog;
