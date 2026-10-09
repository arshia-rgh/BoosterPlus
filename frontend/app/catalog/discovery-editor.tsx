import MetricPolicyEditor from "./metric-policy-editor";
import PromotionEditor from "./promotion-editor";
import { Select, Text } from "./controls";
import type { Configuration } from "./model";

const services = [
  ["boost", "Boosting"],
  ["accounts", "Accounts"],
  ["shop", "Shop"],
  ["news", "News"],
] as const;

type Discovery = NonNullable<Configuration["discovery"]>;

function initialDiscovery(config: Configuration): Discovery {
  return (
    config.discovery ?? {
      capabilities: services.map(([service]) => ({
        service,
        state:
          (service === "boost" && config.services.length > 0) ||
          service === "accounts"
            ? ("active" as const)
            : ("off" as const),
        description: "",
        reason: "",
      })),
      promotions: [],
    }
  );
}

export default function DiscoveryEditor({
  config,
  slug,
  change,
  offersOnly = false,
  hideOffers = false,
}: {
  offersOnly?: boolean;
  hideOffers?: boolean;
  config: Configuration;
  slug: string;
  change: (value: Discovery) => void;
}) {
  const value = initialDiscovery(config);
  const update = (patch: Partial<Discovery>) => {
    change({ ...value, ...patch });
  };
  const offers = (
    <PromotionEditor
      config={config}
      slug={slug}
      value={value.promotions ?? []}
      change={(promotions) => {
        update({ promotions });
      }}
    />
  );
  if (offersOnly) return offers;
  return (
    <section aria-label="Service availability and public statistics">
      <h3>Services on this game page</h3>
      <p>
        Choose what customers can explore. Pausing stops new orders; existing
        orders remain available to their customers and assigned staff. Changes
        take effect only when you publish this catalog.
      </p>
      <div className="discovery-editor-grid">
        {services.map(([service, label]) => {
          const policy = value.capabilities.find(
            (item) => item.service === service,
          ) ?? {
            service,
            state: "off" as const,
            description: "",
            reason: "",
          };
          const patch = (fields: Partial<typeof policy>) => {
            update({
              capabilities: services.map(([key]) =>
                key === service
                  ? { ...policy, ...fields }
                  : (value.capabilities.find(
                      (item) => item.service === key,
                    ) ?? {
                      service: key,
                      state: "off",
                      description: "",
                      reason: "",
                    }),
              ),
            });
          };
          return (
            <fieldset className="catalog-item" key={service}>
              <legend>{label}</legend>
              <Select
                label={`${label} availability`}
                name={`discovery.capabilities.${service}.state`}
                value={policy.state}
                change={(state) => {
                  patch({ state: state as typeof policy.state });
                }}
                options={[
                  ["off", "Not offered"],
                  ["active", "Available"],
                  ["paused", "Temporarily unavailable"],
                ]}
              />
              <Text
                label={`${label} description`}
                name={`discovery.capabilities.${service}.description`}
                value={policy.description}
                multiline
                change={(description) => {
                  patch({ description });
                }}
                help="Short customer-facing introduction, up to 600 characters."
              />
              {policy.state === "paused" && (
                <Text
                  label={`${label} unavailable reason`}
                  name={`discovery.capabilities.${service}.reason`}
                  value={policy.reason}
                  change={(reason) => {
                    patch({ reason });
                  }}
                  help="Explain what customers should expect. Do not promise a return date unless it is confirmed."
                />
              )}
            </fieldset>
          );
        })}
      </div>
      <MetricPolicyEditor
        value={value.metrics}
        change={(metrics) => {
          update({ metrics });
        }}
      />
      {!hideOffers && offers}
    </section>
  );
}
