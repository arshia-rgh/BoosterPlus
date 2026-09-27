import { z } from "../validation";
import { Action, ErrorNotice } from "../catalog/controls";
import { useResource } from "../orders/resource";
import type { Work } from "./model";
import { ExecutionActions } from "./actions";
const schema = z.object({
  ready: z.boolean(),
  requirement: z.enum([
    "ready",
    "details",
    "game_access",
    "confirmed_session",
    "service_hold",
    "not_active",
  ]),
  checked_at: z.string(),
});
const messages = {
  ready:
    "Required details and access or scheduling prerequisites are present. The server checks again when you start or resume.",
  details: "Waiting for the customer to complete required order details.",
  game_access:
    "Current temporary game access is missing or expired. Ask the customer to update it through their order.",
  confirmed_session:
    "A future confirmed session is required. Review proposals in Sessions.",
  service_hold:
    "An open service case blocks execution. Ask your administrator to resolve the case.",
  not_active:
    "This assignment is no longer active. No start or resume action is available.",
};
export default function AssignmentActions({
  work,
  reload,
}: {
  work: Work;
  reload: () => void;
}) {
  const readiness = useResource(
    `/booster/fulfillment/${work.order_id}/readiness?revision=${String(work.version)}&order=${String(work.order_version)}&access=${String(work.access_version)}`,
    schema,
  );
  return (
    <>
      <section aria-label="Assignment readiness">
        <h3>Ready to work?</h3>
        <ErrorNotice error={readiness.error} />
        {readiness.data ? (
          <p>{messages[readiness.data.requirement]}</p>
        ) : (
          <p role="status">
            {readiness.loading
              ? "Checking required details and access…"
              : "Readiness is unavailable. Check again before starting work."}
          </p>
        )}
        <Action disabled={readiness.loading} onClick={readiness.reload}>
          Check readiness
        </Action>
      </section>
      {!["queued", "in_progress", "on_hold"].includes(work.state) && (
        <p>
          Progress reporting is closed for this assignment. Its overview remains
          available.
        </p>
      )}
      <ExecutionActions
        work={work}
        admin={false}
        reload={reload}
        startAllowed={
          !!readiness.data?.ready && !readiness.loading && !readiness.error
        }
      />
    </>
  );
}
