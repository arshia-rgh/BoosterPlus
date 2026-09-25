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
import "../app/styles.css";
import "../app/admin/admin.css";
import "../app/ui/design-system.css";
import { AmbientBackdrop, SiteFooter } from "../app/ui/site-chrome";
export function loader({ request }: LoaderFunctionArgs) {
  return { nonce: request.headers.get("x-csp-nonce") ?? undefined };
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
      <body className="admin-app">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <AmbientBackdrop />
        {children}
        <SiteFooter />
        <ScrollRestoration nonce={data?.nonce} />
        <Scripts nonce={data?.nonce} />
      </body>
    </html>
  );
}
export default function App() {
  return (
    <IdentityFrame value={AdminShell}>
      <Outlet />
    </IdentityFrame>
  );
}
export function ErrorBoundary({ error }: { error: unknown }) {
  return <ErrorPage error={error} admin />;
}
