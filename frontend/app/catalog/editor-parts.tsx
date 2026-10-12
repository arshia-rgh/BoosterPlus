import ArtworkUpload from "../artwork/upload";
import MoneyInput from "./money-input";
import PackageScopeEditor from "./package-scope";
import DeliveryRequestEditor from "./delivery-request-editor";
import FulfillmentEditor from "./fulfillment-editor";
import LinkedChoicesEditor from "./linked-choices-editor";
import DeliveryEditor from "./delivery-editor";
import { withDeliveryHours } from "./delivery-hours";
import { PricingEditor } from "./pricing-editor";
import { Input } from "./dynamic-form";
import { useRef } from "react";
import {
  Action,
  Check,
  ConditionEditor,
  NumberInput,
  OptionsEditor,
  Ordering,
  Select,
  Text,
  move,
  nextKey,
} from "./controls";
import {
  emptyField,
  emptyVariant,
  optionsFor,
  type Configuration,
  type Field,
  type Service,
  type Rule,
  type Package,
  type Reference,
} from "./model";

export function ReferencesEditor({
  value,
  change,
}: {
  value: Reference[];
  change: (value: Reference[]) => void;
}) {
  const update = (index: number, patch: Partial<Reference>) => {
    change(
      value.map((reference, i) =>
        i === index ? { ...reference, ...patch } : reference,
      ),
    );
  };
  return (
    <section>
      <h2>Reference catalogs</h2>
      <p>
        Keep stable keys when changing labels. Verify season data and region
        coverage before publishing.
      </p>
      {value.map((reference, i) => (
        <details data-catalog-reference={i} key={i} className="catalog-section">
          <summary>
            {reference.label} · {reference.key}
          </summary>
          <div className="catalog-grid">
            <Text
              name={`references.${String(i)}.key`}
              label="Catalog key"
              value={reference.key}
              change={(key) => {
                update(i, { key });
              }}
            />
            <Text
              name={`references.${String(i)}.label`}
              label="Catalog label"
              value={reference.label}
              change={(label) => {
                update(i, { label });
              }}
            />
            <Select
              name={`references.${String(i)}.kind`}
              label="Catalog kind"
              value={reference.kind}
              change={(kind) => {
                update(i, { kind });
              }}
              options={[
                "rank",
                "hero",
                "role",
                "region",
                "server",
                "choice",
              ].map((kind) => [kind, kind])}
            />
          </div>
          <OptionsEditor
            path={`references.${String(i)}.options`}
            options={reference.options}
            change={(options) => {
              update(i, { options });
            }}
          />
          <Ordering
            index={i}
            count={value.length}
            change={(direction) => {
              change(move(value, i, direction));
            }}
            remove={() => {
              change(value.filter((_, index) => index !== i));
            }}
          />
        </details>
      ))}
      <Action
        disabled={value.length >= 20}
        onClick={() => {
          change([
            ...value,
            {
              key: nextKey("catalog", value),
              label: "New catalog",
              kind: "choice",
              options: [],
            },
          ]);
        }}
      >
        Add reference catalog
      </Action>
    </section>
  );
}

