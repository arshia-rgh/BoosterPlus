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
