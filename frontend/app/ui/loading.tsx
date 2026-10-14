import "./loading.css";

/** Presentation only: callers retain their existing access and error boundaries. */
export function Loading({
  label = "Loading your page…",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div className="playora-loading" data-compact={compact} role="status">
      <span className="ui-visually-hidden">{label}</span>
      <div className="playora-loading-art" aria-hidden="true">
        <span className="playora-loading-orbit" />
        <img src="/brand/playora-symbol.svg" width="64" height="64" alt="" />
      </div>
      <div className="playora-loading-trail" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
