import { ActionVerificationDialog } from "../app/identity/action-verification-dialog";
import ErrorPage from "../app/ui/error-page";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
  type LoaderFunctionArgs,
} from "react-router";
import type { ReactNode } from "react";
import { IdentityFrame } from "../app/identity/frame";
import AdminShell from "../app/admin/shell";
import AccountRouteFocus from "../app/account/route-focus";
import "../app/styles.css";
import "../app/admin/admin.css";
import "../app/ui/design-system.css";
import "../app/ui/champagne.css";
import { AmbientBackdrop, SiteFooter } from "../app/ui/site-chrome";
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
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <link
          rel="icon"
          type="image/svg+xml"
          href="/brand/playora-symbol.svg"
        />
        <Meta />
        <Links />
      </head>
      <body className="admin-app" data-portal={data?.routing?.portal}>
        <PortalRoutingProvider routing={data?.routing ?? null}>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <AmbientBackdrop />
          {children}
          <SiteFooter />
          <ActionVerificationDialog />
          <ScrollRestoration nonce={data?.nonce} />
          <Scripts nonce={data?.nonce} />
        </PortalRoutingProvider>
      </body>
    </html>
  );
}
export default function App() {
  return (
    <IdentityFrame value={AdminShell}>
      <AccountRouteFocus />
      <Outlet />
    </IdentityFrame>
  );
}
export function ErrorBoundary({ error }: { error: unknown }) {
  return (
    <>
      <AccountRouteFocus />
      <ErrorPage error={error} admin />
    </>
  );
}
