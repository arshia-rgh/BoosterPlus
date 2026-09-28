import type { Location } from "react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
  headingLevel = 1,
  keepMounted = [],
  compactReference = false,
  stickyStatus,
}: {
  id: string;
  title: string;
  workspace: "My account" | "Booster workspace" | "Admin workspace";
  status: ReactNode;
  back: { to: string; label: string; state?: unknown };
  sections: readonly RecordSection[];
  children: (section: string, visible: boolean) => ReactNode;
  headingLevel?: 1 | 2;
  keepMounted?: readonly string[];
  compactReference?: boolean;
  stickyStatus?: string;
}) {
  const location: Location<unknown> = useLocation();
  const { pathname, search, state } = location;
  const selected = new URLSearchParams(search).get("section");
  const active =
    sections.find((section) => section.id === selected)?.id ??
    sections[0]?.id ??
    "overview";
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const [visited, setVisited] = useState([active]);
  if (!visited.includes(active)) setVisited([...visited, active]);
  const content = useRef<HTMLDivElement>(null);
  const sectionNavigation = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!stickyStatus) return;
    const navigation = sectionNavigation.current;
    const selectedLink =
      navigation?.querySelector<HTMLElement>("[aria-current]");
    if (!navigation || !selectedLink) return;
    const center = () => {
      const frame = navigation.getBoundingClientRect();
      const link = selectedLink.getBoundingClientRect();
      navigation.scrollLeft +=
        link.left - frame.left - (frame.width - link.width) / 2;
    };
    center();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(center);
    observer.observe(navigation);
    observer.observe(selectedLink);
    return () => {
      observer.disconnect();
    };
  }, [active, stickyStatus]);
  const previous = useRef(active);
  useEffect(() => {
    if (previous.current !== active) {
      previous.current = active;
      content.current?.focus({ preventScroll: true });
      const heading = content.current?.querySelector<HTMLElement>(
        "[data-record-section]:not([hidden]) h2, [data-record-section]:not([hidden]) h3",
      );
      if (heading && typeof heading.scrollIntoView === "function")
        heading.scrollIntoView({ block: "nearest" });
    }
  }, [active]);
  return (
    <section className="record-shell" aria-label={`${title} ${id}`}>
      <header className="record-heading">
        <Link className="context-back" to={back.to} state={back.state}>
          ← {back.label}
        </Link>
        <p className="eyebrow">{workspace}</p>
        <Heading
          tabIndex={-1}
          aria-label={compactReference ? `${title} ${id}` : undefined}
        >
          {title} {compactReference && id.length === 36 ? id.slice(0, 8) : id}
        </Heading>
        <div className="record-status">{status}</div>
      </header>
      <div className={stickyStatus ? "record-sticky-context" : undefined}>
        {stickyStatus && (
          <p className="record-context-line">
            <strong>
              {workspace} · {title} {id.slice(0, 8)}
            </strong>
            <span>{stickyStatus}</span>
          </p>
        )}
        <nav
          ref={sectionNavigation}
          className="record-sections"
          aria-label={`${title} sections`}
        >
          {sections.map((section) => {
            const query = new URLSearchParams(search);
            query.set("section", section.id);
            return (
              <Link
                key={section.id}
                to={{ pathname, search: `?${query.toString()}` }}
                state={state}
                preventScrollReset
                aria-current={active === section.id ? "page" : undefined}
              >
                {section.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div ref={content} tabIndex={-1} className="record-content">
        {sections.map((section) => {
          const visible = section.id === active;
          if (
            !visible &&
            !(keepMounted.includes(section.id) && visited.includes(section.id))
          )
            return null;
          return (
            <div
              key={section.id}
              hidden={!visible}
              data-record-section={section.id}
            >
              {children(section.id, visible)}
            </div>
          );
        })}
      </div>
    </section>
  );
}
