import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { command, post } from "../identity/api";
import { Action, ErrorNotice } from "../catalog/controls";
import { favoriteSchema, favoritesSchema, type Favorite } from "./model";
import { useResource } from "./resource";
export function FavoriteButton({
  kind,
  slug,
  service = "",
  pack = "",
}: {
  kind: string;
  slug: string;
  service?: string;
  pack?: string;
}) {
  const [saved, setSaved] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function save() {
    setBusy(true);
    setError(null);
    try {
      await post(
        "/me/favorites",
        { kind, slug, service, package: pack },
        favoriteSchema,
      );
      setSaved(true);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <Action disabled={busy || saved} onClick={() => void save()}>
        {saved ? "Saved to favorites" : "Save to favorites"}
      </Action>
      <ErrorNotice error={error} />
      {saved && <Link to="/favorites">View favorites</Link>}
    </div>
  );
}
function destination(item: Favorite) {
  const base = `/games/${encodeURIComponent(item.slug)}`;
  return item.kind === "service"
    ? `${base}/services/${encodeURIComponent(item.service)}`
    : item.kind === "package"
      ? `${base}/packages/${encodeURIComponent(item.package)}`
      : base;
}
export default function Favorites() {
  const [params] = useSearchParams();
  const resource = useResource(
      `/me/favorites?after=${encodeURIComponent(params.get("after") ?? "")}`,
      favoritesSchema,
    ),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      await command(`/me/favorites/${id}/remove`);
      resource.reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h2>Your saved offers</h2>
      <p>Favorites do not reserve availability or prices.</p>
      <Action onClick={resource.reload}>Refresh favorites</Action>
      <ErrorNotice error={resource.error ?? error} />
      {!resource.data ? (
        <p role="status">
          {resource.loading
            ? "Loading favorites…"
            : "Could not load favorites. Use Refresh favorites to try again."}
        </p>
      ) : (
        <>
          {resource.data.favorites.length === 0 && (
            <p>
              No saved offers yet. <Link to="/games">Explore games</Link>.
            </p>
          )}
          <ul className="order-list">
            {resource.data.favorites.map((item) => (
              <li key={item.id}>
                {item.available ? (
                  <Link to={destination(item)}>{item.name}</Link>
                ) : (
                  <span>{item.name} · Currently unavailable</span>
                )}{" "}
                <Action disabled={busy} onClick={() => void remove(item.id)}>
                  Remove {item.name}
                </Action>
              </li>
            ))}
          </ul>
          {resource.data.next && (
            <Link to={`/favorites?after=${resource.data.next}`}>
              Next favorites
            </Link>
          )}
        </>
      )}
    </section>
  );
}
