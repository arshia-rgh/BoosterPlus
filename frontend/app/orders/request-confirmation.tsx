import type { Detail } from "./model";

// Confirmation follows the owned server record, never a redirect flag or estimate.
export default function RequestConfirmation({ detail }: { detail: Detail }) {
  const state = detail.order.state;
  if (
    detail.order.kind !== "custom" ||
    detail.contract ||
    !["submitted", "needs_information", "rejected"].includes(state)
  )
    return null;
  return (
    <section
      className="catalog-section request-confirmation"
      aria-label="Request confirmation"
    >
      <p className="eyebrow">MY ACCOUNT · YOUR BOOST REQUEST</p>
      <h2>
        {state === "submitted"
          ? "Your request is with our team."
          : state === "needs_information"
            ? "Our team needs more information."
            : "This request could not be accepted."}
      </h2>
      <p>Request {detail.order.id}</p>
      <p>
        {state === "submitted"
          ? "Staff will review your selections. Any questions and the final quote will appear in this order. Keep this page or return through My account → Orders."
          : state === "needs_information"
            ? "Read the latest staff question in Order activity or contact support for this order. Revise your request below when you have the missing details."
            : "Read the reason in Order activity. Contact support for this order if you need help understanding the decision."}
      </p>
      <p>
        <strong>No payment is due for this request.</strong>
        {state !== "rejected" &&
          " You will review and explicitly accept a final quote before paying. Submitting this request does not charge you or start work."}
      </p>
    </section>
  );
}
