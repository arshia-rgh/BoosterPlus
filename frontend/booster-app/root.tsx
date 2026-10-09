import { ActionVerificationDialog } from "../app/identity/action-verification-dialog";
import CustomerActivity from "../app/account/activity";
import ErrorPage from "../app/ui/error-page";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
  useMatches,
} from "react-router";
import type { ReactNode } from "react";
import type { LoaderFunctionArgs } from "react-router";
import "../app/styles.css";
import { AmbientBackdrop, SiteFooter, SiteHeader } from "../app/ui/site-chrome";
import "../app/ui/design-system.css";
import { PortalRoutingProvider } from "../app/portal-router";
import { routingContext } from "../app/portal/routing.server";

export function loader({ request }: LoaderFunctionArgs) {
  return {
    nonce: request.headers.get("x-csp-nonce") ?? undefined,
    routing: routingContext(request),
  };
}
export function shouldRevalidate() {
  return false;
}

export function Layout({ children }: { children: ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  const workspace = useMatches().some(
    (match) => match.id === "routes/workspace",
  );
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="icon"
          type="image/svg+xml"
          href="/brand/playora-symbol.svg"
        />
        <Meta />
        {workspace && <meta name="robots" content="noindex,nofollow" />}
        <Links />
      </head>
      <body className="storefront-app" data-portal={data?.routing?.portal}>
        <PortalRoutingProvider routing={data?.routing ?? null}>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <AmbientBackdrop />
          <SiteHeader />
          {children}
          <SiteFooter />
          <ActionVerificationDialog />
          {!workspace && data?.routing?.portal !== "booster" && (
            <CustomerActivity />
          )}
          <ScrollRestoration nonce={data?.nonce} />
          <Scripts nonce={data?.nonce} />
        </PortalRoutingProvider>
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: { error: unknown }) {
  return <ErrorPage error={error} />;
}
