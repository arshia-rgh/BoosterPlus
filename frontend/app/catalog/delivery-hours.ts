import { emptyField, type Service, type Answers } from "./model";

export const deliveryClock =
  "Requested elapsed hours after payment is verified and required delivery information or access is ready. The final quote confirms the agreed timing; this request is not a guarantee.";

/** An explicit draft-only template; never changes a published game or old priority field. */
export function withDeliveryHours(service: Service): Partial<Service> {
  const keys = ["delivery_min_hours", "delivery_max_hours"];
  if (
    service.fields.length > 38 ||
    service.rules.length >= 40 ||
    service.fields.some((field) => keys.includes(field.key)) ||
    service.rules.some((rule) => rule.key === "delivery_hours")
  )
    return {};
  return {
    delivery_request: {
      minimum: keys[0] ?? "",
      maximum: keys[1] ?? "",
      basis: "payment_and_access_v1",
    },
    fields: [
      ...service.fields,
      ...keys.map((key, i) => ({
        ...emptyField(key),
        label: i === 0 ? "Minimum delivery hours" : "Maximum delivery hours",
        type: "integer" as const,
        stage: "estimate" as const,
        required: true,
        min: "1",
        max: "720",
        step: "1",
        unit: "hours",
        help: deliveryClock,
      })),
    ],
    rules: [
      ...service.rules,
      {
        key: "delivery_hours",
        kind: "ordered_numbers",
        from: "delivery_min_hours",
        to: "delivery_max_hours",
        from_units: "",
        to_units: "",
        message:
          "Maximum delivery hours must be at least the minimum hours you requested.",
      },
    ],
  };
}

export const agreedDeliveryClock =
  "Elapsed calendar hours after payment is verified and the required delivery information and access are ready.";
export function requestedDelivery(
  service: Service | undefined,
  answers: Answers,
) {
  const policy = service?.delivery_request;
  if (!policy) return null;
  const lower = answers[policy.minimum],
    upper = answers[policy.maximum];
  if (
    typeof lower !== "string" ||
    typeof upper !== "string" ||
    !/^[1-9][0-9]{0,3}$/.test(lower) ||
    !/^[1-9][0-9]{0,3}$/.test(upper) ||
    Number(lower) > Number(upper) ||
    Number(upper) > 8760
  )
    return null;
  return `${lower}–${upper} hours requested`;
}
