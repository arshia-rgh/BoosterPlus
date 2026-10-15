import { z } from "../../validation";
export const formFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  kind: z.enum(["text", "multiline", "select"]),
  required: z.boolean(),
  secure: z.boolean(),
  options: z.array(z.string()).optional(),
});
export type FormField = z.infer<typeof formFieldSchema>;
export const chatFormSchema = z.object({
  id: z.string(),
  version: z.number(),
  title: z.string(),
  description: z.string(),
  mode: z.string(),
  purpose: z.string(),
  recipient: z.string(),
  audience: z.string(),
  state: z.string(),
  fields: z.array(formFieldSchema),
  answers: z.record(z.string(), z.string()),
  has_secure: z.boolean(),
  can_respond: z.boolean(),
  can_reveal: z.boolean(),
  can_cancel: z.boolean(),
  expires_at: z.string(),
  answered_at: z.string().nullable(),
});
export type ChatForm = z.infer<typeof chatFormSchema>;
export const formOptionsSchema = z.object({
  open: z.boolean(),
  booster: z.boolean(),
  purposes: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      modes: z.array(z.string()),
      max_hours: z.number(),
    }),
  ),
});
export const secureAnswersSchema = z.record(z.string(), z.string());

export function answerIssues(
  fields: FormField[],
  answers: Record<string, string>,
) {
  return fields.flatMap((field) => {
    const value = answers[field.key] ?? "";
    const valid =
      (!field.required || value.trim().length > 0) &&
      Array.from(value).length <= 2000 &&
      (!value || field.kind !== "select" || field.options?.includes(value));
    return valid
      ? []
      : [
          {
            path: `answers.${field.key}`,
            message:
              field.kind === "select"
                ? "Choose one of the listed options."
                : "Complete this field using at most 2,000 characters.",
          },
        ];
  });
}
