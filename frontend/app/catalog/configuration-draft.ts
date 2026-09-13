import { z } from "../validation";
import {
  answersSchema,
  optionsFor,
  visibleAnswers,
  type Answers,
  type Configuration,
  type Service,
} from "./model";
const key = "playora.configuration";
const draftSchema = z.object({
  release: z.string().max(100),
  service: z.string().max(100),
  pack: z.string().max(100),
  variant: z.string().max(100),
  expires: z.number(),
  answers: answersSchema,
});
export function draftSnapshot() {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
export function subscribeDraft(notify: () => void) {
  const update = (event: StorageEvent) => {
    if (event.key === key || event.key === null) notify();
  };
  window.addEventListener("storage", update);
  return () => {
    window.removeEventListener("storage", update);
  };
}
export function clearConfigurationDraft() {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* Optional convenience storage. */
  }
}
export function safeConfiguration(
  service: Service,
  config: Configuration,
  answers: Answers,
): Answers {
  const safe: Answers = {};
  for (const field of service.fields) {
    if (field.stage !== "estimate") continue;
    const value = answers[field.key];
    const options = optionsFor(field, config).map((item) => item.key);
    if (
      ["select", "rank", "radio"].includes(field.type) &&
      typeof value === "string" &&
      options.includes(value)
    )
      safe[field.key] = value;
    else if (
      field.type === "multiselect" &&
      Array.isArray(value) &&
      value.length <= 50 &&
      value.every((item) => options.includes(item))
    )
      safe[field.key] = value;
    else if (field.type === "boolean" && typeof value === "boolean")
      safe[field.key] = value;
    else if (
      ["integer", "decimal"].includes(field.type) &&
      typeof value === "string" &&
      (/^-?\d{1,16}$/.test(value) || /^-?\d{1,16}\.\d{1,6}$/.test(value))
    )
      safe[field.key] = value;
  }
  return visibleAnswers(service, safe, "estimate");
}
export function saveConfigurationDraft(
  release: string,
  service: Service,
  config: Configuration,
  pack: string,
  variant: string,
  answers: Answers,
) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        release,
        service: service.key,
        pack,
        variant,
        expires: Date.now() + 15 * 60_000,
        answers: safeConfiguration(service, config, answers),
      }),
    );
  } catch {
    /* Sign-in still works without persistence. */
  }
}
export function restoreConfiguration(
  raw: string | null,
  release: string,
  service: Service,
  config: Configuration,
  pack: string,
  variant: string,
) {
  if (!raw || raw.length > 20000) return null;
  try {
    const value = draftSchema.parse(JSON.parse(raw));
    if (
      value.expires <= Date.now() ||
      value.expires > Date.now() + 15 * 60_000 ||
      value.release !== release ||
      value.service !== service.key ||
      value.pack !== pack ||
      value.variant !== variant
    )
      return null;
    return safeConfiguration(service, config, value.answers);
  } catch {
    return null;
  }
}
