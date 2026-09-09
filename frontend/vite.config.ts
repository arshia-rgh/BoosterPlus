import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const api =
    process.env.API_ORIGIN ?? env.API_ORIGIN ?? "http://127.0.0.1:8080";
  const key = process.env.PROXY_SHARED_KEY ?? env.PROXY_SHARED_KEY ?? "";
  return {
    plugins: [reactRouter()],
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      proxy: {
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
