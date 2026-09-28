import {
  Link,
  isRouteErrorResponse,
  useParams,
  useRevalidator,
  useRouteError,
  useSearchParams,
} from "react-router";
import { Action } from "../catalog/controls";
export function NewsError() {
  const error = useRouteError(),
    revalidator = useRevalidator(),
    { slug = "" } = useParams();
  const [params] = useSearchParams();
  const query = new URLSearchParams();
  for (const k of ["q", "kind", "after"]) {
    const v = params.get(k);
    if (v) query.set(k, v);
  }
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return (
    <section className="news-index">
      <h2>
        {missing ? "This article is unavailable" : "News could not be loaded"}
      </h2>
      <p>
        {missing
          ? "It may no longer be published. Your game and news filters are preserved."
          : "Your reading context is preserved. Retry when the connection is available."}
      </p>
      <div className="catalog-actions">
        <Link
          to={`/games/${encodeURIComponent(slug)}/news${query.size ? `?${query.toString()}` : ""}`}
          preventScrollReset
        >
          Back to news & guides
        </Link>
        <Action
          disabled={revalidator.state !== "idle"}
          onClick={() => {
            void revalidator.revalidate();
          }}
        >
          {revalidator.state === "idle" ? "Retry news" : "Checking news…"}
        </Action>
      </div>
    </section>
  );
}
