import { Anchor } from "../portal-router";
import "./operations.css";
import { BrandLogo } from "../brand/brand";
import "../ui/workspace.css";
import { useId, useRef, useState } from "react";
import { NavLink, useLocation, usePortalDestination } from "../portal-router";
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
      ["/admin/shop", "Shop products", "◇"],
      ["/admin/news", "News & guides", "▤"],
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
  const [search, setSearch] = useState("");
  const id = useId();
  const filtered = groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        ([href, label]) =>
          (href !== "/admin/privacy" || owner) &&
          label.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    }))
    .filter((group) => group.items.length > 0);
  return (
    <nav aria-label="Staff navigation" className="admin-navigation">
      <label className="admin-module-search" htmlFor={id}>
        Find a module
        <input
          id={id}
          type="search"
          value={search}
          maxLength={80}
          placeholder="Orders, finance, catalog…"
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
      </label>
      {filtered.length === 0 && (
        <p role="status">
          No matching module. Clear the search to see all tools.
        </p>
      )}
      {search && (
        <button
          type="button"
          className="button compact"
          onClick={() => {
            setSearch("");
          }}
        >
          Clear module search
        </button>
      )}
      {filtered.map((group) => (
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
      <div>
        <p>My admin account</p>
        <NavLink to="/admin/account/settings" onClick={close}>
          Profile
        </NavLink>
        <NavLink to="/admin/account/security" onClick={close}>
          Security
        </NavLink>
        <NavLink to="/admin/account/sessions" onClick={close}>
          Sessions
        </NavLink>
        <NavLink to="/admin/account/recovery" onClick={close}>
          Recovery codes
        </NavLink>
      </div>
      <Anchor className="admin-external" href="/">
        View storefront ↗
      </Anchor>
    </nav>
  );
}
export default function AdminShell({ session, title, children }: FrameProps) {
  const drawer = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();
  const orderSearch = usePortalDestination()("/admin/orders");
  const authorized =
    !!session?.user &&
    session.portal === "admin" &&
    session.user.portal === "admin" &&
    !session.mfa_required &&
    session.capabilities.includes("admin");
  return (
    <div className={authorized ? "admin-workspace" : "admin-entry"}>
      {authorized && (
        <aside className="admin-sidebar" aria-label="Staff modules">
          <Anchor
            href="/admin"
            className="brand"
            aria-label="PLAYORA administration"
          >
            <BrandLogo />
          </Anchor>
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
                ref={menuButton}
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
              <form
                action={
                  typeof orderSearch === "string" ? orderSearch : undefined
                }
                method="get"
                role="search"
              >
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
              <Anchor href="/admin" className="brand">
                <BrandLogo />
              </Anchor>
              <Anchor href="/">Visit storefront ↗</Anchor>
            </>
          )}
        </header>
        {children}
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
                An operator provisions the first owner using the backend CLI.
                Sign in here with that admin email, then set up this account’s
                authenticator. Customer signup does not create a staff account.
                See the repository’s staff onboarding guide.
              </p>
            </details>
          </section>
        )}
      </div>
      {authorized && (
        <dialog
          ref={drawer}
          className="admin-drawer"
          aria-label="Staff menu"
          onClose={() => menuButton.current?.focus()}
        >
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
