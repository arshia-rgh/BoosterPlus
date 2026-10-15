import { Link, NavLink, useLocation } from "../portal-router";
import { BrandLogo } from "../brand/brand";
import { useMotionPreference } from "./motion";

export function SiteHeader() {
  const pathname = useLocation().pathname;
  const booster = pathname.startsWith("/booster");
  const entry = pathname === "/booster/login";
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
      {!entry && (
        <nav aria-label="Main navigation">
          <NavLink to={booster ? "/booster/orders" : "/contact"}>
            {booster ? "Assigned work" : "Support"}
          </NavLink>
          <NavLink end to={booster ? "/booster" : "/account"}>
            {booster ? "Workspace overview" : "My account"}
          </NavLink>
        </nav>
      )}
      {!booster && <div id="customer-activity-slot" />}
    </header>
  );
}

function isLoginPage(pathname: string) {
  return ["/login", "/admin/login", "/booster/login"].includes(
    pathname.replace(/\/$/, ""),
  );
}

export function AmbientBackdrop() {
  const motion = useMotionPreference();
  const { pathname } = useLocation();
  if (isLoginPage(pathname)) return null;
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
  if (isLoginPage(pathname)) return null;
  const staff = pathname.startsWith("/admin");
  const booster = pathname.startsWith("/booster");
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
            staff ? "/admin/support" : booster ? "/booster/orders" : "/contact"
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
        {!staff && !booster && (
          <>
            <Link to="/how-it-works">How PLAYORA works</Link>
            <Link to="/privacy">Your data & privacy</Link>
          </>
        )}
      </nav>
    </footer>
  );
}
