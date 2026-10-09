import { fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import Page, { meta } from "./contact";
import Support from "./support";
import Contact from "../site/contact";
import { contactLinks } from "../site/contact-config";
import { SignInReturn } from "../account/return-path";
import { PortalRoutingProvider } from "../portal-router";
import { SiteFooter, SiteHeader } from "../ui/site-chrome";

afterEach(() => vi.unstubAllGlobals());

it("provides public email and account-access help without checking authentication", () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  render(
    <MemoryRouter initialEntries={["/contact"]}>
      <Page />
    </MemoryRouter>,
  );
  expect(meta()[0]).toEqual({ title: "Contact us | PLAYORA" });
  expect(
    screen.getByRole("heading", { level: 1, name: "Contact us." }),
  ).toBeVisible();
  expect(
    screen.getByRole("link", { name: "support@playoragames.com" }),
  ).toHaveAttribute("href", "mailto:support@playoragames.com");
  expect(
    screen.getByRole("link", { name: "Email for account access" }),
  ).toHaveAttribute("href", "mailto:support@playoragames.com");
  expect(
    screen.queryByRole("button", { name: "Send verification code" }),
  ).not.toBeInTheDocument();
  expect(fetcher).not.toHaveBeenCalled();
});

it("uses the owner-confirmed social destinations without sharing trackers", () => {
  render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>,
  );
  const destinations = [
    ["Discord", "https://discord.com/users/1553760636821962832"],
    [
      "WhatsApp",
      "https://wa.me/447415078674?text=Hey%20Playora%2C%20i%20need%20help%20%21",
    ],
    ["Instagram", "https://www.instagram.com/playora_service/"],
  ] as const;
  for (const [channel, destination] of destinations) {
    const link = screen.getByRole("link", {
      name: `Open PLAYORA on ${channel} (opens in a new tab)`,
    });
    expect(link).toHaveAttribute("href", destination);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  }
  const whatsapp = new URL(contactLinks.whatsapp ?? "");
  expect(whatsapp.pathname).toBe("/447415078674");
  expect(whatsapp.searchParams.get("text")).toBe("Hey Playora, i need help !");
  expect(new URL(contactLinks.instagram ?? "").search).toBe("");
});

it("keeps all unconfigured social channels unavailable without misleading tab stops", () => {
  render(
    <MemoryRouter>
      <Contact links={{ discord: null, whatsapp: null, instagram: null }} />
    </MemoryRouter>,
  );
  for (const channel of ["Discord", "WhatsApp", "Instagram"]) {
    const card = screen.getByText(channel).closest("li");
    expect(card).toHaveTextContent("Link not available yet");
    expect(card?.querySelector("a, button, [tabindex]")).toBeNull();
    expect(
      screen.queryByRole("link", {
        name: `Open PLAYORA on ${channel} (opens in a new tab)`,
      }),
    ).not.toBeInTheDocument();
  }
});

it("labels configured social destinations and preserves native new-tab behavior", () => {
  // Explicit synthetic destinations exercise display behavior only. None is
  // configured as a public channel or opened during this test.
  render(
    <MemoryRouter>
      <Contact
        links={{
          discord: "https://discord.com/invite/synthetic-test-only",
          whatsapp: "https://wa.me/10000000000",
          instagram: "https://www.instagram.com/synthetic_test_only/",
        }}
      />
    </MemoryRouter>,
  );
  for (const channel of ["Discord", "WhatsApp", "Instagram"]) {
    const link = screen.getByRole("link", {
      name: `Open PLAYORA on ${channel} (opens in a new tab)`,
    });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  }
  expect(screen.queryByText("Link not available yet")).not.toBeInTheDocument();
});

it("routes public header and footer discovery to contact while leaving chat behind its real sign-in guard", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        Response.json({
          portal: "customer",
          user: null,
          csrf_token: "a".repeat(64),
          google_enabled: false,
          google_linked: false,
          mfa_required: false,
          capabilities: [],
          terms_version: "synthetic-test",
          terms_url: "/terms",
        }),
      ),
    ),
  );
  const router = createMemoryRouter(
    [
      {
        path: "/contact",
        element: (
          <>
            <SiteHeader />
            <Page />
            <SiteFooter />
          </>
        ),
      },
      { path: "/support", element: <Support /> },
      { path: "/login", element: <p>Sign-in entry fixture</p> },
    ],
    { initialEntries: ["/contact"] },
  );
  render(<RouterProvider router={router} />);
  expect(
    within(
      screen.getByRole("navigation", { name: "Main navigation" }),
    ).getByRole("link", { name: "Support" }),
  ).toHaveAttribute("href", "/contact");
  expect(
    screen.getByRole("link", { name: "Contact us & support" }),
  ).toHaveAttribute("href", "/contact");
  fireEvent.click(screen.getByRole("link", { name: "Chat with support" }));
  await screen.findByText("Sign-in entry fixture");
  expect(router.state.location.pathname + router.state.location.search).toBe(
    "/login?returnTo=%2Fsupport",
  );
});

it("returns to support after the existing sign-in flow reports readiness", async () => {
  const router = createMemoryRouter(
    [
      { path: "/login", element: <SignInReturn ready /> },
      { path: "/support", element: <p>Private conversations fixture</p> },
    ],
    { initialEntries: ["/login?returnTo=%2Fsupport"] },
  );
  render(<RouterProvider router={router} />);
  await screen.findByText("Private conversations fixture");
  expect(router.state.location.pathname).toBe("/support");
});

it("uses the configured public host when contact is linked from a staff routing context", () => {
  render(
    <MemoryRouter>
      <PortalRoutingProvider
        routing={{
          portal: "admin",
          origins: {
            customer: "https://playora.example",
            admin: "https://admin.playora.example",
            booster: "https://pro.playora.example",
          },
        }}
      >
        <Contact />
      </PortalRoutingProvider>
    </MemoryRouter>,
  );
  expect(screen.getByRole("link", { name: "Back to PLAYORA" })).toHaveAttribute(
    "href",
    "https://playora.example/",
  );
  expect(
    screen.getByRole("link", { name: "Chat with support" }),
  ).toHaveAttribute("href", "https://playora.example/support");
});
