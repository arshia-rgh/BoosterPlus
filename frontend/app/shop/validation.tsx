import { useEffect, useRef } from "react";
import { Link, useLocation, type Location } from "react-router";
import type { FieldIssue } from "../ui/form-validation";
export function registerField() {
  return () => {};
}
export function fieldIssues(issues: readonly FieldIssue[]) {
  return issues.map((issue) => ({
    ...issue,
    path: issue.path
      .replace(/\.price$/, ".unit_amount_minor")
      .replace(/\.quantity$/, ".min_quantity")
      .replace(/^policy.delivery$/, "policy.delivery_min_hours"),
  }));
}
function section(path: string) {
  if (path.startsWith("variants")) return ["variants", "Variants and prices"];
  if (path.startsWith("recipient"))
    return ["recipient", "Delivery information"];
  if (path.startsWith("policy"))
    return ["terms", "Delivery and commercial terms"];
  if (path === "reviewed") return ["publication", "Publication review"];
  return ["basics", "Product details"];
}
export function ShopIssues({ issues }: { issues: readonly FieldIssue[] }) {
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
      field.split(".").some((part) => !/^[a-z_0-9]+$/.test(part))
    )
      return;
    const frame = requestAnimationFrame(() => {
      const input = document.querySelector<HTMLElement>(`[name="${field}"]`);
      input?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [location.search]);
  if (!issues.length) return null;
  return (
    <section role="alert" tabIndex={-1} ref={summary}>
      <h3>Check these product details</h3>
      <ul>
        {fieldIssues(issues).map((issue, i) => {
          const [id, label] = section(issue.path),
            query = new URLSearchParams(location.search);
          query.set("section", id ?? "basics");
          query.set("field", issue.path);
          return (
            <li key={i}>
              <Link
                to={{ pathname: location.pathname, search: query.toString() }}
                state={location.state}
              >
                {label} · {fieldLabel(issue.path)}: {issue.message}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function fieldLabel(path: string): string {
  const labels = new Map<string, string>([
    ["title", "Product title"],
    ["description", "Description"],
    ["category", "Category"],
    ["asset", "Artwork"],
    ["asset_alt", "Artwork alternative text"],
    ["asset_source", "Artwork permission"],
    ["reviewed", "Public details and artwork review"],
    ["variants", "Offered variants"],
    ["recipient", "Delivery identifiers"],
    ["delivery_min_hours", "Minimum delivery hours"],
    ["delivery_max_hours", "Maximum delivery hours"],
    ["reservation_minutes", "Reservation minutes"],
    ["delivery_terms", "Delivery terms"],
    ["cancellation_terms", "Cancellation terms"],
    ["refund_terms", "Refund terms"],
    ["fees", "Fees"],
    ["review_terms", "Customer review terms"],
    ["evidence_required", "Delivery evidence"],
    ["key", "Stable key"],
    ["label", "Label"],
    ["region", "Supported region"],
    ["platform", "Supported platform"],
    ["server", "Supported server"],
    ["currency", "Price currency"],
    ["unit_amount_minor", "Unit price"],
    ["min_quantity", "Quantity limits"],
    ["max_length", "Maximum characters"],
    ["help", "Customer guidance"],
  ]);
  const parts = path.split(".");
  const key = parts.at(-1) ?? path;
  const prefix =
    parts[0] === "variants" && parts.length > 1
      ? "Variant "
      : parts[0] === "recipient" && parts.length > 1
        ? "Delivery field "
        : "";
  const position = parts[1] ?? "";
  const named = labels.get(key) ?? "Configuration";
  return prefix && /^[0-9]{1,2}$/.test(position)
    ? `${prefix}${String(Number(position) + 1)} · ${named}`
    : named;
}
