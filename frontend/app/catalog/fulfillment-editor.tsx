import { Check, NumberInput, Select, Text } from "./controls";
import type { Service } from "./model";
export default function FulfillmentEditor({
  service,
  change,
}: {
  service: Service;
  change: (patch: Partial<Service>) => void;
}) {
  const policy = service.fulfillment;
  return (
    <section className="catalog-section">
      <h3>Fulfillment and staff sharing</h3>
      <p>
        Declare how this service is delivered and the ordinary fields an
        assigned booster may see. Published settings stay with each purchased
        order.
      </p>
      <Check
        label="Configure fulfillment"
        value={!!policy}
        change={(enabled) => {
          change({
            fulfillment: enabled
              ? {
                  mode: "together",
                  field: "",
                  account_value: "",
                  together_value: "",
                  secret_hours: 0,
                  share_fields: [],
                }
              : undefined,
          });
        }}
      />
      {policy && (
        <>
          <Select
            label="Delivery mode"
            value={policy.mode}
            options={[
              ["together", "Play together"],
              ["account", "Play on the customer's account"],
              ["selection", "Customer selects the mode"],
            ]}
            change={(value) => {
              const mode =
                value === "selection"
                  ? "selection"
                  : value === "account"
                    ? "account"
                    : "together";
              change({
                fulfillment: {
                  ...policy,
                  mode,
                  field: "",
                  account_value: "",
                  together_value: "",
                  secret_hours: mode === "together" ? 0 : 24,
                },
              });
            }}
          />
          {policy.mode === "selection" && (
            <>
              <Select
                label="Mode selection field"
                value={policy.field}
                options={[
                  ["", "Choose a required selection"],
                  ...service.fields
                    .filter(
                      (f) =>
                        (f.type === "select" || f.type === "radio") &&
                        f.required &&
                        f.stage !== "fulfillment" &&
                        !f.visible_when,
                    )
                    .map((f) => [f.key, f.label] as const),
                ]}
                change={(field) => {
                  change({ fulfillment: { ...policy, field } });
                }}
              />
              <Text
                label="Play-on-account option key"
                value={policy.account_value}
                change={(account_value) => {
                  change({ fulfillment: { ...policy, account_value } });
                }}
              />
              <Text
                label="Play-together option key"
                value={policy.together_value}
                change={(together_value) => {
                  change({ fulfillment: { ...policy, together_value } });
                }}
              />
            </>
          )}
          {policy.mode !== "together" && (
            <NumberInput
              label="Maximum game credential lifetime (hours)"
              value={policy.secret_hours}
              change={(secret_hours) => {
                change({ fulfillment: { ...policy, secret_hours } });
              }}
            />
          )}
          <fieldset>
            <legend>Fields shared with the assigned booster</legend>
            {service.fields
              .filter((f) => f.type !== "attachment")
              .map((field) => (
                <Check
                  key={field.key}
                  label={field.label}
                  value={policy.share_fields.includes(field.key)}
                  change={(checked) => {
                    change({
                      fulfillment: {
                        ...policy,
                        share_fields: checked
                          ? [...policy.share_fields, field.key]
                          : policy.share_fields.filter(
                              (key) => key !== field.key,
                            ),
                      },
                    });
                  }}
                />
              ))}
          </fieldset>
        </>
      )}
    </section>
  );
}
