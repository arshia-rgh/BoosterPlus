import { useState } from "react";
import { z } from "../validation";
import { Action, ErrorNotice } from "../catalog/controls";
import { useResource } from "../orders/resource";
const schema = z.object({
  items: z.array(
    z.object({
      generation: z.number().int(),
      number: z.number().int(),
      outcome: z.enum([
        "running",
        "complete",
        "handler_failed",
        "lease_expired",
        "unavailable",
      ]),
      started_at: z.string(),
      finished_at: z.string().nullable(),
    }),
  ),
  next: z.string(),
});
const outcomeLabels = new Map([
  ["running", "Started; awaiting outcome"],
  ["complete", "Completed"],
  ["handler_failed", "Handler reported failure"],
  ["lease_expired", "Worker lease expired"],
  ["unavailable", "Outcome unavailable"],
]);
function History({ id }: { id: string }) {
  const [after, setAfter] = useState("");
  const resource = useResource(
    `/admin/jobs/${encodeURIComponent(id)}/attempts?after=${encodeURIComponent(after)}`,
    schema,
  );
  return (
    <section aria-label="Recorded task attempts">
      <p>
        Attempts are recorded from the deployment that introduced this history.
        Earlier attempt timestamps are unavailable. No message, payment or file
        contents are shown.
      </p>
      <Action disabled={resource.loading} onClick={resource.reload}>
        Refresh attempt history
      </Action>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Loading attempt history…</p>}
      {resource.data && (
        <>
          <ol className="secondary-list">
            {resource.data.items.map((item) => (
              <li key={`${String(item.generation)}:${String(item.number)}`}>
                <h4>
                  Run {item.generation + 1} · Attempt {item.number}
                </h4>
                <p>{outcomeLabels.get(item.outcome)}</p>
                <p>
                  Started{" "}
                  <time dateTime={item.started_at}>
                    {new Date(item.started_at).toLocaleString()}
                  </time>
                </p>
                {item.finished_at && (
                  <p>
                    Finished{" "}
                    <time dateTime={item.finished_at}>
                      {new Date(item.finished_at).toLocaleString()}
                    </time>
                  </p>
                )}
              </li>
            ))}
          </ol>
          {!resource.data.items.length && (
            <p>
              No recorded attempts. This task may predate attempt recording or
              may not have run.
            </p>
          )}
          {resource.data.next && (
            <Action
              onClick={() => {
                setAfter(resource.data?.next ?? "");
              }}
            >
              Older attempts
            </Action>
          )}
        </>
      )}
      {after && (
        <Action
          onClick={() => {
            setAfter("");
          }}
        >
          Newest attempts
        </Action>
      )}
    </section>
  );
}
export function AttemptHistory({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      onToggle={(e) => {
        setOpen(e.currentTarget.open);
      }}
    >
      <summary>Recorded attempt history</summary>
      {open && <History id={id} />}
    </details>
  );
}
