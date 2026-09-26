import type { z } from "../validation";
import { APIError } from "../identity/api";

function instruction(issue: z.core.$ZodIssue): string {
  const path = issue.path.map(String).join(".");
  const ranges = new Map([
    ["metrics.window_days", "Enter a whole number from 1 to 366 days."],
    [
      "metrics.minimum_sample",
      "Enter a whole number from 5 to 1,000,000 records.",
    ],
    [
      "metrics.maximum_age_seconds",
      "Enter a whole number from 30 to 86,400 seconds.",
    ],
  ]);
  const range = ranges.get(path);
  if (range) return range;
  if (issue.code === "too_small") {
    if (issue.origin === "string") {
      if (Number(issue.minimum) === 1)
        return path.endsWith("title")
          ? "Enter a title."
          : path.endsWith("description")
            ? "Enter a description."
            : "Enter a value.";
      return `Use at least ${String(issue.minimum)} characters.`;
    }
    if (issue.origin === "array")
      return "Include all five service introductions.";
  }
  if (issue.code === "too_big") {
    if (issue.origin === "string")
      return `Use at most ${String(issue.maximum)} characters.`;
    if (issue.origin === "array")
      return `Use at most ${String(issue.maximum)} sections.`;
  }
  return "Review this value and choose a supported option.";
}

/** Keep authoring errors distinct from transport failures and map them to the
 * existing accessible summary/fields without exposing schema jargon or JSON. */
export function parseContent<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const error = new APIError(
    "Review the content fields below. Your draft changes are still here.",
  );
  error.code = "content_invalid";
  error.status = 422;
  error.issues = result.error.issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: instruction(issue),
  }));
  throw error;
}
