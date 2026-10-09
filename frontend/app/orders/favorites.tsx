import "../ui/secondary.css";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "../portal-router";
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
  const savedRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (busy || document.hidden || !document.hasFocus()) return;
    if (error) errorRef.current?.focus();
    else if (saved)
      savedRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
  }, [saved, error, busy]);
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
      <div
        ref={errorRef}
        tabIndex={-1}
        role="group"
        aria-label="Favorite could not be saved"
      >
        <ErrorNotice error={error} />
      </div>
      {saved && (
        <div ref={savedRef}>
          <Link to="/favorites">View favorites</Link>
        </div>
      )}
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
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const awaitingRemoval = useRef(false);
  useEffect(() => {
    if (busy || resource.loading) return;
    if (error || resource.error) {
      awaitingRemoval.current = false;
      if (!document.hidden && document.hasFocus()) errorRef.current?.focus();
    } else if (awaitingRemoval.current) {
      awaitingRemoval.current = false;
      if (!document.hidden && document.hasFocus()) headingRef.current?.focus();
    }
  }, [busy, error, resource.data, resource.error, resource.loading]);
  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      await command(`/me/favorites/${id}/remove`);
      awaitingRemoval.current = true;
      resource.reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h2 ref={headingRef} tabIndex={-1}>
        Your saved offers
      </h2>
      <p>Favorites do not reserve availability or prices.</p>
      <Action disabled={resource.loading} onClick={resource.reload}>
        Refresh favorites
      </Action>
      <div
        ref={errorRef}
        tabIndex={-1}
        role="group"
        aria-label="Favorites could not be updated"
      >
        <ErrorNotice error={resource.error ?? error} />
      </div>
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
