import { Link } from "../portal-router";
import { AgreementTemplate } from "../resale/agreement-template";
import ArtworkUpload from "../artwork/upload";
import {
  Action,
  Check,
  NumberInput,
  Select,
  Text,
  nextKey,
} from "../catalog/controls";
import type { Definition, RecipientField, Variant } from "./model";
import { instantDeliveryNames } from "./delivery-method";

export function ProductFields({
  section,
  value,
  change,
}: {
  section: string;
  value: Definition;
  change: (value: Definition) => void;
}) {
  const patch = (part: Partial<Definition>) => {
    change({ ...value, ...part, reviewed: false });
  };
  const policy = (part: Partial<Definition["policy"]>) => {
    patch({ policy: { ...value.policy, ...part } });
  };
  return (
    <>
      {section === "basics" && (
        <>
          <h3>Product details</h3>
          <p>
            Describe exactly what the customer receives. These details become
            public only when you publish a reviewed revision.
          </p>
          <Text
            name="title"
            label="Product title"
            value={value.title}
            change={(title) => {
              patch({ title });
            }}
          />
          <Text
            name="description"
            label="Product description"
            multiline
            value={value.description}
            change={(description) => {
              patch({ description });
            }}
          />
          <Text
            name="category"
            label="Category"
            value={value.category}
            change={(category) => {
              patch({ category });
            }}
          />
          <ArtworkUpload
            purpose="product"
            pathLabel="Approved artwork path"
            value={value.asset}
            change={(asset) => {
              patch({ asset });
            }}
          />
          <Text
            name="asset_alt"
            label="Artwork alternative text"
            value={value.asset_alt}
            change={(asset_alt) => {
              patch({ asset_alt });
            }}
          />
          <Text
            name="asset_source"
            label="Artwork source and permission"
            multiline
            value={value.asset_source}
            change={(asset_source) => {
              patch({ asset_source });
            }}
          />
        </>
      )}
      {value.supplier &&
        (section === "variants" || section === "recipient") && (
          <section>
            <h3>
              {section === "variants"
                ? "Reviewed supplier offer"
                : "Required delivery details"}
            </h3>
            <p>{instantDeliveryNames[value.supplier.method]}</p>
            <p>
              Quantity:{" "}
              {value.supplier.quantity.kind === "one"
                ? "One item"
                : `${value.supplier.quantity.min} minimum · ${value.supplier.quantity.step} steps`}
            </p>
            <ul>
              {value.supplier.fields.map((field) => (
                <li key={field.id}>
                  {field.label}
                  {field.required ? " (required)" : " (optional)"}
                  {field.secret ? " · protected" : ""}
                </li>
              ))}
            </ul>
            <p>
              Supplier requirements are locked to the reviewed offer. Customer
              prices refresh before acceptance. Changes in the supplier library
              require a refreshed draft and publication.
            </p>
            <Link
              className="ui-button"
              data-variant="secondary"
              to="/admin/shop/suppliers"
            >
              Open supplier library
            </Link>
          </section>
        )}
      {section === "variants" && !value.supplier && (
        <>
          <h3>Variants and prices</h3>
          <p>
            Each variant has its own compatibility, quantity limits and stock.
            Keep its key stable once published. Prices are exact minor units:
            1234 means 12.34 in the selected currency.
          </p>
          {value.variants.map((variant, i) => (
            <VariantFields
              key={i}
              value={variant}
              index={i}
              change={(v) => {
                patch({
                  variants: value.variants.map((old, index) =>
                    index === i ? v : old,
                  ),
                });
              }}
              remove={() => {
                patch({
                  variants: value.variants.filter((_, index) => index !== i),
                });
              }}
            />
          ))}
          <Action
            disabled={value.variants.length >= 30}
            onClick={() => {
              patch({
                variants: [
                  ...value.variants,
                  {
                    key: nextKey("variant", value.variants),
                    label: "",
                    region: "",
                    platform: "",
                    server: "",
                    currency: "",
                    unit_amount_minor: "",
                    min_quantity: 1,
                    max_quantity: 1,
                    enabled: false,
                  },
                ],
              });
            }}
          >
            Add variant
          </Action>
        </>
      )}
      {section === "recipient" && !value.supplier && (
        <>
          <h3>Delivery information</h3>
          <p>
            Request only identifiers staff need to deliver the item. Never
            request passwords, verification codes or recovery information.
          </p>
          {value.recipient.map((field, i) => (
            <fieldset className="catalog-item" key={field.key}>
              <legend>{field.label}</legend>
              <Text
                name={`recipient.${String(i)}.label`}
                label="Field label"
                value={field.label}
                change={(label) => {
                  patch({
                    recipient: value.recipient.map((old, index) =>
                      index === i ? { ...old, label } : old,
                    ),
                  });
                }}
              />
              <Text
                name={`recipient.${String(i)}.help`}
                label="Customer guidance"
                value={field.help}
                change={(help) => {
                  patch({
                    recipient: value.recipient.map((old, index) =>
                      index === i ? { ...old, help } : old,
                    ),
                  });
                }}
              />
              <NumberInput
                name={`recipient.${String(i)}.max_length`}
                label="Maximum characters"
                value={field.max_length}
                change={(max_length) => {
                  patch({
                    recipient: value.recipient.map((old, index) =>
                      index === i ? { ...old, max_length } : old,
                    ),
                  });
                }}
              />
              <Check
                label="Required for delivery"
                value={field.required}
                change={(required) => {
                  patch({
                    recipient: value.recipient.map((old, index) =>
                      index === i ? { ...old, required } : old,
                    ),
                  });
                }}
              />
              <Action
                onClick={() => {
                  patch({
                    recipient: value.recipient.filter(
                      (_, index) => index !== i,
                    ),
                  });
                }}
              >
                Remove {field.label}
              </Action>
            </fieldset>
          ))}
          <div className="catalog-actions">
            {recipientOptions
              .filter(
                ([key]) => !value.recipient.some((field) => field.key === key),
              )
              .map(([key, label]) => (
                <Action
                  key={key}
                  onClick={() => {
                    patch({
                      recipient: [
                        ...value.recipient,
                        {
                          key,
                          label,
                          help: "",
                          required: false,
                          max_length: 80,
                        },
                      ],
                    });
                  }}
                >
                  Add {label.toLowerCase()}
                </Action>
              ))}
          </div>
        </>
      )}
      {section === "terms" && (
        <>
          <h3>Delivery and commercial terms</h3>
          <p>
            Review the delivery method and approved commercial terms before
            saving.
          </p>
          <div className="catalog-grid">
            {value.supplier ? (
              <div>
                <strong>Delivery method</strong>
                <p>{instantDeliveryNames[value.supplier.method]}</p>
                <p>
                  Set by the reviewed supplier offer. Delivery starts after
                  verified payment and complete required details.
                </p>
              </div>
            ) : (
              <>
                <NumberInput
                  name="policy.delivery_min_hours"
                  label="Minimum delivery hours"
                  value={value.policy.delivery_min_hours}
                  change={(delivery_min_hours) => {
                    policy({ delivery_min_hours });
                  }}
                />
                <NumberInput
                  name="policy.delivery_max_hours"
                  label="Maximum delivery hours"
                  value={value.policy.delivery_max_hours}
                  change={(delivery_max_hours) => {
                    policy({ delivery_max_hours });
                  }}
                />
              </>
            )}
            <NumberInput
              name="policy.reservation_minutes"
              label="Reservation minutes"
              value={value.policy.reservation_minutes}
              change={(reservation_minutes) => {
                policy({ reservation_minutes });
              }}
            />
          </div>
          <AgreementTemplate
            label="Replace policy text with approved shop terms"
            apply={(defaults) => {
              policy({
                delivery_terms: defaults.shop.delivery_terms ?? "",
                cancellation_terms: defaults.shop.cancellation_terms ?? "",
                refund_terms: defaults.shop.refund_terms ?? "",
                fees: defaults.shop.fees ?? "",
                review_terms: defaults.shop.review_terms ?? "",
              });
            }}
          />
          <p>
            Confirm this product’s actual availability, delivery method and
            recipient requirements before publishing.
          </p>
          <Text
            name="policy.delivery_terms"
            label="Delivery terms"
            multiline
            value={value.policy.delivery_terms}
            change={(delivery_terms) => {
              policy({ delivery_terms });
            }}
          />
          <Text
            name="policy.cancellation_terms"
            label="Cancellation terms"
            multiline
            value={value.policy.cancellation_terms}
            change={(cancellation_terms) => {
              policy({ cancellation_terms });
            }}
          />
          <Text
            name="policy.refund_terms"
            label="Refund terms"
            multiline
            value={value.policy.refund_terms}
            change={(refund_terms) => {
              policy({ refund_terms });
            }}
          />
          <Text
            name="policy.fees"
            label="Fees and included charges"
            multiline
            value={value.policy.fees}
            change={(fees) => {
              policy({ fees });
            }}
          />
          <p>
            {value.supplier
              ? "Delivery follows verified supplier status. Partial or uncertain delivery requires support review."
              : "Staff must submit delivery evidence for review before completion."}
          </p>
          <Check
            label="Allow verified customer reviews for this product"
            value={value.policy.review_enabled}
            change={(review_enabled) => {
              policy({ review_enabled });
            }}
          />
          {value.policy.review_enabled && (
            <Text
              name="policy.review_terms"
              label="Customer review terms"
              multiline
              value={value.policy.review_terms}
              change={(review_terms) => {
                policy({ review_terms });
              }}
            />
          )}
        </>
      )}
    </>
  );
}
const recipientOptions: readonly (readonly [RecipientField["key"], string])[] =
  [
    ["player_id", "Player identifier"],
    ["server_id", "Server identifier"],
    ["character_name", "Character name"],
    ["delivery_note", "Delivery note"],
  ];
