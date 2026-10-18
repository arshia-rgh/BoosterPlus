import { matches, type Answers, type Service } from "./model";

/** Presentation of authored percentages; authoritative money stays server-side. */
export function selectionSurchargeHint(
  service: Service,
  field: string,
  answers: Answers,
): string | undefined {
  const rules = service.pricing?.surcharges?.filter(
    (r) =>
      r.kind === "selection_count" &&
      r.field === field &&
      matches(r.when, answers, service.fields),
  );
  if (!rules?.length) return undefined;
  const value: unknown = Reflect.get(answers, field),
    count = Array.isArray(value) ? value.length : 0;
  if (count === 0) return "No surcharge without a selection.";
  const rates = rules.map(
    (r) => r.rates.find((rate) => rate.count === count)?.percent,
  );
  if (
    rates.some(
      (rate) =>
        rate === undefined ||
        rate.length > 30 ||
        !/^[0-9.]+$/.test(rate) ||
        !Number.isFinite(Number(rate)) ||
        Number(rate) > 10000,
    )
  )
    return undefined;
  return `Adds ${String(rates.reduce((sum, rate) => sum + Number(rate), 0))}% of the base estimate.`;
}
