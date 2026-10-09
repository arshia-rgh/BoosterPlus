import { layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  layout("../app/routes/workspace.tsx", { id: "routes/workspace" }, [
    route("booster?/login", "../app/routes/login.tsx", { id: "booster-login" }),
    route("booster?/account/settings", "../app/routes/portal.tsx", {
      id: "booster-settings",
    }),
    route("booster?/account/security", "../app/routes/portal.tsx", {
      id: "booster-security",
    }),
    route("booster?/account/sessions", "../app/routes/portal.tsx", {
      id: "booster-sessions",
    }),
    route("booster?/account/recovery", "../app/routes/portal.tsx", {
      id: "booster-recovery",
    }),
    route("booster?/account/preferences", "../app/routes/portal.tsx", {
      id: "booster-preferences",
    }),
    route("booster?/support/:id", "../app/routes/conversation-booster.tsx"),
    route("booster?/calendar", "../app/routes/booster-calendar.tsx"),
    route("booster?/orders", "../app/routes/booster-orders.tsx"),
    route("booster?/orders/:id", "../app/routes/booster-order.tsx"),
    route("booster?", "../app/routes/booster-home.tsx", { id: "booster" }),
  ]),
  route("*", "../app/routes/not-found.tsx"),
] satisfies RouteConfig;
