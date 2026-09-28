import type { summarySchema } from "./model";
import type { z } from "../validation";
export type OrderSummary = z.infer<typeof summarySchema>;
export function orderKind(kind: OrderSummary["kind"]) {
  return kind === "shop"
    ? "Shop purchase"
    : kind === "account"
      ? "Account purchase"
      : kind === "package"
        ? "Fixed package"
        : "Custom boost";
}
export function nextAction(order: Pick<OrderSummary, "state" | "kind">) {
  switch (order.state) {
    case "submitted":
      return "Waiting for staff review";
    case "needs_information":
      return "Update your request";
    case "quoted":
      return "Review your quote";
    case "awaiting_payment":
      return "Check payment instructions";
    case "queued":
      if (order.kind === "shop") return "Follow staff delivery";
      return order.kind === "account"
        ? "Follow account handoff"
        : "Follow assignment and setup";
    case "in_progress":
      if (order.kind === "shop") return "Review shop delivery";
      return order.kind === "account"
        ? "Review account delivery"
        : "View progress and proof";
    case "on_hold":
      return "Review the hold and contact support";
    case "completed":
      return order.kind === "account"
        ? "View delivered account"
        : "View proof and purchase feedback";
    case "cancelled":
    case "rejected":
    case "expired":
      return "Review history or start a new order";
  }
}

export function orderDestination(
  order: Pick<OrderSummary, "id" | "state" | "kind">,
) {
  const section =
    order.state === "awaiting_payment"
      ? "payment"
      : ["queued", "in_progress", "completed"].includes(order.state)
        ? order.kind === "account" || order.kind === "shop"
          ? "delivery"
          : "progress"
        : order.state === "on_hold"
          ? "help"
          : "overview";
  return `/orders/${order.id}?section=${section}`;
}
