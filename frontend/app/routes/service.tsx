import { loadOffering } from "../catalog/loaders.server";
import { ServicePage } from "../catalog/public";
export function meta() {
  return [{ title: "Custom boosting — Booster Plus" }];
}
export function loader({
  params,
}: {
  params: Record<string, string | undefined>;
}) {
  return loadOffering(params.slug, params.service, "service");
}
export default ServicePage;
