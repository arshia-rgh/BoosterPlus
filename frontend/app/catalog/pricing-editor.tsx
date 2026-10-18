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
import MoneyInput, { minorToMajor } from "./money-input";
import PricingPreview, { type PricingPreviewContext } from "./pricing-preview";
import SurchargeEditor from "./surcharge-editor";
import { useContext, useState } from "react";
import { FieldValidation } from "../ui/form-validation";
import { isWinRateField } from "./win-rate";
import {
  changeLinkedChoice,
  linkedChoiceState,
  restoredAutomaticParents,
} from "./linked-choices";
import {
  matches,
  visibleAnswers,
  type Configuration,
  type PriceCase,
  type PricePlan,
  type PriceRule,
  type Service,
  type Issue,
} from "./model";

export function PricingEditor({
  path = "",
  service,
  config,
  change,
  preview,
  onIssues,
}: {
  path?: string;
  service: Service;
  config: Configuration;
  change: (patch: Partial<Service>) => void;
  preview?: PricingPreviewContext;
  onIssues?: (issues: Issue[]) => void;
}) {
  const validation = useContext(FieldValidation);
  const [caseParents, setCaseParents] = useState(
    new Map<string, ReadonlySet<string>>(),
  );
  const plan = service.pricing;
  const update = (patch: Partial<PricePlan>) => {
    if (plan) change({ pricing: { ...plan, ...patch } });
  };
  const fields = service.fields.filter((f) => f.stage === "estimate");
  const choices = (
    types: string[],
    reference?: string,
    exclude?: string,
  ): [string, string][] => [
    ["", "Choose field"],
    ...fields
      .filter(
        (f) =>
          types.includes(f.type) &&
          !isWinRateField(f) &&
          f.key !== exclude &&
          (reference === undefined || f.reference === reference),
      )
      .map((f) => [f.key, f.label] as [string, string]),
  ];
  return (
    <section className="catalog-item">
      <h3>Price estimates</h3>
      <p>
        Custom orders always need an administrator’s final quote. Price rules
        and saved examples are published together with the form.
      </p>
      <Select
        name={`${path}.evaluator`}
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
              name={`${path}.pricing.currency`}
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
            <MoneyInput
              currency={plan.currency}
              name={`${path}.pricing.base_minor`}
              label="Base price"
              value={plan.base_minor}
              change={(base_minor) => {
                update({ base_minor });
              }}
            />
            <MoneyInput
              currency={plan.currency}
              precision={2}
              name={`${path}.pricing.minimum_minor`}
              label="Minimum estimate"
              value={plan.minimum_minor}
              change={(minimum_minor) => {
                update({ minimum_minor });
              }}
            />
            <MoneyInput
              currency={plan.currency}
              precision={2}
              name={`${path}.pricing.maximum_minor`}
              label="Maximum estimate"
              value={plan.maximum_minor}
              change={(maximum_minor) => {
                update({ maximum_minor });
              }}
            />
          </div>
          <p className="quiet">
            Start with the base price, then apply these rules in order. The
            limits apply to the result, and the total rounds once to cents.
            Changing currency changes its label, not the numeric prices; review
            every amount.
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
                <p className="quiet">
                  {rule.kind === "fixed"
                    ? `Add ${plan.currency} ${minorToMajor(rule.value)}`
                    : rule.kind === "per_unit"
                      ? `Add ${plan.currency} ${minorToMajor(rule.value)} for each unit of ${fields.find((f) => f.key === rule.field)?.label ?? "the selected quantity"}`
                      : rule.kind === "percentage"
                        ? `Adjust the running subtotal by ${rule.value}%`
                        : rule.kind === "multiplier"
                          ? `Multiply the running subtotal by ${rule.value}`
                          : rule.kind === "rank_interval"
                            ? "Add the configured prices for the ranks crossed, including partial progress where configured."
                            : "Stop the automatic estimate and ask for a staff quote when this condition matches."}
                </p>
                <Text
                  name={`${path}.pricing.rules.${String(i)}.key`}
                  label="Pricing rule key"
                  value={rule.key}
                  change={(key) => {
                    patch({ key });
                  }}
                />
                <Text
                  name={`${path}.pricing.rules.${String(i)}.label`}
                  label="Price breakdown label"
                  value={rule.label}
                  change={(label) => {
                    patch({ label });
                  }}
                />
                <Select
                  name={`${path}.pricing.rules.${String(i)}.kind`}
                  label="Price operation"
                  value={rule.kind}
                  change={(kind) => {
                    patch({
                      kind,
                      value: "",
                      field: "",
                      from: "",
                      to: "",
                      from_units: "",
                      to_units: "",
                      intervals: [],
                    });
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
                {["fixed", "per_unit"].includes(rule.kind) && (
                  <MoneyInput
                    currency={plan.currency}
                    name={`${path}.pricing.rules.${String(i)}.value`}
                    label={
                      rule.kind === "fixed" ? "Amount to add" : "Price per unit"
                    }
                    value={rule.value}
                    change={(value) => {
                      patch({ value });
                    }}
                  />
                )}
                {["percentage", "multiplier"].includes(rule.kind) && (
                  <Text
                    name={`${path}.pricing.rules.${String(i)}.value`}
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
                    name={`${path}.pricing.rules.${String(i)}.field`}
                    label="Quantity field"
                    value={rule.field}
                    change={(field) => {
                      patch({ field });
                    }}
                    options={choices(["integer", "decimal"])}
                  />
                )}
                {rule.kind === "rank_interval" && (
                  <>
                    <Select
                      name={`${path}.pricing.rules.${String(i)}.from`}
                      label="Price starting rank field"
                      value={rule.from}
                      change={(from) => {
                        patch({ from, to: "", intervals: [] });
                      }}
                      options={choices(["rank"])}
                    />
                    <Select
                      name={`${path}.pricing.rules.${String(i)}.to`}
                      label="Price target rank field"
                      value={rule.to}
                      change={(to) => {
                        patch({ to });
                      }}
                      options={choices(
                        ["rank"],
                        fields.find((field) => field.key === rule.from)
                          ?.reference ?? "",
                        rule.from,
                      )}
                    />
                    <Select
                      name={`${path}.pricing.rules.${String(i)}.from_units`}
                      label="Price starting units field"
                      value={rule.from_units}
                      change={(from_units) => {
                        patch({ from_units });
                      }}
                      options={choices(["integer"], undefined, rule.to_units)}
                    />
                    <Select
                      name={`${path}.pricing.rules.${String(i)}.to_units`}
                      label="Price target units field"
                      value={rule.to_units}
                      change={(to_units) => {
                        patch({ to_units });
                      }}
                      options={choices(["integer"], undefined, rule.from_units)}
                    />
                    <p>
                      Enter the full price to advance through each rank. With
                      unit fields, the server prorates partial ranks using the
                      catalog’s unit bounds.
                    </p>
                    {rule.intervals.map(
                      (interval, index) =>
                        (!ranks.some((rank) => rank.key === interval.rank) ||
                          rule.intervals.findIndex(
                            (value) => value.rank === interval.rank,
                          ) !== index) && (
                          <div key={index}>
                            <p>
                              Unavailable or duplicate interval: {interval.rank}
                              . Remove it and set the price on the current rank
                              below.
                            </p>
                            <Action
                              name={`${path}.pricing.rules.${String(i)}.intervals.${String(index)}.rank`}
                              onClick={() => {
                                patch({
                                  intervals: rule.intervals.filter(
                                    (_, j) => j !== index,
                                  ),
                                });
                              }}
                            >
                              Remove invalid interval {index + 1}
                            </Action>
                          </div>
                        ),
                    )}
                    {ranks.map((rank, rankIndex) => (
                      <MoneyInput
                        currency={plan.currency}
                        name={`${path}.pricing.rules.${String(i)}.${rule.intervals.some((r) => r.rank === rank.key) ? `intervals.${String(rule.intervals.findIndex((r) => r.rank === rank.key))}.amount_minor` : `missing_intervals.${String(rankIndex)}`}`}
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
                  path={`${path}.pricing.rules.${String(i)}.when`}
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
          <SurchargeEditor
            path={`${path}.pricing.surcharges`}
            service={service}
            change={(surcharges) => {
              update({ surcharges });
            }}
          />
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
            const parents =
              caseParents.get(example.key) ??
              restoredAutomaticParents(service, values);
            return (
              <details key={i} className="catalog-section" data-price-case={i}>
                <summary>{example.key}</summary>
                <Text
                  name={`${path}.pricing.cases.${String(i)}.key`}
                  label="Example key"
                  value={example.key}
                  change={(key) => {
                    patch({ key });
                  }}
                />
                <Select
                  name={`${path}.pricing.cases.${String(i)}.outcome`}
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
                  <MoneyInput
                    currency={plan.currency}
                    precision={2}
                    name={`${path}.pricing.cases.${String(i)}.amount_minor`}
                    label="Expected total"
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
                      validationName={`${path}.pricing.cases.${String(i)}.answers.${field.key}`}
                      field={field}
                      config={config}
                      value={values[field.key]}
                      required={field.required}
                      error={undefined}
                      choiceState={linkedChoiceState(
                        service,
                        config,
                        field,
                        values,
                        parents,
                      )}
                      change={(value) => {
                        validation?.correct(
                          `${path}.pricing.cases.${String(i)}.answers.${field.key}`,
                        );
                        const next = changeLinkedChoice(
                          service,
                          values,
                          field.key,
                          value,
                          parents,
                        );
                        setCaseParents((old) =>
                          new Map(old).set(example.key, next.automatic),
                        );
                        patch({
                          answers: visibleAnswers(
                            service,
                            next.answers,
                            "estimate",
                          ),
                        });
                      }}
                    />
                  ))}
                {preview && (
                  <PricingPreview
                    path={`${path}.pricing.cases.${String(i)}`}
                    onIssues={onIssues}
                    context={preview}
                    config={config}
                    service={service}
                    example={example}
                  />
                )}
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
            name={`${path}.pricing.cases`}
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
