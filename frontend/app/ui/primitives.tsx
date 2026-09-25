import { type ReactNode, type ButtonHTMLAttributes } from "react";
import "./primitives.css";
export function Button({
  variant = "primary",
  className = "",
  type = "button",
  disabled,
  busy,
  busyLabel = "Please wait…",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "text" | "destructive";
  busy?: boolean;
  busyLabel?: string;
}) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`ui-button ${className}`}
      data-variant={variant}
    >
      <span
        className="ui-button-label"
        data-visible={!busy}
        aria-hidden={busy || undefined}
      >
        {children}
      </span>
      {busy !== undefined && (
        <span
          className="ui-button-label"
          data-visible={busy}
          aria-hidden={!busy}
        >
          {busyLabel}
        </span>
      )}
    </button>
  );
}
export function StatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "positive" | "warning" | "danger" | "info";
  children: ReactNode;
}) {
  return (
    <span className="ui-status-badge" data-tone={tone}>
      {children}
    </span>
  );
}
/** Decorative geometry never substitutes for the accessible loading status. */
export function Skeleton({
  label = "Loading content…",
  lines = 3,
}: {
  label?: string;
  lines?: number;
}) {
  const count = Number.isFinite(lines)
    ? Math.min(6, Math.max(1, Math.floor(lines)))
    : 3;
  return (
    <div
      className="ui-skeleton"
      role={label ? "status" : undefined}
      aria-hidden={label ? undefined : true}
    >
      {label && <span className="ui-visually-hidden">{label}</span>}
      <div aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <span key={i} />
        ))}
      </div>
    </div>
  );
}
export function TableRegion({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Named overflow region supports keyboard scrolling, including iOS; focus and arrow behavior are browser-tested.
    <div
      className={`ui-table-region ${className}`}
      role="region"
      aria-label={label}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The named scroll region must receive keyboard focus; its table keeps native table semantics.
      tabIndex={0}
      onKeyDown={(event) => {
        if (
          event.target !== event.currentTarget ||
          !["ArrowLeft", "ArrowRight"].includes(event.key)
        )
          return;
        event.preventDefault();
        event.currentTarget.scrollBy({
          left: event.key === "ArrowRight" ? 80 : -80,
        });
      }}
    >
      {children}
    </div>
  );
}
