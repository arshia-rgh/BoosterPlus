import { loadOffering } from "../catalog/loaders.server";
import { PackagePage } from "../catalog/public";
export function meta() {
  return [{ title: "Fixed package — PLAYORA" }];
}
export function loader({
  params,
}: {
  params: Record<string, string | undefined>;
}) {
  return loadOffering(params.slug, params.pack, "package");
}
export default PackagePage;
