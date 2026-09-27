import type { Work } from "./model";
export function workNextStep(work: Pick<Work, "state" | "completion_pending">) {
  if (work.completion_pending)
    return "Completion is awaiting administrator review. Keep proof and coordination available.";
  switch (work.state) {
    case "on_hold":
      return "Check the hold reason and permitted actions before continuing work.";
    case "queued":
      return "Review the shared instructions, handoff and schedule before starting.";
    case "in_progress":
      return "Keep reported progress and proof up to date, and coordinate any changes.";
    case "completed":
      return "Work is approved complete. The recorded scope and updates remain available.";
    case "cancelled":
      return "This work is cancelled. Review the recorded decision before taking any further action.";
    default:
      return "Review the current instructions and contact the team if you need help.";
  }
}

export function customerWorkNextStep(
  work: Pick<Work, "state" | "completion_pending">,
) {
  if (work.completion_pending)
    return "Your booster submitted completion for staff review. You can review the shared proof while confirmation is pending.";
  switch (work.state) {
    case "queued":
      return "Check whether staff needs your setup details, then coordinate a session if you are playing together.";
    case "in_progress":
      return "Follow the latest staff update and shared proof. Use shared coordination for session changes, or private support for other questions.";
    case "on_hold":
      return "Read the hold update and contact private support if you need help with the next step.";
    case "completed":
      return "Staff approved your completed order. Your proof, messages and payment receipt remain available.";
    case "cancelled":
      return "Your order was cancelled. Check the recorded decision and Help section for any case or refund updates.";
    default:
      return "Follow the latest update for your order or ask private support for help.";
  }
}
