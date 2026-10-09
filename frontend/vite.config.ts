import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const api =
    process.env.API_ORIGIN ?? env.API_ORIGIN ?? "http://127.0.0.1:8080";
  const key = process.env.PROXY_SHARED_KEY ?? env.PROXY_SHARED_KEY ?? "";
  const admin = process.env.FRONTEND_APP === "admin";
  const booster = process.env.FRONTEND_APP === "booster";
  return {
    base: admin ? "/admin/" : booster ? "/booster/" : "/",
    publicDir: booster ? false : "public",
    cacheDir: admin
      ? "node_modules/.vite-admin"
      : booster
        ? "node_modules/.vite-booster"
        : "node_modules/.vite-storefront",
    plugins: [reactRouter()],
    server: {
      host: "127.0.0.1",
      port: admin ? 5174 : booster ? 5175 : 5173,
      strictPort: true,
      proxy: {
        ...(!admin && process.env.DEV_ADMIN_ORIGIN
          ? { "/admin": { target: process.env.DEV_ADMIN_ORIGIN, ws: true } }
          : {}),
        "/api": {
          target: api,
          configure(proxy) {
            proxy.on("proxyReq", (outgoing, incoming) => {
              outgoing.removeHeader("forwarded");
              outgoing.removeHeader("x-forwarded-for");
              outgoing.setHeader("X-Booster-Proxy-Key", key);
              outgoing.setHeader(
                "X-Booster-Client-IP",
                incoming.socket.remoteAddress ?? "unknown",
              );
            });
          },
        },
      },
    },
  };
});
