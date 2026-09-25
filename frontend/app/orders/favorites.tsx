import "../ui/secondary.css";
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
  gameLabel = false,
}: {
  kind: string;
  slug: string;
  service?: string;
  pack?: string;
  gameLabel?: boolean;
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
    <div className="catalog-actions favorite-actions">
      <button
        className="button compact secondary-action"
        type="button"
        disabled={busy || saved}
        onClick={() => void save()}
      >
        {saved
          ? gameLabel
            ? "Game saved to favorites"
            : "Saved to favorites"
          : gameLabel
            ? "Save game to favorites"
            : "Save to favorites"}
      </button>
      <ErrorNotice error={error} />
      {saved && <Link to="/favorites">View favorites</Link>}
    </div>
  );
}
function destination(item: Favorite) {
  if (item.kind === "account")
    return `/accounts/${encodeURIComponent(item.package)}`;
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
      <Action disabled={resource.loading} onClick={resource.reload}>
        Refresh favorites
      </Action>
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
          <ul className="secondary-list favorite-list">
            {resource.data.favorites.map((item) => (
              <li key={item.id}>
                {item.available ? (
                  <Link to={destination(item)}>{item.name}</Link>
                ) : (
                  <span>{item.name} · Currently unavailable</span>
                )}{" "}
                <button
                  className="button compact secondary-action"
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  disabled={busy || resource.loading}
                  onClick={() => void remove(item.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          {resource.data.next && (
            <Link
              to={`/favorites?after=${encodeURIComponent(resource.data.next)}`}
            >
              Next favorites
            </Link>
          )}
        </>
      )}
      {params.get("after") && <Link to="/favorites">Newest favorites</Link>}
    </section>
  );
}
