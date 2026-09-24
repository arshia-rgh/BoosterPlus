import { useEffect, useRef, type ReactNode } from "react";
import { Link, useLocation } from "react-router";

export interface RecordSection {
  id: string;
  label: string;
}

/** Local navigation keeps record identity mounted. Callers own drafts and resource access. */
export function RecordShell({
  id,
  title,
  workspace,
  status,
  back,
  sections,
  children,
}: {
  id: string;
  title: string;
  workspace: "My account" | "Booster workspace" | "Admin workspace";
  status: ReactNode;
  back: { to: string; label: string };
  sections: readonly RecordSection[];
  children: (section: string) => ReactNode;
}) {
  const { pathname, search } = useLocation();
  const selected = new URLSearchParams(search).get("section");
  const active =
    sections.find((section) => section.id === selected)?.id ??
    sections[0]?.id ??
    "overview";
  const content = useRef<HTMLDivElement>(null);
  const previous = useRef(active);
  useEffect(() => {
    if (previous.current !== active) {
      previous.current = active;
      content.current?.focus({ preventScroll: true });
    }
  }, [active]);
  return (
    <section className="record-shell" aria-label={`${title} ${id}`}>
      <header className="record-heading">
        <Link className="context-back" to={back.to}>
          ← {back.label}
        </Link>
        <p className="eyebrow">{workspace}</p>
        <h1 tabIndex={-1}>
          {title} {id}
        </h1>
        <div className="record-status">{status}</div>
      </header>
      <nav className="record-sections" aria-label={`${title} sections`}>
        {sections.map((section) => {
          const query = new URLSearchParams(search);
          query.set("section", section.id);
          return (
            <Link
              key={section.id}
              to={{ pathname, search: `?${query.toString()}` }}
              preventScrollReset
              aria-current={active === section.id ? "page" : undefined}
            >
              {section.label}
            </Link>
          );
        })}
      </nav>
      <div ref={content} tabIndex={-1} className="record-content">
        {children(active)}
      </div>
    </section>
  );
}