function VariantFields({
  value,
  index,
  change,
  remove,
}: {
  value: Variant;
  index: number;
  change: (value: Variant) => void;
  remove: () => void;
}) {
  const patch = (part: Partial<Variant>) => {
    change({ ...value, ...part });
  };
  return (
    <fieldset className="catalog-item">
      <legend>
        Variant {index + 1}
        {value.label ? ` · ${value.label}` : ""}
      </legend>
      <div className="catalog-grid">
        <Text
          name={`variants.${String(index)}.key`}
          label="Stable variant key"
          value={value.key}
          change={(key) => {
            patch({ key });
          }}
        />
        <Text
          name={`variants.${String(index)}.label`}
          label="Variant label"
          value={value.label}
          change={(label) => {
            patch({ label });
          }}
        />
        <Text
          name={`variants.${String(index)}.region`}
          label="Supported region"
          value={value.region}
          change={(region) => {
            patch({ region });
          }}
        />
        <Text
          name={`variants.${String(index)}.platform`}
          label="Supported platform"
          value={value.platform}
          change={(platform) => {
            patch({ platform });
          }}
        />
        <Text
          name={`variants.${String(index)}.server`}
          label="Supported server"
          value={value.server}
          change={(server) => {
            patch({ server });
          }}
        />
        <Select
          name={`variants.${String(index)}.currency`}
          label="Price currency"
          value={value.currency}
          options={[
            ["", "Choose currency"],
            ["USD", "USD"],
            ["EUR", "EUR"],
            ["GBP", "GBP"],
          ]}
          change={(currency) => {
            patch({ currency });
          }}
        />
        <Text
          name={`variants.${String(index)}.unit_amount_minor`}
          label="Unit price in minor units"
          value={value.unit_amount_minor}
          change={(unit_amount_minor) => {
            patch({ unit_amount_minor });
          }}
        />
        <NumberInput
          name={`variants.${String(index)}.min_quantity`}
          label="Minimum quantity"
          value={value.min_quantity}
          change={(min_quantity) => {
            patch({ min_quantity });
          }}
        />
        <NumberInput
          name={`variants.${String(index)}.max_quantity`}
          label="Maximum quantity"
          value={value.max_quantity}
          change={(max_quantity) => {
            patch({ max_quantity });
          }}
        />
      </div>
      <Check
        label="Offer this variant when published"
        value={value.enabled}
        change={(enabled) => {
          patch({ enabled });
        }}
      />
      <Action onClick={remove}>Remove variant {index + 1}</Action>
    </fieldset>
  );
}
