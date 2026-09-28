import { useEffect, useRef } from "react";
import { Link, useLocation, type Location } from "react-router";
import type { FieldIssue } from "../ui/form-validation";
export function ArticleIssues({ issues }: { issues: readonly FieldIssue[] }) {
  const location: Location<unknown> = useLocation(),
    summary = useRef<HTMLElement>(null);
  const fingerprint = JSON.stringify(issues);
  useEffect(() => {
    if (fingerprint !== "[]") summary.current?.focus();
  }, [fingerprint]);
  useEffect(() => {
    const field = new URLSearchParams(location.search).get("field");
    if (
      !field ||
      field.length > 100 ||
      field.split(".").some((part) => !/^[_a-z0-9]+$/.test(part))
    )
      return;
    const frame = requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(
          `[name="${field}"], [data-news-field="${field}"]`,
        )
        ?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [location.search]);
  if (!issues.length) return null;
  return (
    <section role="alert" tabIndex={-1} ref={summary}>
      <h3>Check these article details</h3>
      <ul>
        {issues.map((issue, index) => {
          const q = new URLSearchParams(location.search);
          q.set("section", issue.path === "at" ? "publication" : "editor");
          q.set("field", issue.path);
          const label = issue.path.startsWith("blocks.")
            ? `Body block ${String(Number(issue.path.split(".")[1]) + 1)}`
            : issue.path.replaceAll("_", " ");
          return (
            <li key={index}>
              <Link
                to={{ pathname: location.pathname, search: q.toString() }}
                state={location.state}
              >
                {label}: {issue.message}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
