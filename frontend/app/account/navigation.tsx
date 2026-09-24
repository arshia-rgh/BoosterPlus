import { useEffect, useRef, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router";
import type { Session } from "../identity/api";
import "./account.css";

const primary = [
  ["/account", "Overview"],
  ["/orders", "Orders"],
  ["/support", "Messages"],
] as const;
const secondary = [
  ["/sell", "Sell an account"],
  ["/favorites", "Favorites"],
  ["/reviews", "My reviews"],
  ["/availability", "Package alerts"],
  ["/notifications", "Activity"],
  ["/account/settings", "Settings"],
] as const;

export default function AccountNavigation({
  session,
  action,
}: {
  session: Session;
  action: ReactNode;
}) {
  const { pathname } = useLocation();
  const drawer = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const booster = pathname.startsWith("/booster");
  const verified =
    !!session.user &&
    !session.mfa_required &&
    session.capabilities.includes(booster ? "booster" : "account");
  const items = booster
    ? [
        ["/booster", "Overview"],
        ["/booster/orders", "Assigned work"],
        ["/booster/calendar", "My calendar"],
      ]
    : primary;
  useEffect(() => {
    if (drawer.current?.open) drawer.current.close();
  }, [pathname]);
  if (!verified) return <div className="account-entry-action">{action}</div>;
  const links = (entries: readonly (readonly string[])[]) =>
    entries.map(([to = "", label]) => (
      <NavLink
        key={to}
        to={to}
        end={to === "/account" || to === "/booster"}
        onClick={() => drawer.current?.close()}
      >
        {label}
      </NavLink>
    ));
  const extra = (
    <>
      {!booster && links(secondary)}
      {booster && (
        <NavLink end to="/account">
          Customer account
        </NavLink>
      )}
      {!booster && session.capabilities.includes("booster") && (
        <NavLink end to="/booster">
          Booster workspace
        </NavLink>
      )}
      {session.capabilities.includes("admin") && (
        <a href="/admin/">Administration ↗</a>
      )}
    </>
  );
  return (
    <>
      <aside
        className="account-sidebar"
        aria-label={booster ? "Booster workspace" : "Account workspace"}
      >
        <p className="eyebrow">
          {booster ? "BOOSTER WORKSPACE" : "YOUR PLAYORA"}
        </p>
        <nav aria-label={booster ? "Booster navigation" : "Account navigation"}>
          {links(items)}
          <div className="account-nav-divider" />
          {extra}
        </nav>
        <div className="account-person">
          <strong>{session.user?.display_name || "Your account"}</strong>
          {action}
        </div>
      </aside>
      <nav
        className="account-mobile-nav"
        aria-label={booster ? "Booster shortcuts" : "Account shortcuts"}
      >
        {links(items)}
        <button
          ref={trigger}
          type="button"
          aria-haspopup="dialog"
          onClick={() => drawer.current?.showModal()}
        >
          More
        </button>
      </nav>
      <dialog
        ref={drawer}
        className="account-drawer"
        aria-label={booster ? "Booster menu" : "Account menu"}
        onClose={() => trigger.current?.focus()}
      >
        <div className="account-drawer-header">
          <h2>{booster ? "Booster menu" : "Account menu"}</h2>
          <button type="button" onClick={() => drawer.current?.close()}>
            Close
          </button>
        </div>
        <nav
          aria-label={
            booster ? "Other workspaces" : "More account destinations"
          }
        >
          {extra}
        </nav>
        <div className="account-person">
          <strong>{session.user?.display_name || "Your account"}</strong>
          {action}
        </div>
      </dialog>
    </>
  );
}
