import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation as useActualLocation } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import {
  Anchor,
  Link,
  NavLink,
  Navigate,
  PortalRoutingProvider,
  useLocation,
  useNavigate,
} from "../portal-router";
import { activePortal, portalReturn } from "../identity/portal";
import { APIError, get, sessionSchema } from "../identity/api";
import Login from "../routes/login";
import { VerificationLink } from "../account/return-path";
import { SiteFooter, SiteHeader } from "../ui/site-chrome";
import {
  canonicalPath,
  portalDestination,
  type PortalRouting,
} from "./routing";

const origins = {
  customer: "https://playora.example",
  admin: "https://admin.playora.example",
  booster: "https://booster.playora.example",
};
const admin: PortalRouting = { portal: "admin", origins };
afterEach(() => {
  vi.unstubAllGlobals();
  delete document.body.dataset.portal;
});
function Location() {
  const local = useActualLocation();
  const canonical = useLocation();
  return (
    <output aria-label="route">
      {local.pathname + local.search}|{canonical.pathname + canonical.search}
    </output>
  );
}

it("uses clean portal URLs while keeping record context and query-only section transitions", async () => {
  function Content() {
    const navigate = useNavigate();
    return (
      <>
        <Location />
        <NavLink to="/admin/orders/one" end>
          Order one
        </NavLink>
        <Link
          to={{ pathname: "/admin/orders/one", search: "?section=messages" }}
        >
          Messages
        </Link>
        <Link to="?section=history">History</Link>
        <button
          onClick={() => {
            void navigate("/admin/orders", { replace: true });
          }}
        >
          Queue
        </button>
      </>
    );
  }
  render(
    <MemoryRouter initialEntries={["/orders/one"]}>
      <PortalRoutingProvider routing={admin}>
        <Content />
      </PortalRoutingProvider>
    </MemoryRouter>,
  );
  expect(screen.getByRole("link", { name: "Order one" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("link", { name: "Messages" })).toHaveAttribute(
    "href",
    "/orders/one?section=messages",
  );
  fireEvent.click(screen.getByRole("link", { name: "Messages" }));
  await waitFor(() =>
    expect(screen.getByLabelText("route")).toHaveTextContent(
      "/orders/one?section=messages|/admin/orders/one?section=messages",
    ),
  );
  fireEvent.click(screen.getByRole("link", { name: "History" }));
  await waitFor(() =>
    expect(screen.getByLabelText("route")).toHaveTextContent(
      "/orders/one?section=history|/admin/orders/one?section=history",
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Queue" }));
  await waitFor(() =>
    expect(screen.getByLabelText("route")).toHaveTextContent(
      "/orders|/admin/orders",
    ),
  );
});

it("maps cross-portal links to explicit origins and preserves ordinary anchor semantics", () => {
  render(
    <MemoryRouter initialEntries={["/orders"]}>
      <PortalRoutingProvider routing={admin}>
        <Link to="/">Storefront</Link>
        <Link to="/booster/orders">Booster</Link>
        <Anchor
          href="/admin/account/security?returnTo=%2Fadmin%2Forders"
          target="_blank"
          rel="noopener noreferrer"
        >
          Verify
        </Anchor>
        <Anchor href="mailto:support@playora.example">Email</Anchor>
        <Anchor href="#main">Skip</Anchor>
        <Anchor href="/api/v1/media/synthetic/content" download>
          Download proof
        </Anchor>
      </PortalRoutingProvider>
    </MemoryRouter>,
  );
  expect(screen.getByRole("link", { name: "Storefront" })).toHaveAttribute(
    "href",
    origins.customer + "/",
  );
  expect(screen.getByRole("link", { name: "Booster" })).toHaveAttribute(
    "href",
    origins.booster + "/orders",
  );
  expect(screen.getByRole("link", { name: "Verify" })).toHaveAttribute(
    "href",
    "/account/security?returnTo=%2Fadmin%2Forders",
  );
  expect(screen.getByRole("link", { name: "Verify" })).toHaveAttribute(
    "target",
    "_blank",
  );
  expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute(
    "href",
    "mailto:support@playora.example",
  );
  expect(screen.getByRole("link", { name: "Skip" })).toHaveAttribute(
    "href",
    "#main",
  );
  expect(screen.getByRole("link", { name: "Download proof" })).toHaveAttribute(
    "href",
    "/api/v1/media/synthetic/content",
  );
});

it("preserves nested state for same-portal declarative redirects", async () => {
  render(
    <MemoryRouter initialEntries={["/orders/one"]}>
      <PortalRoutingProvider routing={admin}>
        <Navigate
          to="/admin/login?returnTo=%2Fadmin%2Forders%2Fone%3Fsection%3Dmessages"
          replace
        />
        <Location />
      </PortalRoutingProvider>
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.getByLabelText("route")).toHaveTextContent(
      "/login?returnTo=%2Fadmin%2Forders%2Fone%3Fsection%3Dmessages|/admin/login",
    ),
  );
});

it.each(["admin", "booster"] as const)(
  "binds clean %s sign-in to that portal and exposes public terms on the storefront",
  async (portal) => {
    document.body.dataset.portal = portal;
    const fetcher = vi.fn(() =>
      Promise.resolve(
        Response.json({
          portal,
          user: null,
          csrf_token: "x".repeat(64),
          google_enabled: true,
          google_linked: false,
          mfa_required: false,
          capabilities: [],
          terms_version: "test",
          terms_url: "/terms",
        }),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <PortalRoutingProvider routing={{ portal, origins }}>
          <Login />
        </PortalRoutingProvider>
      </MemoryRouter>,
    );
    await screen.findByLabelText("Work email address");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      portal === "admin" ? "Admin sign-in" : "Booster sign-in",
    );
    expect(fetcher).toHaveBeenCalledWith(
      `/api/v1/auth/portals/${portal}/session`,
      expect.objectContaining({
        credentials: "same-origin",
        headers: { "X-Playora-Portal": portal },
      }),
    );
    for (const link of screen.getAllByRole("link", { name: "account terms" }))
      expect(link).toHaveAttribute("href", origins.customer + "/terms");
    expect(
      screen.getByRole("link", { name: "Visit the PLAYORA website ↗" }),
    ).toHaveAttribute("href", origins.customer + "/");
  },
);

it("retains booster identity, active navigation and footer links at the root address", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <PortalRoutingProvider routing={{ portal: "booster", origins }}>
        <SiteHeader />
        <SiteFooter />
      </PortalRoutingProvider>
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("link", { name: "PLAYORA booster workspace" }),
  ).toHaveAttribute("href", "/");
  expect(
    screen.getByRole("link", { name: "Workspace overview" }),
  ).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: "Assigned work" })).toHaveAttribute(
    "href",
    "/orders",
  );
  expect(
    screen.getByRole("link", { name: "Terms & policies" }),
  ).toHaveAttribute("href", origins.customer + "/terms");
});

