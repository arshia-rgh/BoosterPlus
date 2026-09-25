import { activePortal, sessionEventMatches } from "../identity/portal";
import { APIError } from "../identity/api";
import type { z } from "../validation";
import { messageSchema } from "./model";

export type Message = z.infer<typeof messageSchema>;
export function denied(error: unknown) {
  return (
    error instanceof APIError &&
    ([401, 403, 404].includes(error.status) ||
      [
        "sign_in_required",
        "permission_denied",
        "not_found",
        "mfa_required",
        "terms_required",
      ].includes(error.code))
  );
}
export function uncertain(error: unknown) {
  return (
    !(error instanceof APIError) ||
    !error.status ||
    error.status >= 500 ||
    error.status === 408
  );
}
export function mergeMessages(current: Message[], incoming: Message[]) {
  const rows = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) rows.set(item.id, item);
  return [...rows.values()].sort((a, b) => a.sequence - b.sequence);
}
export function kindLabel(kind: string) {
  return kind === "fulfillment"
    ? "Shared boosting coordination"
    : kind === "submission"
      ? "Private seller review"
      : kind === "order"
        ? "Order support"
        : "Pre-sales support";
}
export function stateLabel(state: string) {
  return state === "open"
    ? "Needs staff reply"
    : state === "waiting"
      ? "Waiting for customer"
      : "Resolved";
}

// Sequence/offset reading anchors only. Drafts and messages never enter this cache.
export type ReadingPosition = { sequence: number; offset: number };
const positions = new Map<string, ReadingPosition>();
let owner = "";
export function readingPosition(
  user: string,
  thread: string,
  next?: ReadingPosition,
) {
  const identity = `${activePortal()}:${user}`;
  if (owner !== identity) {
    positions.clear();
    owner = identity;
  }
  if (next !== undefined) {
    positions.set(thread, next);
    if (positions.size > 30) {
      const first = positions.keys().next().value;
      if (first) positions.delete(first);
    }
  }
  return positions.get(thread);
}
if (typeof window !== "undefined") {
  window.addEventListener("boosterplus:session-changed", (event) => {
    if (sessionEventMatches(event, activePortal())) positions.clear();
  });
}
