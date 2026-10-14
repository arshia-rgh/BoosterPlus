import { Action, ErrorNotice, Select } from "../catalog/controls";
import { useResource } from "../orders/resource";
import { routeSchema } from "../payments/model";
import { Loading } from "../ui/loading";
import { z } from "../validation";
import type { SellerTerms } from "./model";

const payoutRoutesSchema = z.object({
  published: z
    .object({
      id: z.string(),
      data: z.object({ routes: z.array(routeSchema) }),
    })
    .nullable(),
});
export const routeKey = (value: { currency: string; network: string }) =>
  value.currency ? JSON.stringify([value.currency, value.network]) : "";

export function useSellerRoutes() {
  return useResource("/admin/finance/policy", payoutRoutesSchema);
}

export function sellerRouteIssue(
  resource: ReturnType<typeof useSellerRoutes>,
  terms: Pick<SellerTerms, "currency" | "network">,
) {
  if (resource.loading) return "Wait for the published payout routes to load.";
  if (resource.error || !resource.data)
    return "Payout routes could not be checked. Refresh payout routes and try again.";
  const routes = resource.data.published?.data.routes ?? [];
  if (!routes.length)
    return "No payout route is published. Publish a payment policy in Finance, then refresh payout routes.";
  if (
    !routes.some(
      (v) => v.code === terms.currency && v.network === terms.network,
    )
  )
    return "Choose an available payout asset and network from the list.";
  return null;
}

export function SellerRoute({
  resource,
  terms,
  change,
}: {
  resource: ReturnType<typeof useSellerRoutes>;
  terms: Pick<SellerTerms, "currency" | "network">;
  change: (currency: string, network: string) => void;
}) {
  const routes = resource.data?.published?.data.routes ?? [];
  const value = routeKey(terms);
  const selected = routes.find(
    (v) => v.code === terms.currency && v.network === terms.network,
  );
  return (
    <section aria-label="Seller payout route">
      <Select
        name="terms.currency"
        label="Payout asset and network"
        value={value}
        disabled={resource.loading || !!resource.error || !routes.length}
        options={[
          ["", "Choose a payout route"],
          ...(value && !selected
            ? [[value, "Previously selected route — unavailable"] as const]
            : []),
          ...routes.map(
            (v) =>
              [
                routeKey({ currency: v.code, network: v.network }),
                v.label,
              ] as const,
          ),
        ]}
        change={(key) => {
          const route = routes.find(
            (v) => routeKey({ currency: v.code, network: v.network }) === key,
          );
          change(route?.code ?? "", route?.network ?? "");
        }}
      />
      {selected && (
        <p className="quiet" role="status">
          Selected route: {selected.label}
        </p>
      )}
      <p className="quiet">
        Only published routes are available. Changing the route clears the
        conversion quote; your account base price and terms stay in place.
      </p>
      {resource.loading && <Loading compact label="Loading payout routes" />}
      <ErrorNotice
        error={resource.error}
        message="Payout routes could not be loaded. Your entries are preserved; refresh the routes to try again."
      />
      {!resource.loading && !resource.error && !routes.length && (
        <p role="status">
          No payout route is published. Publish a payment policy in Finance,
          then refresh here.
        </p>
      )}
      {!resource.loading && !resource.error && value && !selected && (
        <p role="status">
          The selected route is no longer published. Choose another route and
          enter its conversion quote.
        </p>
      )}
      <Action disabled={resource.loading} onClick={resource.reload}>
        Refresh payout routes
      </Action>
    </section>
  );
}
