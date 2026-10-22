import { useRef, type RefObject } from "react";
import { Link } from "../portal-router";
import { useResource } from "../orders/resource";
import { z } from "../validation";

// Staff-authored plain text. React renders it as text; markup is never parsed.
export const wantedPublicSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().max(36),
        title: z.string().min(1).max(80),
        description: z.string().max(300),
      }),
    )
    .max(6),
});
export type WantedPublic = z.infer<typeof wantedPublicSchema>;

// Non-essential promotion: empty and failed reads render no list. "settled"
// keeps the request block from flashing the wrong variant while loading.
export function useWantedAccounts(slug: string) {
  const resource = useResource(
    `/games/${encodeURIComponent(slug)}/wanted-accounts`,
    wantedPublicSchema,
  );
  return {
    settled: !!resource.error || !!resource.data,
    items: !resource.error && resource.data ? resource.data.items : [],
  };
}

function requestPath(slug: string) {
  return `/support?account_request=${encodeURIComponent(slug)}`;
}

// Buyers ask staff for an account; staff may later publish it as wanted.
export function AccountRequest({ slug }: { slug: string }) {
  return (
    <section
      className="account-request"
      aria-labelledby="account-request-title"
    >
      <h3 id="account-request-title">Looking for a specific account?</h3>
      <p>Message our team with what you want to buy.</p>
      <Link className="button secondary" to={requestPath(slug)}>
        Request an account
      </Link>
    </section>
  );
}

export function useWantedSection() {
  return useRef<HTMLElement>(null);
}

export function WantedTeaser({
  section,
}: {
  section: RefObject<HTMLElement | null>;
}) {
  return (
    <a
      href="#wanted-accounts"
      onClick={(event) => {
        const target = section.current;
        if (!target) return;
        event.preventDefault();
        const reduced = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        target.scrollIntoView({
          block: "start",
          behavior: reduced ? "auto" : "smooth",
        });
        target.focus({ preventScroll: true });
      }}
    >
      Wanted accounts ↓
    </a>
  );
}

export function WantedAccounts({
  slug,
  items,
  section,
}: {
  slug: string;
  items: WantedPublic["items"];
  section: RefObject<HTMLElement | null>;
}) {
  if (!items.length) return null;
  return (
    <section
      ref={section}
      id="wanted-accounts"
      className="wanted-accounts"
      aria-labelledby="wanted-accounts-title"
      tabIndex={-1}
    >
      <p className="eyebrow">Sell to PLAYORA</p>
      <h3 id="wanted-accounts-title">Wanted accounts</h3>
      <p className="wanted-intro">
        Own a matching account? Start a sale and we&apos;ll review it.
      </p>
      <ul className="wanted-list">
        {items.map((item) => (
          <li key={item.id}>
            <article aria-labelledby={`wanted-${item.id}`}>
              <h4 id={`wanted-${item.id}`}>{item.title}</h4>
              {item.description && <p>{item.description}</p>}
            </article>
          </li>
        ))}
      </ul>
      <div className="wanted-actions">
        <Link
          className="button"
          to={`/sell/new?slug=${encodeURIComponent(slug)}`}
        >
          Sell your account
        </Link>
      </div>
      <div className="account-request-row">
        <p>
          Looking for a different account? Message our team with what you want
          to buy.
        </p>
        <Link className="button secondary" to={requestPath(slug)}>
          Request an account
        </Link>
      </div>
    </section>
  );
}
