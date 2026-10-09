import type { FieldIssue } from "./form-validation";

/** JSON converts non-finite numbers to null. Reject them before any mutation. */
export function invalidNumericFields(value: unknown): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const visited = new WeakSet<object>();
  function visit(current: unknown, path: string) {
    if (typeof current === "number" && !Number.isFinite(current)) {
      issues.push({
        path: path.replace(/^(?:data|configuration|definition)\./, ""),
        message: "Enter a whole number before continuing.",
      });
    } else if (
      current !== null &&
      typeof current === "object" &&
      !visited.has(current)
    ) {
      visited.add(current);
      for (const [key, item] of Object.entries(current))
        visit(item, path ? `${path}.${key}` : key);
    }
  }
  visit(value, "");
  return issues;
}
