import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  Link,
  useRouteLoaderData,
} from "react-router";
import type { ReactNode } from "react";
import type { LoaderFunctionArgs } from "react-router";
import "./styles.css";
import { AmbientBackdrop, SiteFooter, SiteHeader } from "./ui/site-chrome";
import "./ui/design-system.css";

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
        <link
          rel="icon"
          type="image/svg+xml"
          href="/brand/playora-symbol.svg"
        />
        <Meta />
        <Links />
      </head>
      <body className="storefront-app">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <AmbientBackdrop />
        <SiteHeader />
        {children}
        <SiteFooter />
        <ScrollRestoration nonce={data?.nonce} />
        <Scripts nonce={data?.nonce} />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: { error: unknown }) {
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main id="main" className="page">
      <p className="eyebrow">{missing ? "404" : "Please try again"}</p>
      <h1>{missing ? "Page not found" : "Something went wrong"}</h1>
      <p>
        {missing
          ? "This page may have moved."
          : "We couldn't load this page. Please try again shortly."}
      </p>
      <Link className="button" to="/">
        Back to home
      </Link>
    </main>
  );
}
