import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("terms", "routes/terms.tsx"),
  route("games", "routes/games.tsx"),
  route("account", "routes/portal.tsx", { id: "account" }),
  route("admin", "routes/portal.tsx", { id: "admin" }),
  route("booster", "routes/portal.tsx", { id: "booster" }),
] satisfies RouteConfig;
