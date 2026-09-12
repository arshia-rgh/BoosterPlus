import { spawn } from "node:child_process";
import { createServer } from "node:net";

async function available(port) {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  await new Promise((resolve) => server.close(resolve));
}
// Check both before starting either: never replace a user's running server.
const storefrontPort = Number(process.env.DEV_STOREFRONT_PORT ?? 5173);
const adminPort = Number(process.env.DEV_ADMIN_PORT ?? 5174);
if (
  ![storefrontPort, adminPort].every(
    (port) => Number.isInteger(port) && port > 1024 && port < 65536,
  ) ||
  storefrontPort === adminPort
)
  throw new Error("Choose distinct development ports between 1025 and 65535");
await available(storefrontPort);
await available(adminPort);
const children = [];
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill("SIGTERM");
  const deadline = setTimeout(() => {
    for (const child of children)
      if (child.exitCode === null) child.kill("SIGKILL");
  }, 5000);
  deadline.unref();
}
for (const application of ["admin", "storefront"]) {
  const child = spawn(
    process.execPath,
    [
      "node_modules/@react-router/dev/bin.cjs",
      "dev",
      "--host",
      "127.0.0.1",
      "--port",
      String(application === "admin" ? adminPort : storefrontPort),
    ],
    {
      env: {
        ...process.env,
        FRONTEND_APP: application,
        DEV_ADMIN_ORIGIN: "http://127.0.0.1:" + adminPort,
      },
      stdio: "inherit",
    },
  );
  children.push(child);
  child.on("error", () => stop(1));
  child.on("exit", (code) => stop(code ?? 1));
}
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => stop(0));
console.log(
  `Storefront: http://127.0.0.1:${storefrontPort}\nStaff workspace: http://127.0.0.1:${storefrontPort}/admin\nBoth apps share this origin for authentication. Ctrl+C stops both.`,
);
