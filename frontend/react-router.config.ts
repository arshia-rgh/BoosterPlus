import type { Config } from "@react-router/dev/config";
const admin = process.env.FRONTEND_APP === "admin";
export default {
  ssr: true,
  appDirectory: admin ? "admin-app" : "app",
  buildDirectory: admin ? "build/admin" : "build/storefront",
  routeDiscovery: { mode: "initial" },
} satisfies Config;
