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
import type { Route } from "./+types/root";
import "./styles.css";

export function loader({ request }: Route.LoaderArgs) {
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
        <Meta />
        <Links />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <Link className="brand" to="/" aria-label="Booster Plus home">
            BOOSTER<span>+</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link to="/games">Games</Link>
            <Link to="/account">Account</Link>
          </nav>
        </header>
        {children}
        <footer>
          <span>Booster Plus</span>
          <span>Game boosting. Account trading.</span>
        </footer>
        <ScrollRestoration nonce={data?.nonce} />
        <Scripts nonce={data?.nonce} />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
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
