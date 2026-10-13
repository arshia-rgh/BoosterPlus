// Isolated authoring preview. No production routes, accounts, payments or API mutations.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Link,
  useSearchParams,
} from "react-router";
import prepared from "./configuration.json";
import { configurationSchema, type Release } from "../../../app/catalog/model";
import DynamicForm from "../../../app/catalog/dynamic-form";
import ConfigurationImport from "../../../app/catalog/configuration-import";
import { Offerings } from "../../../app/catalog/public";
import "../../../app/styles.css";
import "../../../app/ui/design-system.css";
import "../../../app/ui/workspace.css";
import "../../../app/experience/experience.css";
import "../../../app/catalog/admin-workspace.css";
import "../../../app/catalog/service-tiles.css";
import "../../../app/catalog/game-shell.css";
const configuration = configurationSchema.parse(prepared.configuration);
const release: Release = {
  id: "00000000-0000-4000-8000-000000000145",
  game_id: "00000000-0000-4000-8000-000000000146",
  slug: "mobile-legends",
  version: 1,
  paused: false,
  created_at: "2026-10-13T00:00:00Z",
  configuration,
};
function Review() {
  const [current, setCurrent] = useState(configuration),
    [dirty, setDirty] = useState(false);
  const [query] = useSearchParams();
  const section = query.get("section") || "form";
  const service = configuration.services[0];
  if (!service) throw new Error("Missing synthetic service");
  return (
    <div className="experience">
      <main id="main" className="page catalog-page">
        <h1>MLBB catalog review</h1>
        <p>Isolated preview · no live orders or payments</p>
        <nav className="admin-view-nav" aria-label="Review examples">
          <Link to="/?section=form">Custom boost</Link>
          <Link to="/?section=packages">Fixed packages</Link>
          <Link to="/?section=import">Admin configuration</Link>
        </nav>
        {section === "form" && (
          <DynamicForm
            config={configuration}
            service={service}
            releaseID={release.id}
            slug={release.slug}
            previewPath="/fixture/validate-preview"
          />
        )}
        {section === "packages" && (
          <Offerings release={release} path="packages" />
        )}
        {section === "import" && (
          <section className="catalog-editor">
            <h2>Admin draft</h2>
            <h3>Game and rank references</h3>
            <ConfigurationImport
              current={current}
              slug="mobile-legends"
              revision={243}
              dirty={dirty}
              change={(next) => {
                setCurrent(next);
                setDirty(true);
              }}
            />
            <button
              type="button"
              disabled={!dirty}
              onClick={() => {
                setCurrent(configuration);
                setDirty(false);
              }}
            >
              Discard unsaved edits
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
const router = createBrowserRouter([{ path: "*", element: <Review /> }]);
const root = document.getElementById("root");
if (!root) throw new Error("Missing fixture root");
createRoot(root).render(<RouterProvider router={router} />);
