import { createRoot } from "react-dom/client";
import { ServiceExplorer } from "../../../app/home/service-explorer";
import { defaultHome } from "../../../app/site/content";
import "../../../app/styles.css";
import "../../../app/ui/design-system.css";
import "../../../app/ui/champagne.css";
import "../../../app/home/home.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing review root");
createRoot(root).render(
  <main className="plus-home discovery-home">
    <h1 className="sr-only">PLAYORA services</h1>
    <ServiceExplorer
      content={defaultHome}
      chooseGame={() => {
        document.getElementById("game-selection-title")?.focus();
      }}
    />
    <section className="home-content-width" id="game-selection">
      <h2 id="game-selection-title" tabIndex={-1}>
        Choose your game
      </h2>
    </section>
  </main>,
);
