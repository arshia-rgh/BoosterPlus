import type { summarySchema } from "./model";
import type { z } from "../validation";
export type OrderSummary = z.infer<typeof summarySchema>;
export function orderKind(kind: OrderSummary["kind"]) {
  return kind === "account"
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
      return order.kind === "account"
        ? "Follow account handoff"
        : "Follow assignment and setup";
    case "in_progress":
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
