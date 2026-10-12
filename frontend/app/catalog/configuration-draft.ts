import { z } from "../validation";
import { isWinRateField, parseWinRate } from "./win-rate";
import { restoredAutomaticParents } from "./linked-choices";
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
  automatic_parents: z.array(z.string().max(100)).max(100).optional(),
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
    if (isWinRateField(field)) {
      if (typeof value === "string") {
        const preference = parseWinRate(value);
        if (preference.kind !== "invalid" && preference.kind !== "legacy")
          safe[field.key] = value;
      }
      continue;
    }
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
  automaticParents: ReadonlySet<string> = new Set(),
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
        automatic_parents: [...automaticParents].filter((key) =>
          restoredAutomaticParents(
            service,
            safeConfiguration(service, config, answers),
          ).has(key),
        ),
      }),
    );
  } catch {
    /* Sign-in still works without persistence. */
  }
}

/** Call only with answers returned by restoreConfiguration for this same draft. */
export function restoreDraftParents(
  raw: string,
  service: Service,
  answers: Answers,
) {
  const candidates = restoredAutomaticParents(service, answers);
  try {
    const saved = draftSchema.parse(JSON.parse(raw)).automatic_parents;
    return saved
      ? new Set(saved.filter((key) => candidates.has(key)))
      : candidates;
  } catch {
    return candidates;
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
