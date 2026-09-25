import { Link, useLocation, useNavigation } from "react-router";
import "./primitives.css";
/** Filter changes always invalidate a cursor; cursor changes retain all filters. */
export function filterQuery(
  current: URLSearchParams,
  changes: Readonly<Record<string, string | null>>,
) {
  const next = new URLSearchParams(current);
  next.delete("after");
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) next.delete(key);
    else next.set(key, value);
  }
  return next;
}
export function CursorPagination({
  next,
  label = "Results pagination",
  nextLabel = "Next results",
}: {
  next: string;
  label?: string;
  nextLabel?: string;
}) {
  const location = useLocation(),
    navigation = useNavigation();
  const params = new URLSearchParams(location.search);
  const after = params.get("after");
  const pending =
    navigation.state !== "idle" &&
    navigation.location.pathname === location.pathname;
  const destination = (cursor: string | null) => {
    const query = new URLSearchParams(params);
    if (cursor === null) query.delete("after");
    else query.set("after", cursor);
    return {
      pathname: location.pathname,
      search: query.size ? `?${query.toString()}` : "",
    };
  };
  if (!next && !after) return null;
  return (
    <nav className="ui-pagination" aria-label={label} aria-busy={pending}>
      {after && (
        <Link
          className="button ui-button"
          data-variant="secondary"
          to={destination(null)}
          aria-disabled={pending}
          onClick={(event) => {
            if (pending) event.preventDefault();
          }}
        >
          First page
        </Link>
      )}
      {next && (
        <Link
          className="button ui-button"
          data-variant="secondary"
          to={destination(next)}
          aria-disabled={pending}
          onClick={(event) => {
            if (pending) event.preventDefault();
          }}
        >
          {nextLabel}
        </Link>
      )}
      {pending && <p role="status">Loading results…</p>}
    </nav>
  );
}
