import {
  Action,
  ConditionEditor,
  Ordering,
  Select,
  Text,
  move,
  nextKey,
} from "./controls";
import { Input } from "./dynamic-form";
import {
  matches,
  visibleAnswers,
  type Configuration,
  type PriceCase,
  type PricePlan,
  type PriceRule,
  type Service,
} from "./model";

export function PricingEditor({
  service,
  config,
  change,
}: {
  service: Service;
  config: Configuration;
  change: (patch: Partial<Service>) => void;
}) {
  const plan = service.pricing;
  const update = (patch: Partial<PricePlan>) => {
    if (plan) change({ pricing: { ...plan, ...patch } });
  };
  const fields = service.fields.filter((f) => f.stage === "estimate");
  const choices: [[string, string], ...[string, string][]] = [
    ["", "Choose field"],
    ...fields.map((f) => [f.key, f.label] as [string, string]),
  ];
  return (
    <section className="catalog-item">
      <h3>Price estimates</h3>
      <p>
        Custom orders always need an administrator’s final quote. Price rules
        and saved examples are published together with the form.
      </p>
      <Select
        label="Price evaluator"
        value={service.evaluator}
        change={(evaluator) => {
          change({
            evaluator,
            pricing:
              evaluator === "pricing-v1"
                ? {
                    currency: "",
                    base_minor: "",
                    minimum_minor: "1",
                    maximum_minor: "",
                    rules: [],
                    cases: [],
                  }
                : undefined,
          });
        }}
        options={[
          ["manual-review-v1", "Manual review only"],
          ["pricing-v1", "Calculate estimate"],
        ]}
      />
      {plan && (
        <>
          <div className="catalog-grid">
            <Select
              label="Estimate currency"
              value={plan.currency}
              change={(currency) => {
                update({ currency });
              }}
              options={[
                ["", "Select currency"],
                ["USD", "USD"],
                ["EUR", "EUR"],
                ["GBP", "GBP"],
              ]}
            />
            <Text
              label="Base amount in minor units"
              value={plan.base_minor}
              change={(base_minor) => {
                update({ base_minor });
              }}
            />
            <Text
              label="Minimum estimate in minor units"
              value={plan.minimum_minor}
              change={(minimum_minor) => {
                update({ minimum_minor });
              }}
            />
            <Text
              label="Maximum estimate in minor units"
              value={plan.maximum_minor}
              change={(maximum_minor) => {
                update({ maximum_minor });
              }}
            />
          </div>
          <p className="quiet">
            Rules run in this order. Decimal minor units are supported for
            intermediate amounts; the total rounds half up once, after the
            configured bounds.
          </p>
          {plan.rules.map((rule, i) => {
            const patch = (value: Partial<PriceRule>) => {
              update({
                rules: plan.rules.map((r, j) =>
                  i === j ? { ...r, ...value } : r,
                ),
              });
            };
            const ranks =
              config.references.find(
                (r) =>
                  r.key === fields.find((f) => f.key === rule.from)?.reference,
              )?.options ?? [];
            return (
              <details className="catalog-section" data-price-rule={i} key={i}>
                <summary>
                  {rule.label} · {rule.kind}
                </summary>
                <Text
                  label="Pricing rule key"
                  value={rule.key}
                  change={(key) => {
                    patch({ key });
                  }}
                />
                <Text
                  label="Price breakdown label"
                  value={rule.label}
                  change={(label) => {
                    patch({ label });
                  }}
                />
                <Select
                  label="Price operation"
                  value={rule.kind}
                  change={(kind) => {
                    patch({ kind });
                  }}
                  options={[
                    ["fixed", "Fixed surcharge"],
                    ["per_unit", "Per unit"],
                    ["percentage", "Percentage adjustment"],
                    ["multiplier", "Multiply subtotal"],
                    ["rank_interval", "Rank interval sum"],
                    ["manual_review", "Require manual review"],
                  ]}
                />
                {!["rank_interval", "manual_review"].includes(rule.kind) && (
                  <Text
                    label="Operation value"
                    value={rule.value}
                    change={(value) => {
                      patch({ value });
                    }}
                    help={
                      rule.kind === "percentage"
                        ? "Percent, from −100 to 10,000."
                        : rule.kind === "multiplier"
                          ? "Positive factor, at most 100."
                          : "Exact nonnegative amount in minor units."
                    }
                  />
                )}
                {rule.kind === "per_unit" && (
                  <Select
                    label="Quantity field"
                    value={rule.field}
                    change={(field) => {
                      patch({ field });
                    }}
                    options={choices}
                  />
                )}
                {rule.kind === "rank_interval" && (
                  <>
                    <Select
                      label="Price starting rank field"
                      value={rule.from}
                      change={(from) => {
                        patch({ from, intervals: [] });
                      }}
                      options={choices}
                    />
                    <Select
                      label="Price target rank field"
                      value={rule.to}
                      change={(to) => {
                        patch({ to });
                      }}
                      options={choices}
                    />
                    <Select
                      label="Price starting units field"
                      value={rule.from_units}
                      change={(from_units) => {
                        patch({ from_units });
                      }}
                      options={choices}
                    />
                    <Select
                      label="Price target units field"
                      value={rule.to_units}
                      change={(to_units) => {
                        patch({ to_units });
                      }}
                      options={choices}
                    />
                    <p>
                      Enter the full price to advance through each rank. With
                      unit fields, the server prorates partial ranks using the
                      catalog’s unit bounds.
                    </p>
                    {ranks.map((rank) => (
                      <Text
                        key={rank.key}
                        label={`${rank.label} interval price`}
                        value={
                          rule.intervals.find((r) => r.rank === rank.key)
                            ?.amount_minor ?? ""
                        }
                        change={(amount_minor) => {
                          patch({
                            intervals: [
                              ...rule.intervals.filter(
                                (r) => r.rank !== rank.key,
                              ),
                              { rank: rank.key, amount_minor },
                            ],
                          });
                        }}
                      />
                    ))}
                  </>
                )}
                <ConditionEditor
                  label="Apply price operation when"
                  fields={fields}
                  value={rule.when}
                  change={(when) => {
                    patch({ when });
                  }}
                />
                <Ordering
                  index={i}
                  count={plan.rules.length}
                  change={(direction) => {
                    update({ rules: move(plan.rules, i, direction) });
                  }}
                  remove={() => {
                    update({ rules: plan.rules.filter((_, j) => i !== j) });
                  }}
                />
              </details>
            );
          })}
          <Action
            disabled={plan.rules.length >= 40}
            onClick={() => {
              update({
                rules: [
                  ...plan.rules,
                  {
                    key: nextKey("price", plan.rules),
                    label: "New adjustment",
                    kind: "fixed",
                    value: "",
                    field: "",
                    from: "",
                    to: "",
                    from_units: "",
                    to_units: "",
                    intervals: [],
                  },
                ],
              });
            }}
          >
            Add price operation
          </Action>
          <h4>Saved price examples</h4>
          <p>
            Use synthetic selections only. Set the expected result yourself;
            publication checks every example against the current form and rules.
          </p>
          {plan.cases.map((example, i) => {
            const patch = (value: Partial<PriceCase>) => {
              update({
                cases: plan.cases.map((e, j) =>
                  j === i ? { ...e, ...value } : e,
                ),
              });
            };
            const values = visibleAnswers(service, example.answers, "estimate");
            return (
              <details key={i} className="catalog-section" data-price-case={i}>
                <summary>{example.key}</summary>
                <Text
                  label="Example key"
                  value={example.key}
                  change={(key) => {
                    patch({ key });
                  }}
                />
                <Select
                  label="Expected pricing outcome"
                  value={example.outcome}
                  change={(outcome) => {
                    patch({ outcome, amount_minor: "" });
                  }}
                  options={[
                    ["estimated", "Estimated price"],
                    ["manual_review", "Manual review"],
                  ]}
                />
                {example.outcome === "estimated" && (
                  <Text
                    label="Expected amount in minor units"
                    value={example.amount_minor}
                    change={(amount_minor) => {
                      patch({ amount_minor });
                    }}
                  />
                )}
                {fields
                  .filter((f) =>
                    matches(f.visible_when, values, service.fields),
                  )
                  .map((field) => (
                    <Input
                      key={field.key}
                      field={field}
                      config={config}
                      value={values[field.key]}
                      required={field.required}
                      error={undefined}
                      change={(value) => {
                        const next = Object.fromEntries(
                          Object.entries(values).filter(
                            ([key]) => key !== field.key,
                          ),
                        );
                        if (value !== undefined) next[field.key] = value;
                        patch({
                          answers: visibleAnswers(service, next, "estimate"),
                        });
                      }}
                    />
                  ))}
                <Action
                  onClick={() => {
                    update({ cases: plan.cases.filter((_, j) => i !== j) });
                  }}
                >
                  Remove example
                </Action>
              </details>
            );
          })}
          <Action
            disabled={plan.cases.length >= 30}
            onClick={() => {
              update({
                cases: [
                  ...plan.cases,
                  {
                    key: nextKey("example", plan.cases),
                    answers: {},
                    outcome: "estimated",
                    amount_minor: "",
                  },
                ],
              });
            }}
          >
            Add price example
          </Action>
        </>
      )}
    </section>
  );
}
