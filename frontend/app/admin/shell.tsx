import { BrandLogo } from "../brand/brand";
import "../ui/workspace.css";
import { useRef } from "react";
import { NavLink, useLocation } from "react-router";
import type { FrameProps } from "../identity/frame";

const groups = [
  {
    label: "Workspace",
    items: [
      ["/admin", "Overview", "◈"],
      ["/admin/orders", "Order queue", "▤"],
      ["/admin/support", "Support inbox", "◌"],
      ["/admin/customers", "Customers and staff", "◎"],
      ["/admin/calendar", "Staff calendars", "▦"],
    ],
  },
  {
    label: "Manage",
    items: [
      ["/admin/catalog", "Catalog editor", "◇"],
      ["/admin/accounts", "Account inventory", "▣"],
      ["/admin/submissions", "Account submissions", "▣"],
      ["/admin/coupons", "Coupons", "%"],
      ["/admin/reviews", "Review moderation", "☆"],
    ],
  },
  {
    label: "Operations",
    items: [
      ["/admin/finance", "Finance", "◉"],
      ["/admin/reports", "Reports", "▥"],
      ["/admin/content", "Content and policies", "◇"],
      ["/admin/privacy", "Privacy requests", "◎"],
      ["/admin/media", "Media directory", "▣"],
      ["/admin/alerts", "Availability alerts", "◌"],
      ["/admin/jobs", "Background tasks", "↻"],
    ],
  },
] as const;
function Navigation({ close, owner }: { close?: () => void; owner: boolean }) {
  return (
    <nav aria-label="Staff navigation" className="admin-navigation">
      {groups.map((group) => (
        <div key={group.label}>
          <p>{group.label}</p>
          {group.items
            .filter(([href]) => href !== "/admin/privacy" || owner)
            .map(([href, label, icon]) => (
              <NavLink
                key={href}
                end={href === "/admin"}
                to={href}
                onClick={close}
              >
                <span aria-hidden="true">{icon}</span>
                {label}
              </NavLink>
            ))}
        </div>
      ))}
      <a className="admin-external" href="/account/security">
        Profile and security ↗
      </a>
      <a className="admin-external" href="/">
        View storefront ↗
      </a>
    </nav>
  );
}
export default function AdminShell({ session, title, children }: FrameProps) {
  const drawer = useRef<HTMLDialogElement>(null);
  const { pathname } = useLocation();
  const authorized =
    !!session?.user &&
    !session.mfa_required &&
    session.capabilities.includes("admin");
  return (
    <div className={authorized ? "admin-workspace" : "admin-entry"}>
      {authorized && (
        <aside className="admin-sidebar" aria-label="Staff modules">
          <a
            href="/admin"
            className="brand"
            aria-label="PLAYORA administration"
          >
            <BrandLogo />
          </a>
          <span className="admin-edition">STAFF CONSOLE</span>
          <Navigation owner={session.user?.role === "owner"} />
          <div className="admin-staff-card">
            <span className="admin-avatar" aria-hidden="true">
              {(session.user?.staff_alias || session.user?.display_name || "S")
                .slice(0, 1)
                .toUpperCase()}
            </span>
            <div>
              <strong>
                {session.user?.staff_alias ||
                  session.user?.display_name ||
                  "Staff member"}
              </strong>
              <small>
                {session.user?.role === "owner" ? "Owner" : "Administrator"} ·
                MFA verified
              </small>
            </div>
          </div>
        </aside>
      )}
      <div className="admin-body">
        <header className="admin-topbar">
          {authorized ? (
            <>
              <button
                className="admin-menu-button button"
                type="button"
                onClick={() => drawer.current?.showModal()}
                aria-haspopup="dialog"
              >
                Menu
              </button>
              <nav aria-label="Breadcrumb">
                <NavLink end to="/admin">
                  Workspace
                </NavLink>
                <span aria-hidden="true">/</span>
                <span aria-current="page">
                  {pathname === "/admin" ? "Overview" : title}
                </span>
              </nav>
              <form action="/admin/orders" method="get" role="search">
                <label className="sr-only" htmlFor="staff-search">
                  Search orders
                </label>
                <input
                  id="staff-search"
                  name="search"
                  type="search"
                  placeholder="Search game or order ID…"
                  maxLength={200}
                />
                <button type="submit" aria-label="Search orders">
                  ↗
                </button>
              </form>
            </>
          ) : (
            <>
              <a href="/admin" className="brand">
                <BrandLogo />
              </a>
              <a href="/">Visit storefront ↗</a>
            </>
          )}
        </header>
        {!authorized && (
          <section className="admin-welcome" aria-label="Staff sign-in guide">
            <p className="eyebrow">PLAYORA STAFF</p>
            <p>
              Use your verified staff email or linked Google account, then your
              authenticator. This page opens after both steps are complete.
            </p>
            <details>
              <summary>Setting up your first owner?</summary>
              <p>
                First create an account and enroll an authenticator in account
                security. An operator can then bootstrap that verified account
                using the backend CLI. Sign in again and complete MFA. Customer
                signup does not grant staff access. See the repository’s staff
                onboarding guide.
              </p>
            </details>
          </section>
        )}
        {children}
      </div>
      {authorized && (
        <dialog ref={drawer} className="admin-drawer" aria-label="Staff menu">
          <div className="admin-drawer-heading">
            <BrandLogo />
            <button
              className="button"
              type="button"
              onClick={() => drawer.current?.close()}
            >
              Close menu
            </button>
          </div>
          <Navigation
            owner={session.user?.role === "owner"}
            close={() => drawer.current?.close()}
          />
        </dialog>
      )}
    </div>
  );
}
