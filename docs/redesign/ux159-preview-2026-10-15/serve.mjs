import { createServer } from "../../../frontend/node_modules/vite/dist/node/index.js";
const root = new URL("./", import.meta.url).pathname;
const server = await createServer({
  configFile: false,
  envDir: false,
  root,
  publicDir: new URL("../../../frontend/public/", import.meta.url).pathname,
  server: {
    host: "127.0.0.1",
    port: 4197,
    strictPort: true,
    fs: { allow: [new URL("../../../", import.meta.url).pathname] },
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      react: new URL("../../../frontend/node_modules/react", import.meta.url)
        .pathname,
      "react-dom": new URL(
        "../../../frontend/node_modules/react-dom",
        import.meta.url,
      ).pathname,
      "react-router": new URL(
        "../../../frontend/node_modules/react-router",
        import.meta.url,
      ).pathname,
    },
  },
  logLevel: "error",
});
await server.listen();
console.log("PLAYORA UX159 preview: http://127.0.0.1:4197");