function DefaultEditor({
  path = "",
  field,
  change,
  config,
}: {
  path?: string;
  field: Field;
  change: (patch: Partial<Field>) => void;
  config: Configuration;
}) {
  const group = useRef<HTMLFieldSetElement>(null);
  const removeDefault = (value: Field["default"]) => {
    change({ default: value });
    requestAnimationFrame(() => {
      group.current
        ?.querySelector<HTMLInputElement>('input[type="checkbox"]')
        ?.focus();
    });
  };
  const missingScalar =
    ["select", "rank", "radio"].includes(field.type) &&
    typeof field.default === "string" &&
    field.default !== "" &&
    !optionsFor(field, config).some((option) => option.key === field.default);
  return (
    <fieldset ref={group} className="catalog-item">
      <legend>Default answer</legend>
      <Check
        label="Use a default"
        value={field.default !== undefined}
        change={(enabled) => {
          change({
            default: enabled
              ? field.type === "boolean"
                ? false
                : field.type === "multiselect"
                  ? []
                  : ""
              : undefined,
          });
        }}
      />
      {field.default !== undefined &&
        (field.type === "boolean" ? (
          <Check
            name={`${path}.default`}
            label="Default yes"
            value={field.default === true}
            change={(value) => {
              change({ default: value });
            }}
          />
        ) : (
          <Input
            validationName={`${path}.default`}
            field={{
              ...field,
              label: "Default value",
              help: "Choose or enter the exact default answer. Option names keep their spaces, case and punctuation.",
            }}
            config={config}
            value={field.default}
            required={false}
            error={undefined}
            change={(value) => {
              change({ default: value });
            }}
          />
        ))}
      {missingScalar && (
        <div>
          <p>
            Unavailable default:{" "}
            {typeof field.default === "string" ? field.default : ""}. This
            option is no longer in the field’s choices.
          </p>
          <Action
            onClick={() => {
              removeDefault(undefined);
            }}
          >
            Remove unavailable default{" "}
            {typeof field.default === "string" ? field.default : ""}
          </Action>
        </div>
      )}
      {field.type === "multiselect" &&
        Array.isArray(field.default) &&
        field.default
          .filter(
            (value) =>
              !optionsFor(field, config).some((option) => option.key === value),
          )
          .map((value) => (
            <div key={value}>
              <p>
                Unavailable default: {value}. This option is no longer in the
                field’s choices.
              </p>
              <Action
                onClick={() => {
                  removeDefault(
                    Array.isArray(field.default)
                      ? field.default.filter((current) => current !== value)
                      : [],
                  );
                }}
              >
                Remove unavailable default {value}
              </Action>
            </div>
          ))}
    </fieldset>
  );
}
export function FieldEditor({
  path = "",
  field,
  change,
  service,
  config,
  intake = false,
}: {
  path?: string;
  field: Field;
  intake?: boolean;
  change: (patch: Partial<Field>) => void;
  service: Service;
  config: Configuration;
}) {
  const choice = [
      "select",
      "radio",
      "rank",
      "multiselect",
      "cosmetics",
    ].includes(field.type),
    number = ["integer", "decimal"].includes(field.type),
    text = ["short_text", "long_text"].includes(field.type);
  return (
    <>
      <div className="catalog-grid">
        <Text
          name={`${path}.key`}
          label="Field key"
          value={field.key}
          change={(key) => {
            change({ key });
          }}
        />
        <Text
          name={`${path}.label`}
          label="Field label"
          value={field.label}
          change={(label) => {
            change({ label });
          }}
        />
        <Select
          name={`${path}.type`}
          label="Field type"
          value={field.type}
          change={(type) => {
            const parsed = (
              [
                "select",
                "radio",
                "rank",
                "multiselect",
                "boolean",
                "integer",
                "decimal",
                "win_rate",
                "short_text",
                "long_text",
                "attachment",
                "cosmetics",
              ] as const
            ).find((candidate) => candidate === type);
            if (parsed)
              change({
                type: parsed,
                default: undefined,
                reference: "",
                options: [],
              });
          }}
          options={[
            "select",
            "radio",
            "rank",
            "multiselect",
            "boolean",
            "integer",
            "decimal",
            "win_rate",
            "short_text",
            "long_text",
            "attachment",
            "cosmetics",
          ]
            .filter((type) =>
              intake ? type !== "attachment" : type !== "cosmetics",
            )
            .map((type) => [
              type,
              type === "win_rate"
                ? "Win-rate preference"
                : type === "cosmetics"
                  ? "Skin collection · category, quantity and names"
                  : type,
            ])}
        />
        <Select
          name={`${path}.stage`}
          label="Collection stage"
          value={field.stage}
          change={(stage) => {
            if (
              stage === "estimate" ||
              stage === "order" ||
              stage === "fulfillment"
            )
              change({ stage });
          }}
          options={
            intake
              ? [["order", "Account submission"]]
              : [
                  ["estimate", "Estimate"],
                  ["order", "Order submission"],
                  ["fulfillment", "After payment"],
                ]
          }
        />
      </div>
      <Text
        name={`${path}.help`}
        label="Field help"
        value={field.help}
        change={(help) => {
          change({ help });
        }}
      />
      <Check
        name={`${path}.required`}
        label="Required field"
        value={field.required}
        change={(required) => {
          change({ required });
        }}
      />
      {choice && (
        <>
          <Select
            name={`${path}.reference`}
            label="Reference catalog"
            value={field.reference}
            change={(reference) => {
              change({ reference, options: [] });
            }}
            options={[
              ["", "Inline options"],
              ...config.references.map((ref) => [ref.key, ref.label] as const),
            ]}
          />
          {!field.reference && (
            <OptionsEditor
              path={`${path}.options`}
              options={field.options}
              change={(options) => {
                change({ options });
              }}
            />
          )}
        </>
      )}
      {field.type === "win_rate" && (
        <p className="quiet">
          Customers can request no preference, a percentage range, below or
          above a percentage, or exactly 100%. The accepted order defines the
          promise; this field does not create a global guarantee.
        </p>
      )}
      {number && (
        <div className="catalog-grid">
          <Text
            name={`${path}.min`}
            label="Minimum value"
            value={field.min}
            change={(min) => {
              change({ min });
            }}
          />
          <Text
            name={`${path}.max`}
            label="Maximum value"
            value={field.max}
            change={(max) => {
              change({ max });
            }}
          />
          <Text
            name={`${path}.step`}
            label="Numeric step"
            value={field.step}
            change={(step) => {
              change({ step });
            }}
          />
          <Text
            name={`${path}.unit`}
            label="Unit"
            value={field.unit}
            change={(unit) => {
              change({ unit });
            }}
          />
        </div>
      )}
      {text && (
        <div className="catalog-grid">
          <NumberInput
            name={`${path}.min_length`}
            label="Minimum text length"
            value={field.min_length}
            change={(min_length) => {
              change({ min_length });
            }}
          />
          <NumberInput
            name={`${path}.max_length`}
            label="Maximum text length"
            value={field.max_length}
            change={(max_length) => {
              change({ max_length });
            }}
          />
        </div>
      )}
      {field.type === "multiselect" && (
        <div className="catalog-grid">
          <NumberInput
            name={`${path}.min_selections`}
            label="Minimum selections"
            value={field.min_selections}
            change={(min_selections) => {
              change({ min_selections });
            }}
          />
          <NumberInput
            name={`${path}.max_selections`}
            label="Maximum selections"
            value={field.max_selections}
            change={(max_selections) => {
              change({ max_selections });
            }}
          />
        </div>
      )}
      {field.type === "cosmetics" ? (
        <p>
          Options define this game’s skin categories. Sellers add quantity and
          names for each category. Names can identify the skin or associated
          hero; one entry per item, up to 20 categories and 200 named items.
          These answers are private until staff explicitly adds reviewed details
          to a public listing.
        </p>
      ) : field.type === "attachment" ? (
        <p>
          Optional order screenshots use private upload and safety checks.
          Choose the order collection stage for screenshots. Later evidence
          belongs in order messages. Never collect credentials or prefill file
          references.
        </p>
      ) : (
        <DefaultEditor
          path={path}
          field={field}
          config={config}
          change={change}
        />
      )}
      <ConditionEditor
        path={`${path}.visible_when`}
        label="Show field when"
        value={field.visible_when}
        change={(visible_when) => {
          change({ visible_when });
        }}
        fields={service.fields}
      />
      <ConditionEditor
        path={`${path}.required_when`}
        label="Require field when"
        value={field.required_when}
        change={(required_when) => {
          change({ required_when });
        }}
        fields={service.fields}
      />
    </>
  );
}
export function RuleEditor({
  path = "",
  rule,
  change,
  fields,
  config,
}: {
  path?: string;
  rule: Rule;
  change: (patch: Partial<Rule>) => void;
  fields: Field[];
  config: Configuration;
}) {
  const options = [
    ["", "No field"],
    ...fields.map((field) => [field.key, `${field.label} (${field.key})`]),
  ] as [string, string][];
  return (
    <>
      <div className="catalog-grid">
        <Text
          name={`${path}.key`}
          label="Rule key"
          value={rule.key}
          change={(key) => {
            change({ key });
          }}
        />
        <Select
          name={`${path}.kind`}
          label="Rule kind"
          value={rule.kind}
          change={(kind) => {
            change({
              kind,
              when: undefined,
              from_units: "",
              to_units: "",
              link_mode:
                kind === "linked_choices" ? "single_parent" : undefined,
              links: undefined,
            });
          }}
          options={[
            ["reject", "Reject matching answers"],
            ["progression", "Target rank must advance"],
            ["disjoint", "Selections must not overlap"],
            ["linked_choices", "Link choices (regions/servers, roles/heroes)"],
            ["ordered_numbers", "Minimum must not exceed maximum"],
          ]}
        />
      </div>
      <Text
        name={`${path}.message`}
        label="Validation message"
        value={rule.message}
        change={(message) => {
          change({ message });
        }}
      />
      {rule.kind !== "reject" && (
        <div className="catalog-grid">
          <Select
            name={`${path}.from`}
            label={
              rule.kind === "linked_choices"
                ? "Parent field (region or role)"
                : "Starting field"
            }
            value={rule.from}
            change={(from) => {
              change({ from });
            }}
            options={options}
          />
          <Select
            name={`${path}.to`}
            label={
              rule.kind === "linked_choices"
                ? "Child field (server or heroes)"
                : "Target field"
            }
            value={rule.to}
            change={(to) => {
              change({ to });
            }}
            options={options}
          />
          {rule.kind === "progression" && (
            <>
              <Select
                name={`${path}.from_units`}
                label="Starting units field"
                value={rule.from_units}
                change={(from_units) => {
                  change({ from_units });
                }}
                options={options}
              />
              <Select
                name={`${path}.to_units`}
                label="Target units field"
                value={rule.to_units}
                change={(to_units) => {
                  change({ to_units });
                }}
                options={options}
              />
            </>
          )}
        </div>
      )}
      {rule.kind === "linked_choices" ? (
        <LinkedChoicesEditor
          rule={rule}
          fields={fields}
          config={config}
          path={path}
          change={change}
        />
      ) : (
        <ConditionEditor
          path={`${path}.when`}
          label="Apply rule when"
          value={rule.when}
          change={(when) => {
            change({ when });
          }}
          fields={fields}
        />
      )}
    </>
  );
}
export function ServicesEditor({
  config,
  change,
  showPricing = true,
}: {
  config: Configuration;
  showPricing?: boolean;
  change: (services: Service[]) => void;
}) {
  const update = (index: number, patch: Partial<Service>) => {
    change(
      config.services.map((service, i) =>
        i === index ? { ...service, ...patch } : service,
      ),
    );
  };
  return (
    <section>
      <h2>Custom services and forms</h2>
      <p>
        Array order controls display order. Secret handoff is separate from
        these ordinary fields.
      </p>
      {config.services.map((service, i) => (
        <details data-catalog-service={i} key={i} className="catalog-section">
          <summary>
            {service.name} · {service.key}
          </summary>
          <div className="catalog-grid">
            <Text
              name={`services.${String(i)}.key`}
              label="Service key"
              value={service.key}
              change={(key) => {
                update(i, { key });
              }}
            />
            <Text
              name={`services.${String(i)}.name`}
              label="Service name"
              value={service.name}
              change={(name) => {
                update(i, { name });
              }}
            />
          </div>
          <Text
            name={`services.${String(i)}.description`}
            label="Service description"
            multiline
            value={service.description}
            change={(description) => {
              update(i, { description });
            }}
          />
          {showPricing && (
            <PricingEditor
              path={`services.${String(i)}`}
              service={service}
              config={config}
              change={(patch) => {
                update(i, patch);
              }}
            />
          )}
          <FulfillmentEditor
            path={`services.${String(i)}.fulfillment`}
            service={service}
            change={(patch) => {
              update(i, patch);
            }}
          />
          <h3>Form fields</h3>
          <DeliveryEditor
            path={`services.${String(i)}.delivery`}
            service={service}
            change={(patch) => {
              update(i, patch);
            }}
          />
          {service.fields.map((field, j) => (
            <details data-catalog-field={j} key={j} className="catalog-section">
              <summary>
                {field.label} · {field.key}
              </summary>
              <FieldEditor
                path={`services.${String(i)}.fields.${String(j)}`}
                field={field}
                service={service}
                config={config}
                change={(patch) => {
                  update(i, {
                    fields: service.fields.map((f, index) =>
                      index === j ? { ...f, ...patch } : f,
                    ),
                  });
                }}
              />
              <Ordering
                index={j}
                count={service.fields.length}
                change={(direction) => {
                  update(i, { fields: move(service.fields, j, direction) });
                }}
                remove={() => {
                  update(i, {
                    fields: service.fields.filter((_, index) => index !== j),
                  });
                }}
              />
            </details>
          ))}
          <Action
            disabled={service.fields.length >= 40}
            onClick={() => {
              update(i, {
                fields: [
                  ...service.fields,
                  emptyField(nextKey("field", service.fields)),
                ],
              });
            }}
          >
            Add field
          </Action>
          <Action
            disabled={!withDeliveryHours(service).fields}
            onClick={() => {
              update(i, withDeliveryHours(service));
            }}
          >
            Add requested delivery-hours range
          </Action>
          <p className="quiet">
            Adds an editable 1–720 hour request range and validation rule to
            this draft. Review the bounds and remove any old priority selector
            yourself before publishing.
          </p>
          <h3>Combination rules</h3>
          <DeliveryRequestEditor
            service={service}
            path={`services.${String(i)}.delivery_request`}
            change={(patch) => {
              update(i, patch);
            }}
          />
          {service.rules.map((rule, j) => (
            <details key={j} className="catalog-section">
              <summary>{rule.key}</summary>
              <RuleEditor
                path={`services.${String(i)}.rules.${String(j)}`}
                rule={rule}
                fields={service.fields}
                config={config}
                change={(patch) => {
                  update(i, {
                    rules: service.rules.map((r, index) =>
                      index === j ? { ...r, ...patch } : r,
                    ),
                  });
                }}
              />
              <Ordering
                index={j}
                count={service.rules.length}
                change={(direction) => {
                  update(i, { rules: move(service.rules, j, direction) });
                }}
                remove={() => {
                  update(i, {
                    rules: service.rules.filter((_, index) => index !== j),
                  });
                }}
              />
            </details>
          ))}
          <Action
            disabled={service.rules.length >= 40}
            onClick={() => {
              update(i, {
                rules: [
                  ...service.rules,
                  {
                    key: nextKey("rule", service.rules),
                    kind: "reject",
                    message: "These selections are incompatible.",
                    from: "",
                    to: "",
                    from_units: "",
                    to_units: "",
                  },
                ],
              });
            }}
          >
            Add combination rule
          </Action>
          <Ordering
            index={i}
            count={config.services.length}
            change={(direction) => {
              change(move(config.services, i, direction));
            }}
            remove={() => {
              change(config.services.filter((_, index) => index !== i));
            }}
          />
        </details>
      ))}
      <Action
        disabled={config.services.length >= 12}
        onClick={() => {
          change([
            ...config.services,
            {
              key: nextKey("service", config.services),
              name: "New service",
              description: "",
              evaluator: "manual-review-v1",
              fields: [],
              rules: [],
            },
          ]);
        }}
      >
        Add service
      </Action>
    </section>
  );
}
export function PackagesEditor({
  config,
  change,
}: {
  config: Configuration;
  change: (packages: Package[]) => void;
}) {
  const update = (index: number, patch: Partial<Package>) => {
    change(
      config.packages.map((pack, i) =>
        i === index ? { ...pack, ...patch } : pack,
      ),
    );
  };
  return (
    <section>
      <h2>Fixed packages</h2>
      <p>
        Every offer has fixed contents, an exact price and a delivery
        commitment. Customers provide delivery information only. Capacity is
        checked when they order.
      </p>
      {config.packages.map((pack, i) => (
        <details data-catalog-package={i} key={i} className="catalog-section">
          <summary>
            {pack.name} · {pack.key}
          </summary>
          <div className="catalog-grid">
            <Text
              name={`packages.${String(i)}.key`}
              label="Package key"
              value={pack.key}
              change={(key) => {
                update(i, { key });
              }}
            />
            <Text
              name={`packages.${String(i)}.name`}
              label="Package name"
              value={pack.name}
              change={(name) => {
                update(i, { name });
              }}
            />
            <Select
              name={`packages.${String(i)}.service`}
              label="Package service"
              value={pack.service}
              change={(service) => {
                update(i, { service });
              }}
              options={[
                ["", "Choose service"],
                ...config.services.map((s) => [s.key, s.name] as const),
              ]}
            />
          </div>
          <Text
            name={`packages.${String(i)}.description`}
            label="Package description"
            multiline
            value={pack.description}
            change={(description) => {
              update(i, { description });
            }}
          />
          <ArtworkUpload
            name={`packages.${String(i)}.asset`}
            label="Package cover"
            purpose="product"
            pathLabel="Approved package artwork path"
            value={pack.asset ?? ""}
            change={(asset) => {
              update(i, { asset });
            }}
          />
          <Text
            name={`packages.${String(i)}.asset_alt`}
            label="Package cover alternative text"
            value={pack.asset_alt ?? ""}
            change={(asset_alt) => {
              update(i, { asset_alt });
            }}
          />
          <Text
            name={`packages.${String(i)}.asset_source`}
            label="Package artwork source and permission"
            value={pack.asset_source ?? ""}
            change={(asset_source) => {
              update(i, { asset_source });
            }}
          />
          {pack.variants.map((variant, j) => {
            const fields =
              config.services.find((s) => s.key === pack.service)?.fields ?? [];
            const patch = (value: Partial<typeof variant>) => {
              update(i, {
                variants: pack.variants.map((v, index) =>
                  index === j ? { ...v, ...value } : v,
                ),
              });
            };
            return (
              <fieldset key={j} className="catalog-item">
                <legend>Variant {j + 1}</legend>
                <div className="catalog-grid">
                  <Text
                    name={`packages.${String(i)}.variants.${String(j)}.key`}
                    label="Variant key"
                    value={variant.key}
                    change={(key) => {
                      patch({ key });
                    }}
                  />
                  <Text
                    name={`packages.${String(i)}.variants.${String(j)}.name`}
                    label="Variant name"
                    value={variant.name}
                    change={(name) => {
                      patch({ name });
                    }}
                  />
                  <Select
                    name={`packages.${String(i)}.variants.${String(j)}.currency`}
                    label="Pricing currency"
                    value={variant.currency}
                    change={(currency) => {
                      patch({ currency });
                    }}
                    options={[
                      ["", "Select currency"],
                      ["USD", "USD"],
                      ["EUR", "EUR"],
                      ["GBP", "GBP"],
                    ]}
                  />
                  <MoneyInput
                    name={`packages.${String(i)}.variants.${String(j)}.amount_minor`}
                    label="Package price"
                    currency={variant.currency}
                    precision={2}
                    value={variant.amount_minor}
                    change={(amount_minor) => {
                      patch({ amount_minor });
                    }}
                  />
                  <NumberInput
                    name={`packages.${String(i)}.variants.${String(j)}.delivery_min_hours`}
                    label="Minimum delivery hours"
                    value={variant.delivery_min_hours}
                    change={(delivery_min_hours) => {
                      patch({ delivery_min_hours });
                    }}
                  />
                  <NumberInput
                    name={`packages.${String(i)}.variants.${String(j)}.delivery_max_hours`}
                    label="Maximum delivery hours"
                    value={variant.delivery_max_hours}
                    change={(delivery_max_hours) => {
                      patch({ delivery_max_hours });
                    }}
                  />
                </div>
                <Check
                  label="Limit capacity"
                  value={variant.capacity !== undefined}
                  change={(limit) => {
                    patch({ capacity: limit ? 0 : undefined });
                  }}
                />
                {variant.capacity !== undefined && (
                  <NumberInput
                    name={`packages.${String(i)}.variants.${String(j)}.capacity`}
                    label="Available capacity"
                    value={variant.capacity}
                    change={(capacity) => {
                      patch({ capacity });
                    }}
                  />
                )}
                <PackageScopeEditor
                  service={config.services.find((s) => s.key === pack.service)}
                  config={config}
                  variant={variant}
                  path={`packages.${String(i)}.variants.${String(j)}`}
                  change={patch}
                />
                <ConditionEditor
                  path={`packages.${String(i)}.variants.${String(j)}.eligibility`}
                  label="Variant eligibility"
                  fields={fields}
                  value={variant.eligibility}
                  change={(eligibility) => {
                    patch({ eligibility });
                  }}
                />
                <Ordering
                  index={j}
                  count={pack.variants.length}
                  change={(direction) => {
                    update(i, { variants: move(pack.variants, j, direction) });
                  }}
                  remove={() => {
                    update(i, {
                      variants: pack.variants.filter((_, index) => index !== j),
                    });
                  }}
                />
              </fieldset>
            );
          })}
          <Action
            disabled={pack.variants.length >= 20}
            onClick={() => {
              update(i, {
                variants: [
                  ...pack.variants,
                  emptyVariant(nextKey("variant", pack.variants)),
                ],
              });
            }}
          >
            Add variant
          </Action>
          <Ordering
            index={i}
            count={config.packages.length}
            change={(direction) => {
              change(move(config.packages, i, direction));
            }}
            remove={() => {
              change(config.packages.filter((_, index) => index !== i));
            }}
          />
        </details>
      ))}
      <Action
        disabled={config.packages.length >= 40}
        onClick={() => {
          change([
            ...config.packages,
            {
              key: nextKey("package", config.packages),
              name: "New package",
              description: "",
              service: config.services[0]?.key ?? "",
              variants: [],
            },
          ]);
        }}
      >
        Add package
      </Action>
    </section>
  );
}
