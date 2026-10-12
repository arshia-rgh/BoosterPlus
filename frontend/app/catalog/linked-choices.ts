import {
  matches,
  optionsFor,
  type Answers,
  type Configuration,
  type Field,
  type Rule,
  type Service,
} from "./model";

const choices = (value: Answers[string] | undefined): string[] =>
  typeof value === "string" && value
    ? [value]
    : Array.isArray(value)
      ? value
      : [];

export function commonChoiceParents(rule: Rule, children: string[]): string[] {
  return (rule.links ?? [])
    .filter(
      (link) =>
        children.length > 0 &&
        children.every((child) => link.children.includes(child)),
    )
    .map((link) => link.parent);
}

/** Saved answers keep their values; an absent UI filter history restores broad choice. */
export function restoredAutomaticParents(service: Service, answers: Answers) {
  return new Set(
    service.rules
      .filter((rule) => {
        const parents = commonChoiceParents(rule, choices(answers[rule.to]));
        return (
          rule.kind === "linked_choices" &&
          rule.link_mode === "shared_parent" &&
          parents.length === 1 &&
          parents[0] === answers[rule.from]
        );
      })
      .map((rule) => rule.from),
  );
}

function active(rule: Rule, service: Service, values: Answers) {
  const from = service.fields.find((field) => field.key === rule.from);
  const to = service.fields.find((field) => field.key === rule.to);
  return (
    rule.kind === "linked_choices" &&
    from &&
    to &&
    matches(from.visible_when, values, service.fields) &&
    matches(to.visible_when, values, service.fields)
  );
}

export function linkedChoiceState(
  service: Service,
  config: Configuration,
  field: Field,
  values: Answers,
  automatic: ReadonlySet<string>,
) {
  let options = optionsFor(field, config),
    disabled = false,
    hint = "";
  let restriction: { label: string; value: string | undefined } | undefined;
  for (const rule of service.rules) {
    if (!active(rule, service, values)) continue;
    const children = choices(values[rule.to]);
    const parents = commonChoiceParents(rule, children);
    if (
      field.key === rule.from &&
      rule.link_mode === "shared_parent" &&
      children.length
    ) {
      disabled = parents.length === 0;
      hint = disabled
        ? "These selections have no shared role. Clear or change them to choose one role."
        : automatic.has(rule.from)
          ? "Matched from your selections. Use the limit button to narrow the available choices."
          : "Choose a compatible role or clear it to select heroes across roles.";
      if (parents.length > 1)
        options = options.filter((option) => parents.includes(option.key));
    }
    const parent = values[rule.from];
    if (
      field.key === rule.from &&
      rule.link_mode === "shared_parent" &&
      typeof parent === "string" &&
      parent &&
      !disabled
    ) {
      const label =
        optionsFor(field, config).find((option) => option.key === parent)
          ?.label ?? parent;
      const childrenLabel =
        service.fields.find((candidate) => candidate.key === rule.to)?.label ??
        "choices";
      restriction = automatic.has(rule.from)
        ? { label: `Limit ${childrenLabel} to ${label}`, value: parent }
        : {
            label: `Allow ${childrenLabel} across categories`,
            value: undefined,
          };
    }
    if (
      field.key === rule.to &&
      typeof parent === "string" &&
      parent &&
      (rule.link_mode !== "shared_parent" || !automatic.has(rule.from))
    ) {
      const allowed =
        rule.links?.find((link) => link.parent === parent)?.children ?? [];
      options = options.filter((option) => allowed.includes(option.key));
      hint =
        "Showing choices for your selected " +
        (service.fields.find((f) => f.key === rule.from)?.label ?? "category") +
        ".";
    }
  }
  return { options, disabled, hint, restriction };
}

/** Parent changes deliberately restrict; inferred roles must not trap hero-first selection. */
export function changeLinkedChoice(
  service: Service,
  previous: Answers,
  field: string,
  value: Answers[string] | undefined,
  automatic: ReadonlySet<string>,
) {
  let answers = { ...previous };
  const inferred = new Set(automatic);
  let notice = "";
  answers = Object.fromEntries(
    Object.entries(answers).filter(([key]) => key !== field),
  );
  if (value !== undefined) answers = { ...answers, [field]: value };
  for (const rule of service.rules) {
    if (!active(rule, service, answers)) continue;
    if (field === rule.from) {
      inferred.delete(rule.from);
      const parent = answers[rule.from];
      if (typeof parent !== "string" || !parent) {
        const parents = commonChoiceParents(rule, choices(answers[rule.to]));
        if (parents.length === 1) {
          answers[rule.from] = parents[0] ?? "";
          inferred.add(rule.from);
          notice =
            rule.link_mode === "shared_parent"
              ? "Matched from your selections. You can now choose across categories."
              : "Matched from your selection. Clear the child choice to remove its category.";
        }
        continue;
      }
      const allowed =
        rule.links?.find((link) => link.parent === parent)?.children ?? [];
      const old = choices(answers[rule.to]),
        next = old.filter((child) => allowed.includes(child));
      if (next.length !== old.length) {
        if (Array.isArray(answers[rule.to])) answers[rule.to] = next;
        else
          answers = Object.fromEntries(
            Object.entries(answers).filter(([key]) => key !== rule.to),
          );
        notice =
          "Incompatible selections were removed. Review the available choices below.";
      }
    } else if (field === rule.to) {
      const children = choices(answers[rule.to]),
        parents = commonChoiceParents(rule, children),
        selectedParent = answers[rule.from];
      if (parents.length === 1) {
        const wasInferred = inferred.has(rule.from) || !answers[rule.from];
        answers[rule.from] = parents[0] ?? "";
        if (wasInferred) inferred.add(rule.from);
        notice =
          "Matched " +
          (service.fields.find((f) => f.key === rule.from)?.label ??
            "category") +
          " from your selections.";
      } else if (
        (children.length &&
          !parents.includes(
            typeof selectedParent === "string" ? selectedParent : "",
          )) ||
        inferred.has(rule.from)
      ) {
        answers = Object.fromEntries(
          Object.entries(answers).filter(([key]) => key !== rule.from),
        );
        inferred.delete(rule.from);
        notice =
          children.length && parents.length === 0
            ? "Your selections span different roles. The role restriction is unavailable until they share a role."
            : "Choose a shared role if you want to restrict your selections.";
      }
    }
  }
  return { answers, automatic: inferred, notice };
}
