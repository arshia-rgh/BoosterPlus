import { z } from "../validation";
const sourceSchema = z.object({ financeSearch: z.string().max(2048) });
export function financeReturn(state: unknown): string | null {
  const result = sourceSchema.safeParse(state);
  if (!result.success) return null;
  const source = new URLSearchParams(result.data.financeSearch),
    query = new URLSearchParams();
  const view = source.get("view");
  query.set(
    "view",
    view &&
      ["payments", "cases", "payouts", "policy", "reconcile"].includes(view)
      ? view
      : "payments",
  );
  if (source.get("filter") === "all") query.set("filter", "all");
  const direction = source.get("direction");
  if (direction === "incoming" || direction === "outgoing")
    query.set("direction", direction);
  const reference = source.get("reference");
  if (reference && /^[1-9][0-9]{0,31}$/.test(reference))
    query.set("reference", reference);
  for (const key of ["after", "casesAfter", "outgoingAfter", "payoutAfter"]) {
    const value = source.get(key);
    if (value && /^[a-zA-Z0-9_=-]{1,1024}$/.test(value)) query.set(key, value);
  }
  return "/admin/finance?" + query.toString();
}

export function relatedRecord(
  state: unknown,
  key: "inventoryID" | "submissionID",
): string | null {
  const result = z
    .object({
      inventoryID: z.uuid().optional(),
      inventorySection: z
        .enum(["details", "images", "terms", "publication"])
        .optional(),
      submissionID: z.uuid().optional(),
    })
    .safeParse(state);
  if (!result.success) return null;
  const id =
    key === "inventoryID" ? result.data.inventoryID : result.data.submissionID;
  return id
    ? key === "inventoryID"
      ? `/admin/accounts/${id}?section=${result.data.inventorySection ?? "details"}`
      : `/admin/submissions/${id}?section=handover`
    : null;
}
