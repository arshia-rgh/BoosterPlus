import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import Identity from "../../../app/identity/identity";
import { IdentityFrame } from "../../../app/identity/frame";
import AdminShell from "../../../app/admin/shell";
import CustomerShell from "../../../app/experience/customer-shell";
import { AmbientBackdrop } from "../../../app/ui/site-chrome";
import { Loading } from "../../../app/ui/loading";
import "../../../app/styles.css";
import "../../../app/ui/design-system.css";
import "../../../app/admin/admin.css";
import "../../../app/experience/experience.css";
const portal = location.pathname.startsWith("/admin")
  ? "admin"
  : location.pathname.startsWith("/booster")
    ? "booster"
    : "customer";
const compact = new URLSearchParams(location.search).has("compact");
const element = document.getElementById("root");
if (!element) throw new Error("Missing isolated root");
createRoot(element).render(
  <BrowserRouter>
    <AmbientBackdrop />
    {compact ? (
      <main id="main" className="identity-page">
        <h1>Review your order</h1>
        <Loading compact label="Checking sign-in…" />
      </main>
    ) : (
      <IdentityFrame value={portal === "admin" ? AdminShell : CustomerShell}>
        <Identity
          title={
            portal === "admin"
              ? "Admin overview"
              : portal === "booster"
                ? "Your assignments"
                : "Your account"
          }
          capability={
            portal === "admin"
              ? "admin"
              : portal === "booster"
                ? "booster"
                : "account"
          }
        >
          <p>Authorized workspace content</p>
        </Identity>
      </IdentityFrame>
    )}
  </BrowserRouter>,
);
