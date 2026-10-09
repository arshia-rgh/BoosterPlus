import type { Config } from "@react-router/dev/config";
const application = process.env.FRONTEND_APP ?? "storefront";
export default {
  ssr: true,
  appDirectory:
    application === "admin"
      ? "admin-app"
      : application === "booster"
        ? "booster-app"
        : "app",
  buildDirectory: `build/${application}`,
  routeDiscovery: { mode: "initial" },
} satisfies Config;
