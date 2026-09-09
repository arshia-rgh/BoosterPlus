import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("games", "routes/games.tsx"),
  route("account", "routes/portal.tsx", { id: "account" }),
  route("admin", "routes/portal.tsx", { id: "admin" }),
  route("booster", "routes/portal.tsx", { id: "booster" }),
] satisfies RouteConfig;
