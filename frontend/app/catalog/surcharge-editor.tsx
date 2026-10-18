import { Action, ConditionEditor, Select, Text, nextKey } from "./controls";
import type { Service, PriceSurcharge } from "./model";

export default function SurchargeEditor({
  path,
  service,
  change,
}: {
  path: string;
  service: Service;
  change: (rules: PriceSurcharge[]) => void;
}) {
  const rules = service.pricing?.surcharges ?? [];
  const fields = service.fields.filter((f) => f.stage === "estimate");
  const counts = fields.filter(
    (f) =>
      f.type === "multiselect" &&
      f.max_selections > 0 &&
      f.max_selections <= 30,
  );
  return (
    <section className="catalog-section">
      <h4>Base-price surcharges</h4>
      <p>
        Each matching preference adds a percentage of the same base, after the
        operations above and minimum price. Surcharges never multiply each
        other. The maximum estimate still applies.
      </p>
      {rules.map((rule, i) => {
        const p = `${path}.${String(i)}`;
        const patch = (value: Partial<PriceSurcharge>) => {
          change(rules.map((r, j) => (i === j ? { ...r, ...value } : r)));
        };
        return (
          <details className="catalog-section" key={i}>
            <summary>{rule.label || "New surcharge"}</summary>
            <Text
              name={`${p}.key`}
              label="Surcharge key"
              value={rule.key}
              change={(key) => {
                patch({ key });
              }}
            />
            <Text
              name={`${p}.label`}
              label="Surcharge breakdown label"
              value={rule.label}
              change={(label) => {
                patch({ label });
              }}
            />
            <Select
              name={`${p}.kind`}
              label="Surcharge type"
              value={rule.kind}
              options={[
                ["percentage", "Percentage of base"],
                ["selection_count", "Percentage by selected count"],
              ]}
              change={(kind) => {
                if (kind === "percentage" || kind === "selection_count")
                  patch({ kind, value: "", field: "", rates: [] });
              }}
            />
            {rule.kind === "percentage" ? (
              <Text
                name={`${p}.value`}
                label="Percentage to add"
                value={rule.value}
                change={(value) => {
                  patch({ value });
                }}
                help="For example, 200 adds twice the base price. 0–10,000%."
              />
            ) : (
              <>
                <Select
                  name={`${p}.field`}
                  label="Count selected choices in"
                  value={rule.field}
                  options={[
                    ["", "Choose field"],
                    ...counts.map((f) => [f.key, f.label] as [string, string]),
                  ]}
                  change={(field) => {
                    const max =
                      counts.find((f) => f.key === field)?.max_selections ?? 0;
                    patch({
                      field,
                      rates: Array.from({ length: max }, (_, n) => ({
                        count: n + 1,
                        percent: "",
                      })),
                    });
                  }}
                />
                <p className="quiet">
                  No selection adds nothing. Set a percentage for every
                  selectable count.
                </p>
                {rule.rates.map((rate, j) => (
                  <Text
                    key={j}
                    name={`${p}.rates.${String(j)}.percent`}
                    label={`${String(rate.count)} selected — percentage to add`}
                    value={rate.percent}
                    change={(percent) => {
                      patch({
                        rates: rule.rates.map((r, k) =>
                          k === j ? { ...r, percent } : r,
                        ),
                      });
                    }}
                  />
                ))}
              </>
            )}
            <ConditionEditor
              path={`${p}.when`}
              label="Apply surcharge when"
              fields={fields}
              value={rule.when}
              change={(when) => {
                if (when) patch({ when });
                else
                  change(
                    rules.map((r, j) => {
                      if (i !== j) return r;
                      const updated = { ...r };
                      delete updated.when;
                      return updated;
                    }),
                  );
              }}
            />
            <Action
              onClick={() => {
                change(rules.filter((_, j) => i !== j));
              }}
            >
              Remove surcharge
            </Action>
          </details>
        );
      })}
      <Action
        disabled={rules.length >= 20}
        onClick={() => {
          change([
            ...rules,
            {
              key: nextKey("surcharge", [
                ...(service.pricing?.rules ?? []),
                ...rules,
              ]),
              label: "New surcharge",
              kind: "percentage",
              value: "",
              field: "",
              rates: [],
            },
          ]);
        }}
      >
        Add base-price surcharge
      </Action>
    </section>
  );
}
