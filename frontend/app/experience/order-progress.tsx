import type { Detail } from "../orders/model";
const guidance = {
  submitted: [
    "Your request is with our team",
    "We’ll review your selections and send a final quote. You can follow the timeline or open the order conversation below.",
  ],
  needs_information: [
    "A little more information is needed",
    "Read the requested changes in your timeline, then use Revise request to update your selections.",
  ],
  quoted: [
    "Your quote is ready to review",
    "Check the agreed scope, total, delivery estimate and expiry. Accepting this quote creates an unpaid contract.",
  ],
  awaiting_payment: [
    "Your agreement is saved",
    "Payment has not been verified. Review Payment & receipts for checkout availability, instructions and any existing payment.",
  ],
  queued: [
    "Your order is in the queue",
    "Follow the fulfillment panel for assignment and any information needed before work can begin.",
  ],
  in_progress: [
    "Your boost is underway",
    "Check the fulfillment updates, coordinate with your team, and view published proof in the order conversation.",
  ],
  on_hold: [
    "Work is on hold",
    "Check the latest update and contact your team in the order conversation. The accepted agreement is retained.",
  ],
  completed: [
    "Your order is complete",
    "Review the final updates and published proof. You can share eligible purchase feedback below or prepare a new request.",
  ],
  rejected: [
    "This request was declined",
    "The team’s explanation is recorded in your timeline. Contact support if you need help understanding the decision.",
  ],
  cancelled: [
    "This order is cancelled",
    "Your history remains available. Reorder with the current catalog to review a fresh set of selections and prices.",
  ],
  expired: [
    "This order has expired",
    "This agreement is no longer available to accept. Contact support or prepare a new request using the current catalog.",
  ],
} as const;
export default function OrderProgress({ detail }: { detail: Detail }) {
  let [title, description]: readonly [string, string] =
    guidance[detail.order.state];
  if (
    detail.order.kind === "account" &&
    ["queued", "in_progress", "completed"].includes(detail.order.state)
  ) {
    title =
      detail.order.state === "completed"
        ? "Your account purchase is complete"
        : "Your account handoff is underway";
    description =
      "Review delivery, then open Messages for protected access. Never put credentials in a normal message.";
  }
  if (
    detail.order.kind === "shop" &&
    ["queued", "in_progress", "completed"].includes(detail.order.state)
  ) {
    title =
      detail.order.state === "completed"
        ? "Your shop delivery is complete"
        : "Your shop delivery is underway";
    description =
      "Follow staff updates and reviewed proof in Delivery and Messages.";
  }
  const compact =
    detail.order.kind === "custom" &&
    !detail.contract &&
    ["submitted", "needs_information", "rejected"].includes(detail.order.state);
  const terminal = ["rejected", "cancelled", "expired"].includes(
    detail.order.state,
  );
  const settled = detail.contract?.payment_state === "settled";
  const step =
    detail.order.state === "completed"
      ? 3
      : settled
        ? 2
        : detail.contract || detail.quote
          ? 1
          : 0;
  return (
    <section className="order-guidance" aria-label="Order progress">
      {!compact && (
        <>
          <p className="eyebrow">YOUR NEXT STEP</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </>
      )}
      {!terminal && (
        <ol className="order-steps">
          {[
            "Request received",
            "Review agreement",
            "Paid · fulfillment",
            "Completed",
          ].map((label, i) => (
            <li
              key={label}
              data-reached={i <= step}
              aria-current={i === step ? "step" : undefined}
            >
              {label}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
