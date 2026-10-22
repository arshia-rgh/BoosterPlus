import registry from "../../contracts/payment-routes.json" with { type: "json" };
import type { Policy } from "./model";

export const paymentRoutes = registry;
export const maximumRoutes = 40;
export const routeGroups = [
  "Popular coins",
  "USDT",
  "USDC",
  "Other stablecoins",
  "Other options",
];
export function knownRoute(code: string, network: string) {
  return paymentRoutes.find(
    (route) => route.code === code && route.network === network,
  );
}
export function routeGroup(route: Policy["routes"][number]) {
  return knownRoute(route.code, route.network)?.group ?? "Other options";
}
export function routeLabel(route: Policy["routes"][number]) {
  return (
    knownRoute(route.code, route.network)?.label ??
    `${route.label} · ${route.network}`
  );
}
export function routeMatches(route: Policy["routes"][number], search: string) {
  const known = knownRoute(route.code, route.network);
  return [
    route.label,
    route.code,
    route.network,
    known?.symbol ?? "",
    known?.network_label ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .includes(search.trim().toLowerCase());
}
export function manualPayoutNetwork(network: string) {
  return ["bsc", "eth", "trx", "sol"].includes(network);
}
