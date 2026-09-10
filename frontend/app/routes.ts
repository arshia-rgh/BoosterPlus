import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("terms", "routes/terms.tsx"),
  route("games", "routes/games.tsx"),
  route("games/:slug", "routes/game.tsx"),
  route("games/:slug/services/:service", "routes/service.tsx"),
  route("games/:slug/packages/:pack", "routes/package.tsx"),
  route("admin/catalog", "routes/catalog-admin.tsx"),
  route("admin/coupons", "routes/coupon-admin.tsx"),
  route("account", "routes/portal.tsx", { id: "account" }),
  route("admin", "routes/portal.tsx", { id: "admin" }),
  route("booster", "routes/portal.tsx", { id: "booster" }),
] satisfies RouteConfig;
