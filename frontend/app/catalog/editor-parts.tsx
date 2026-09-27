import FulfillmentEditor from "./fulfillment-editor";
import DeliveryEditor from "./delivery-editor";
import { PricingEditor } from "./pricing-editor";
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
              label="Catalog key"
              value={reference.key}
              change={(key) => {
                update(i, { key });
              }}
            />
            <Text
              label="Catalog label"
              value={reference.label}
              change={(label) => {
                update(i, { label });
              }}
            />
            <Select
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
  field,
  change,
}: {
  field: Field;
  change: (patch: Partial<Field>) => void;
}) {
  return (
    <fieldset className="catalog-item">
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
            label="Default yes"
            value={field.default === true}
            change={(value) => {
              change({ default: value });
            }}
          />
        ) : (
          <Text
            label="Default value"
            value={
              Array.isArray(field.default)
                ? field.default.join(",")
                : String(field.default)
            }
            change={(value) => {
              change({
                default:
                  field.type === "multiselect"
                    ? value
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean)
                    : value,
              });
            }}
            help="Use stable option keys. Multiselect values are comma-separated; numeric defaults use exact decimal text."
          />
        ))}
    </fieldset>
  );
}
export function FieldEditor({
  field,
  change,
  service,
  config,
  intake = false,
}: {
  field: Field;
  intake?: boolean;
  change: (patch: Partial<Field>) => void;
  service: Service;
  config: Configuration;
}) {
  const choice = ["select", "radio", "rank", "multiselect"].includes(
      field.type,
    ),
    number = ["integer", "decimal"].includes(field.type),
    text = ["short_text", "long_text"].includes(field.type);
  return (
    <>
      <div className="catalog-grid">
        <Text
          label="Field key"
          value={field.key}
          change={(key) => {
            change({ key });
          }}
        />
        <Text
          label="Field label"
          value={field.label}
          change={(label) => {
            change({ label });
          }}
        />
        <Select
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
                "short_text",
                "long_text",
                "attachment",
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
            "short_text",
            "long_text",
            "attachment",
          ]
            .filter((type) => !intake || type !== "attachment")
            .map((type) => [type, type])}
        />
        <Select
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
        label="Field help"
        value={field.help}
        change={(help) => {
          change({ help });
        }}
      />
      <Check
        label="Required field"
        value={field.required}
        change={(required) => {
          change({ required });
        }}
      />
      {choice && (
        <>
          <Select
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
              options={field.options}
              change={(options) => {
                change({ options });
              }}
            />
          )}
        </>
      )}
      {number && (
        <div className="catalog-grid">
          <Text
            label="Minimum value"
            value={field.min}
            change={(min) => {
              change({ min });
            }}
          />
          <Text
            label="Maximum value"
            value={field.max}
            change={(max) => {
              change({ max });
            }}
          />
          <Text
            label="Numeric step"
            value={field.step}
            change={(step) => {
              change({ step });
            }}
          />
          <Text
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
            label="Minimum text length"
            value={field.min_length}
            change={(min_length) => {
              change({ min_length });
            }}
          />
          <NumberInput
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
            label="Minimum selections"
            value={field.min_selections}
            change={(min_selections) => {
              change({ min_selections });
            }}
          />
          <NumberInput
            label="Maximum selections"
            value={field.max_selections}
            change={(max_selections) => {
              change({ max_selections });
            }}
          />
        </div>
      )}
      {field.type === "attachment" ? (
        <p>
          Optional order screenshots use private upload and safety checks.
          Choose the order collection stage for screenshots. Later evidence
          belongs in order messages. Never collect credentials or prefill file
          references.
        </p>
      ) : (
        <DefaultEditor field={field} change={change} />
      )}
      <ConditionEditor
        label="Show field when"
        value={field.visible_when}
        change={(visible_when) => {
          change({ visible_when });
        }}
        fields={service.fields}
      />
      <ConditionEditor
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
  rule,
  change,
  fields,
}: {
  rule: Rule;
  change: (patch: Partial<Rule>) => void;
  fields: Field[];
}) {
  const options = [
    ["", "No field"],
    ...fields.map((field) => [field.key, `${field.label} (${field.key})`]),
  ] as [string, string][];
  return (
    <>
      <div className="catalog-grid">
        <Text
          label="Rule key"
          value={rule.key}
          change={(key) => {
            change({ key });
          }}
        />
        <Select
          label="Rule kind"
          value={rule.kind}
          change={(kind) => {
            change({ kind });
          }}
          options={[
            ["reject", "Reject matching answers"],
            ["progression", "Target rank must advance"],
            ["disjoint", "Selections must not overlap"],
          ]}
        />
      </div>
      <Text
        label="Validation message"
        value={rule.message}
        change={(message) => {
          change({ message });
        }}
      />
      {rule.kind !== "reject" && (
        <div className="catalog-grid">
          <Select
            label="Starting field"
            value={rule.from}
            change={(from) => {
              change({ from });
            }}
            options={options}
          />
          <Select
            label="Target field"
            value={rule.to}
            change={(to) => {
              change({ to });
            }}
            options={options}
          />
          {rule.kind === "progression" && (
            <>
              <Select
                label="Starting units field"
                value={rule.from_units}
                change={(from_units) => {
                  change({ from_units });
                }}
                options={options}
              />
              <Select
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
      <ConditionEditor
        label="Apply rule when"
        value={rule.when}
        change={(when) => {
          change({ when });
        }}
        fields={fields}
      />
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
              label="Service key"
              value={service.key}
              change={(key) => {
                update(i, { key });
              }}
            />
            <Text
              label="Service name"
              value={service.name}
              change={(name) => {
                update(i, { name });
              }}
            />
          </div>
          <Text
            label="Service description"
            multiline
            value={service.description}
            change={(description) => {
              update(i, { description });
            }}
          />
          {showPricing && (
            <PricingEditor
              service={service}
              config={config}
              change={(patch) => {
                update(i, patch);
              }}
            />
          )}
          <FulfillmentEditor
            service={service}
            change={(patch) => {
              update(i, patch);
            }}
          />
          <h3>Form fields</h3>
          <DeliveryEditor
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
          <h3>Combination rules</h3>
          {service.rules.map((rule, j) => (
            <details key={j} className="catalog-section">
              <summary>{rule.key}</summary>
              <RuleEditor
                rule={rule}
                fields={service.fields}
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
        Every variant has its own exact price. Capacity here describes
        availability; reservations are implemented with checkout.
      </p>
      {config.packages.map((pack, i) => (
        <details data-catalog-package={i} key={i} className="catalog-section">
          <summary>
            {pack.name} · {pack.key}
          </summary>
          <div className="catalog-grid">
            <Text
              label="Package key"
              value={pack.key}
              change={(key) => {
                update(i, { key });
              }}
            />
            <Text
              label="Package name"
              value={pack.name}
              change={(name) => {
                update(i, { name });
              }}
            />
            <Select
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
            label="Package description"
            multiline
            value={pack.description}
            change={(description) => {
              update(i, { description });
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
                    label="Variant key"
                    value={variant.key}
                    change={(key) => {
                      patch({ key });
                    }}
                  />
                  <Text
                    label="Variant name"
                    value={variant.name}
                    change={(name) => {
                      patch({ name });
                    }}
                  />
                  <Select
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
                  <Text
                    label="Price in minor units"
                    value={variant.amount_minor}
                    change={(amount_minor) => {
                      patch({ amount_minor });
                    }}
                    help="Whole minor units only, e.g. 1234 represents 12.34. Enter your approved price."
                  />
                  <NumberInput
                    label="Minimum delivery hours"
                    value={variant.delivery_min_hours}
                    change={(delivery_min_hours) => {
                      patch({ delivery_min_hours });
                    }}
                  />
                  <NumberInput
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
                    label="Available capacity"
                    value={variant.capacity}
                    change={(capacity) => {
                      patch({ capacity });
                    }}
                  />
                )}
                <fieldset className="catalog-item">
                  <legend>Required package information</legend>
                  {fields
                    .filter(
                      (f) =>
                        f.stage !== "fulfillment" && f.type !== "attachment",
                    )
                    .map((field) => (
                      <Check
                        key={field.key}
                        label={field.label}
                        value={variant.required_fields.includes(field.key)}
                        change={(selected) => {
                          patch({
                            required_fields: selected
                              ? [...variant.required_fields, field.key]
                              : variant.required_fields.filter(
                                  (key) => key !== field.key,
                                ),
                          });
                        }}
                      />
                    ))}
                </fieldset>
                <ConditionEditor
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
