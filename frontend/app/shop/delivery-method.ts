import type { Definition } from "./model";

export const instantDeliveryNames = {
  id: "Instant top-up",
  code: "Instant code delivery",
  account: "Account sign-in · 24–72 hours",
};

// Retain positive ranges in historical publications and accepted snapshots.
export function productDeliveryLabel(value: Definition): string {
  if (value.supplier) {
    if (value.supplier.method === "account")
      return instantDeliveryNames.account;
    if (
      value.policy.delivery_min_hours === 0 &&
      value.policy.delivery_max_hours === 0
    )
      return instantDeliveryNames[value.supplier.method];
  }
  return `${String(value.policy.delivery_min_hours)}–${String(value.policy.delivery_max_hours)} hours`;
}

export function supplierContractDelivery(basis?: string): string | null {
  switch (basis) {
    case "supplier_instant_id_v1":
      return instantDeliveryNames.id;
    case "supplier_instant_code_v1":
      return instantDeliveryNames.code;
    case "supplier_account_24_72_v1":
      return instantDeliveryNames.account;
    default:
      return null;
  }
}
