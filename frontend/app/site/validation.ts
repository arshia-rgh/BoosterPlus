import { z } from "../validation";
import { APIError } from "../identity/api";
import {
  homeSchema,
  legalSchema,
  retentionSchema,
  policySectionSchema,
} from "./model";

function instruction(issue: z.core.$ZodIssue): string {
  const path = issue.path.map(String).join(".");
  if (issue.code === "custom") return issue.message;
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

const copy = (minimum: number, maximum: number) =>
  z
    .string()
    .refine(
      (text) =>
        Array.from(text.trim()).length >= minimum &&
        Array.from(text).length <= maximum &&
        !text.includes("\0"),
      {
        message: `Use ${String(minimum)}–${String(maximum)} characters${minimum ? " of meaningful text" : ""}, without control characters.`,
      },
    );
function offeringPath(path: string) {
  const segments = path.split("/");
  if (segments[0] !== "") return false;
  if (segments[1] === "accounts")
    return (
      segments.length === 2 ||
      (segments.length === 3 && /^[a-f0-9-]{36}$/.test(segments[2] ?? ""))
    );
  if (segments[1] !== "games") return false;
  if (segments.length === 2) return true;
  if (!/^[a-z][a-z0-9-]{0,79}$/.test(segments[2] ?? "")) return false;
  return (
    segments.length === 3 ||
    (segments.length === 5 &&
      ["services", "packages"].includes(segments[3] ?? "") &&
      /^[a-z0-9_-]{1,48}$/.test(segments[4] ?? ""))
  );
}
const homeDraft = homeSchema.extend({
  headline: copy(1, 80),
  accent: copy(1, 80),
  description: copy(1, 400),
  notice: copy(0, 300),
  start_rank: copy(1, 60),
  end_rank: copy(1, 60),
  scene_description: copy(1, 400),
  support_hours: copy(0, 300),
  contact_email: z
    .string()
    .refine(
      (text) =>
        text === "" ||
        (text.length <= 254 && z.email().safeParse(text).success),
      { message: "Enter a valid email address, or leave it blank." },
    ),
  faqs: z
    .array(z.object({ question: copy(1, 200), answer: copy(1, 2000) }))
    .max(20),
  featured: z
    .array(
      z.object({
        label: copy(1, 100),
        href: z.string().refine(offeringPath, {
          message: "Use a supported /games or /accounts destination.",
        }),
      }),
    )
    .max(8),
});
const legalDraft = legalSchema.extend({
  text: copy(30, 50000),
  sections: z
    .array(
      policySectionSchema.extend({
        title: copy(1, 120),
        text: copy(20, 10000),
      }),
    )
    .max(8)
    .optional(),
});
const retentionDraft = retentionSchema.extend({
  policy_text: copy(30, 10000),
  backup_policy: copy(20, 4000),
});
const subject = copy(1, 100).refine((text) => !/[\r\n]/.test(text), {
  message: "Keep the subject on one line.",
});
const notificationDraft = z.object({
  activity_subject: subject,
  activity_intro: copy(1, 500),
  availability_subject: subject,
  availability_intro: copy(1, 500),
  footer: copy(0, 1000),
});
/** Authoring checks mirror server bounds without narrowing legacy read schemas. */
export function validateContentDraft(
  kind: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  if (kind === "legal") return parseContent(legalDraft, data);
  if (kind === "retention") return parseContent(retentionDraft, data);
  if (kind === "notifications") return parseContent(notificationDraft, data);
  return parseContent(homeDraft, data);
}
