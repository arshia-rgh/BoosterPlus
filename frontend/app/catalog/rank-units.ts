import {
  optionsFor,
  type Answers,
  type Configuration,
  type Field,
  type Service,
} from "./model";

/** Keep rank progress in one group even when a game names its units differently. */
export function isRankGoalField(service: Service, field: Field): boolean {
  return (
    field.type === "rank" ||
    service.rules.some(
      (rule) =>
        rule.kind === "progression" &&
        (rule.from_units === field.key || rule.to_units === field.key),
    )
  );
}

/** Presentation bounds use actual displayed stars; the server prices interval widths. */
export function rankUnitsField(
  service: Service,
  config: Configuration,
  field: Field,
  answers: Answers,
): Field {
  for (const rule of service.rules) {
    if (rule.kind !== "progression") continue;
    const rankKey =
      rule.from_units === field.key
        ? rule.from
        : rule.to_units === field.key
          ? rule.to
          : undefined;
    const rank = service.fields.find((candidate) => candidate.key === rankKey);
    if (!rank) continue;
    const option = optionsFor(rank, config).find(
      (candidate) => candidate.key === answers[rank.key],
    );
    if (!option || option.units < 1) continue;
    const lo = option.unit_start ?? 0,
      hi = lo + option.units - (option.unit_start === undefined ? 0 : 1);
    return {
      ...field,
      min: String(lo),
      max: String(hi),
      help: `${option.label}: ${String(lo)}–${String(hi)} stars. ${field.help}`.trim(),
    };
  }
  return field;
}

export function rankUnitsError(
  service: Service,
  config: Configuration,
  field: Field,
  answers: Answers,
): string | undefined {
  const bounded = rankUnitsField(service, config, field, answers),
    value = answers[field.key];
  if (bounded === field || typeof value !== "string" || value === "") return;
  if (
    !/^\d+$/.test(value) ||
    Number(value) < Number(bounded.min) ||
    Number(value) > Number(bounded.max)
  )
    return `Enter ${bounded.min}–${bounded.max} stars for the selected rank, or change the rank.`;
}
