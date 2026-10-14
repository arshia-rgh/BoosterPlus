import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import SellerOffers from "../../../app/resale/offers";
import "../../../app/styles.css";
import "../../../app/ui/design-system.css";
import "../../../app/ui/workspace.css";

document.body.dataset.portal = "admin";
const root = document.getElementById("root");
if (!root) throw new Error("Missing isolated review root");
createRoot(root).render(
  <BrowserRouter>
    <main
      className="catalog-page"
      style={{ maxWidth: 960, margin: "auto", padding: "1rem" }}
    >
      <h1>Account submission · Sale agreement</h1>
      <p>Isolated review · synthetic data · no real offers or payments</p>
      <SellerOffers
        id="synthetic-submission"
        version={2}
        state="approved_pending_terms"
        admin
        view="agreement"
        changed={() => {}}
      />
    </main>
  </BrowserRouter>,
);
