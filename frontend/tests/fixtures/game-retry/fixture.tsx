import { Suspense, use } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  useRouteError,
} from "react-router";
import { GameShell, GameContentError } from "../../../app/catalog/game-shell";
import { emptyConfiguration, type Release } from "../../../app/catalog/model";
import "../../../app/styles.css";
import "../../../app/ui/design-system.css";
import "../../../app/ui/champagne.css";

declare global {
  interface Window {
    finishGameRetry: () => void;
    finishGameRender: () => void;
    gameRetryAudit: string[];
  }
}
const mode = new URLSearchParams(location.search).get("mode");
history.replaceState(
  { key: "fixture", idx: 0, usr: { shopSearch: "region=global" } },
  "",
);
let attempts = 0;
window.gameRetryAudit = [];
for (const type of ["click", "keydown", "focusin"])
  document.addEventListener(type, (event) => {
    window.gameRetryAudit.push(
      type +
        ":" +
        (event.target instanceof HTMLElement
          ? event.target.textContent.slice(0, 80)
          : "unknown"),
    );
  });
const pending = new Promise<null>((resolve) => {
  window.finishGameRetry = () => {
    resolve(null);
  };
});
const rendered = new Promise<null>((resolve) => {
  window.finishGameRender = () => {
    resolve(null);
  };
});
const release: Release = {
  id: "synthetic",
  game_id: "synthetic",
  slug: "example",
  version: 1,
  paused: true,
  created_at: "2026-10-19T00:00:00Z",
  configuration: {
    ...emptyConfiguration("Example game"),
    description: "Synthetic section recovery preview.",
  },
};
function Reviews() {
  if (mode === "render-error")
    throw new Error("Synthetic recovered render error");
  if (mode === "render-delayed") {
    window.gameRetryAudit.push("render:waiting");
    use(rendered);
  }
  return (
    <section>
      <h2>Game reviews</h2>
      <p>Recovered section. Your game context stays in place.</p>
    </section>
  );
}
function ObservedError() {
  const error = useRouteError();
  window.gameRetryAudit.push("error:" + String(error));
  return <GameContentError />;
}
const router = createBrowserRouter([
  {
    path: "/games/:slug",
    element: (
      <GameShell release={release}>
        <Suspense fallback={<p>Loading section…</p>}>
          <Outlet />
        </Suspense>
      </GameShell>
    ),
    children: [
      { index: true, element: <h2>Choose a service</h2> },
      {
        path: "reviews",
        loader: () => {
          window.gameRetryAudit.push("loader:" + String(attempts));
          if (attempts++ < (mode === "repeat" ? 2 : 1)) {
            // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router consumes loader HTTP responses.
            throw new Response(null, { status: 503 });
          }
          return mode === "delayed" ? pending : null;
        },
        element: <Reviews />,
        errorElement: <ObservedError />,
      },
    ],
  },
]);
const root = document.getElementById("root");
if (!root) throw new Error("Missing fixture root");
createRoot(root).render(<RouterProvider router={router} />);
