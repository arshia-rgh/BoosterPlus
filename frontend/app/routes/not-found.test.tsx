import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import NotFound, { loader } from "./not-found";
import { PortalRoutingProvider } from "../portal-router";

it.each(["customer", "admin", "booster"] as const)(
  "keeps the %s destination on its host for an unknown clean URL",
  (portal) => {
    expect(loader()).toMatchObject({ data: null, init: { status: 404 } });
    render(
      <MemoryRouter initialEntries={["/unknown"]}>
        <PortalRoutingProvider
          routing={{
            portal,
            origins: {
              customer: "https://playora.example",
              admin: "https://admin.playora.example",
              booster: "https://pro.playora.example",
            },
          }}
        >
          <NotFound />
        </PortalRoutingProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "This page isn’t available.",
    );
    expect(
      screen.getByRole("link", {
        name: `Return to ${portal === "admin" ? "Administration" : portal === "booster" ? "Booster workspace" : "My account"}`,
      }),
    ).toHaveAttribute("href", portal === "customer" ? "/account" : "/");
  },
);
