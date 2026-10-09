import { useEffect, useRef } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  type Location,
} from "../portal-router";
import { focusValidationTarget, type FieldIssue } from "../ui/form-validation";
export function ArticleIssues({
  issues,
  attempt = 0,
}: {
  issues: readonly FieldIssue[];
  attempt?: number;
}) {
  const location: Location<unknown> = useLocation(),
    summary = useRef<HTMLElement>(null);
  const fingerprint = JSON.stringify([attempt, issues]);
  const navigate = useNavigate();
  const attempted = useRef("");
  useEffect(() => {
    if (attempted.current === fingerprint) return;
    attempted.current = fingerprint;
    const first = issues[0];
    if (!first) return;
    const query = new URLSearchParams(location.search);
    query.set("section", first.path === "at" ? "publication" : "editor");
    query.set("field", first.path);
    void navigate(
      { pathname: location.pathname, search: query.toString() },
      { replace: true, preventScrollReset: true, state: location.state },
    );
    summary.current?.focus({ preventScroll: true });
  }, [
    fingerprint,
    issues,
    location.pathname,
    location.search,
    location.state,
    navigate,
  ]);
  useEffect(() => {
    const field = new URLSearchParams(location.search).get("field");
    if (
      !field ||
      field.length > 100 ||
      field.split(".").some((part) => !/^[_a-z0-9]+$/.test(part))
    )
      return;
    const frame = requestAnimationFrame(() => {
      focusValidationTarget(
        document.querySelector<HTMLElement>(
          `[name="${field}"], [data-news-field="${field}"]`,
        ),
      );
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [location.search, fingerprint]);
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
