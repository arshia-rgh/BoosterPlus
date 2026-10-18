import type { Cosmetics } from "../catalog/model";
import type { Product } from "./model";

export function skinTotal(
  collection: Cosmetics | undefined,
): number | undefined {
  if (!collection) return undefined;
  let total = 0;
  for (const g of collection.groups) {
    if (
      !/^[1-9]\d{0,2}$/.test(g.count) ||
      Number(g.count) > 500 ||
      Number(g.count) !== g.names.length
    )
      return undefined;
    total += Number(g.count);
  }
  return total <= 1000 ? total : undefined;
}

export function accountCount(
  product: Product,
  kind: "heroes" | "skins",
): number | string | undefined {
  const count =
    kind === "heroes" ? product.hero_count : skinTotal(product.skin_collection);
  if (count !== undefined) return count;
  const labels =
    kind === "heroes" ? ["heroes", "hero count"] : ["skins", "skin count"];
  return product.attributes.find((a) =>
    labels.includes(a.label.trim().toLowerCase()),
  )?.value;
}
export function isCountAttribute(label: string): boolean {
  return ["heroes", "hero count", "skins", "skin count"].includes(
    label.trim().toLowerCase(),
  );
}

export function supersededCount(product: Product, label: string): boolean {
  const key = label.trim().toLowerCase();
  if (["heroes", "hero count"].includes(key))
    return product.hero_count !== undefined;
  if (["skins", "skin count"].includes(key))
    return skinTotal(product.skin_collection) !== undefined;
  return false;
}