it("keeps a recent-auth action in the current admin workspace", () => {
  const error = new APIError();
  error.code = "recent_auth_required";
  render(
    <MemoryRouter initialEntries={["/reports"]}>
      <PortalRoutingProvider routing={admin}>
        <VerificationLink error={error} />
      </PortalRoutingProvider>
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("button", { name: "Verify to continue here" }),
  ).toBeVisible();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

it("uses host-derived portal context even where clean staff paths collide with customer routes", async () => {
  document.body.dataset.portal = "booster";
  expect(activePortal()).toBe("booster");
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        Response.json({
          portal: "customer",
          user: null,
          csrf_token: "x".repeat(64),
          google_enabled: false,
          google_linked: false,
          mfa_required: false,
          capabilities: [],
          terms_version: "test",
          terms_url: "/terms",
        }),
      ),
    ),
  );
  await expect(get("/auth/session", sessionSchema)).rejects.toThrow(
    "Sign-in context changed",
  );
});

it("retains legacy path routing and bounded returns without guessing arbitrary hosts", () => {
  expect(portalDestination("/admin/orders", null)).toBe("/admin/orders");
  expect(canonicalPath("/booster/orders", null)).toBe("/booster/orders");
  expect(
    portalDestination(
      { pathname: "/booster/orders", search: "section=messages", hash: "main" },
      admin,
    ),
  ).toBe(origins.booster + "/orders?section=messages#main");
  expect(
    portalReturn("https://admin.playora.example/orders", "admin"),
  ).toBeNull();
  expect(portalReturn("/admin/../orders", "admin")).toBeNull();
  expect(portalReturn("/booster/orders", "admin")).toBeNull();
  expect(portalReturn("/admin/orders/one?section=messages", "admin")).toBe(
    "/admin/orders/one?section=messages",
  );
});
