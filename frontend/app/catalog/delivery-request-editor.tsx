import { Action, Select } from "./controls";
import { deliveryClock } from "./delivery-hours";
import type { Service } from "./model";

export default function DeliveryRequestEditor({
  service,
  path,
  change,
}: {
  service: Service;
  path: string;
  change: (value: Partial<Service>) => void;
}) {
  const request = service.delivery_request;
  if (!request) return null;
  const fields = service.fields.filter(
    (field) => field.type === "integer" && field.stage !== "fulfillment",
  );
  return (
    <fieldset className="catalog-item">
      <legend>Requested delivery timing</legend>
      <p>
        {deliveryClock} These field references also identify the request in
        quote review.
      </p>
      {(
        [
          { bound: "minimum", value: request.minimum },
          { bound: "maximum", value: request.maximum },
        ] as const
      ).map(({ bound, value }) => (
        <Select
          key={bound}
          name={`${path}.${bound}`}
          label={`${bound === "minimum" ? "Minimum" : "Maximum"} requested hours field`}
          value={value}
          options={[
            ["", "Choose an integer hours field"],
            ...fields.map((field) => [field.key, field.label] as const),
            ...(value && !fields.some((field) => field.key === value)
              ? [[value, `Unavailable field: ${value}`] as const]
              : []),
          ]}
          change={(key) => {
            change({ delivery_request: { ...request, [bound]: key } });
          }}
        />
      ))}
      <Action
        onClick={() => {
          change({ delivery_request: undefined });
        }}
      >
        Remove timing declaration
      </Action>
      <p className="quiet">
        Removing the declaration keeps its fields and rules for you to review
        separately.
      </p>
    </fieldset>
  );
}
