import { Link, NavLink, useLocation } from "react-router";
import { BrandLogo } from "../brand/brand";
import { setMotionPreference, useMotionPreference } from "./motion";

export function SiteHeader() {
  const booster = useLocation().pathname.startsWith("/booster");
  return (
    <header className="site-header minimal-header">
      <Link
        className="brand"
        to={booster ? "/booster" : "/"}
        aria-label={booster ? "PLAYORA booster workspace" : "PLAYORA home"}
      >
        <BrandLogo />
      </Link>
      {booster && <span className="workspace-label">Booster workspace</span>}
      <nav aria-label="Main navigation">
        <NavLink to={booster ? "/booster/orders" : "/support"}>
          {booster ? "Assigned work" : "Support"}
        </NavLink>
        <NavLink end to={booster ? "/booster" : "/account"}>
          {booster ? "Workspace overview" : "My account"}
        </NavLink>
      </nav>
    </header>
  );
}

export function AmbientBackdrop() {
  const motion = useMotionPreference();
  return (
    <div
      className="site-ambient"
      data-motion={motion === "system-full" ? "full" : "reduced"}
      aria-hidden="true"
    />
  );
}

export function SiteFooter() {
  const { pathname } = useLocation();
  const staff = pathname.startsWith("/admin");
  const booster = pathname.startsWith("/booster");
  const motion = useMotionPreference();
  return (
    <footer className="site-footer">
      <div className="footer-introduction">
        <BrandLogo />
        <p>
          {staff
            ? "PLAYORA administration"
            : booster
              ? "PLAYORA booster workspace"
              : "Your games. Your next chapter."}
        </p>
      </div>
      <nav aria-label="Help and policies">
        <span className="footer-label">Here to help</span>
        <Link
          to={
            staff ? "/admin/support" : booster ? "/booster/orders" : "/support"
          }
        >
          {staff
            ? "Support inbox"
            : booster
              ? "Assignment conversations"
              : "Contact us & support"}
        </Link>
        {staff ? (
          <Link to="/admin/content">Content & policies</Link>
        ) : (
          <Link to="/terms">Terms & policies</Link>
        )}
        {!staff && !booster && <Link to="/privacy">Your data & privacy</Link>}
      </nav>
      <div className="footer-accessibility">
        <span className="footer-label">Make yourself comfortable</span>
        <p>Background motion follows your device preferences.</p>
        <div
          className="motion-options"
          role="group"
          aria-label="Background motion"
        >
          <button
            type="button"
            aria-pressed={motion === "reduced"}
            onClick={() => {
              setMotionPreference(true);
            }}
          >
            Reduce background motion
          </button>
          <button
            type="button"
            aria-pressed={motion !== "reduced"}
            onClick={() => {
              setMotionPreference(false);
            }}
          >
            Use device motion setting
          </button>
        </div>
      </div>
      {!staff && !booster && (
        <nav className="footer-workspaces" aria-label="Team access">
          <a href="/admin/">Admin access ↗</a>
          <Link to="/booster">Booster access ↗</Link>
        </nav>
      )}
    </footer>
  );
}
