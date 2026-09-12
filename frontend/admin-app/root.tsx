import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
  isRouteErrorResponse,
  type LoaderFunctionArgs,
} from "react-router";
import type { ReactNode } from "react";
import { IdentityFrame } from "../app/identity/frame";
import AdminShell from "../app/admin/shell";
import "../app/styles.css";
import "../app/admin/admin.css";
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
        <Meta />
        <Links />
      </head>
      <body className="admin-app">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
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
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main id="main" className="page">
      <p className="eyebrow">Booster Plus staff</p>
      <h1>{missing ? "Page not found" : "Workspace unavailable"}</h1>
      <p>
        {missing
          ? "This staff page does not exist."
          : "Please try again shortly."}
      </p>
      <a className="button" href="/admin">
        Return to administration
      </a>
    </main>
  );
}
