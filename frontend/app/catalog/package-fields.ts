import { commonChoiceParents, linkedChoiceState } from "./linked-choices";
import type { Answers, Configuration, Field, Service, Variant } from "./model";
export function packageService(service: Service, variant: Variant): Service {
  const fields = service.fields.filter(
    (field) =>
      field.stage === "fulfillment" ||
      Object.hasOwn(variant.preset_answers ?? {}, field.key) ||
      variant.required_fields.includes(field.key),
  );
  return {
    ...service,
    fields: fields.map(({ default: _default, ...field }) =>
      field.stage === "fulfillment"
        ? { ...field, ...(_default === undefined ? {} : { default: _default }) }
        : field,
    ),
    rules: service.rules.filter((rule) =>
      [rule.from, rule.to, rule.from_units, rule.to_units].every(
        (key) => !key || fields.some((field) => field.key === key),
      ),
    ),
  };
}

export function packageAnswers(raw: Answers, variant: Variant): Answers {
  return {
    ...Object.fromEntries(
      Object.entries(raw).filter(([key]) =>
        variant.required_fields.includes(key),
      ),
    ),
    ...variant.preset_answers,
  };
}

export function packageChoiceState(
  service: Service,
  config: Configuration,
  field: Field,
  values: Answers,
  automatic: ReadonlySet<string>,
  variant?: Variant,
) {
  const state = linkedChoiceState(
    service,
    config,
    field,
    values,
    new Set(
      [...automatic].filter(
        (key) => !Object.hasOwn(variant?.preset_answers ?? {}, key),
      ),
    ),
  );
  for (const rule of service.rules) {
    const fixed = variant?.preset_answers?.[rule.to];
    if (
      rule.kind !== "linked_choices" ||
      rule.from !== field.key ||
      fixed === undefined
    )
      continue;
    const parents = commonChoiceParents(
      rule,
      Array.isArray(fixed) ? fixed : typeof fixed === "string" ? [fixed] : [],
    );
    state.options = state.options.filter((option) =>
      parents.includes(option.key),
    );
    state.restriction = undefined;
    state.hint =
      "Choose delivery information compatible with this package's fixed contents.";
  }
  return state;
}
