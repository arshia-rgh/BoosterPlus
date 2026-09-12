import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Action, ErrorNotice, Select, Text } from "../catalog/controls";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import {
  jobSchema,
  jobStateSchema,
  listingSchema,
  kindLabel,
  stateLabel,
  failureLabel,
  type Job,
} from "./model";
function Retry({ job, reload }: { job: Job; reload: () => void }) {
  const [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function retry() {
    setBusy(true);
    setError(null);
    try {
      await post(
        `/admin/jobs/${encodeURIComponent(job.id)}/retry`,
        { generation: job.retry_generation, reason },
        jobSchema,
      );
      reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  if (!job.retryable) return null;
  return (
    <details>
      <summary>Review and retry this task</summary>
      <p>
        Investigate the failure first. Another attempt may resend an email after
        an ambiguous delivery result; the handler checks current eligibility and
        expired references. Sign in again or refresh both factors in{" "}
        <Link to="/account">account security</Link> if requested.
      </p>
      <ErrorNotice error={error} />
      <fieldset disabled={busy}>
        <legend>Audited task recovery</legend>
        <Text
          label="Reason for retry"
          multiline
          value={reason}
          change={setReason}
          help="Describe the investigation and why another attempt is appropriate. Do not include credentials or private message content."
        />
        <Action
          disabled={!reason.trim()}
          onClick={() => {
            void retry();
          }}
        >
          Queue another attempt
        </Action>
      </fieldset>
    </details>
  );
}
export default function BackgroundJobs() {
  const [params, setParams] = useSearchParams(),
    state = params.get("state") ?? "failed",
    kind = params.get("kind") ?? "",
    after = params.get("after") ?? "",
    resource = useResource(
      `/admin/jobs?state=${encodeURIComponent(state)}&kind=${encodeURIComponent(kind)}&after=${encodeURIComponent(after)}`,
      listingSchema,
    );
  function change(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "after") next.delete("after");
    setParams(next);
  }
  return (
    <section>
      <h2>Background task recovery</h2>
      <p>
        Inspect task state without viewing payloads or secrets. Retry only after
        investigation; scheduled and running tasks cannot be manually retried.
      </p>
      <Link to="/admin">Back to operations</Link>
      <Select
        label="Task state"
        value={state}
        change={(value) => {
          change("state", value);
        }}
        options={jobStateSchema.options.map(
          (value) => [value, stateLabel(value)] as const,
        )}
      />
      <Select
        label="Task kind"
        value={kind}
        change={(value) => {
          change("kind", value);
        }}
        options={[
          ["", "All task kinds"],
          ...[
            "payments.invoice",
            "payments.reconcile",
            "system.ping",
            "identity.email",
            "activity.email",
            "media.scan",
            "availability.changed",
            "availability.fanout",
            "availability.email",
          ].map((value) => [value, kindLabel(value)] as const),
        ]}
      />
      <Action onClick={resource.reload}>Refresh background tasks</Action>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Loading background tasks…</p>}
      {resource.data && (
        <>
          {!resource.data.items.length && <p>No tasks match this view.</p>}
          {resource.data.items.map((job) => (
            <article
              className="catalog-section"
              key={job.id}
              aria-label={`Task ${job.id}`}
            >
              <h3>{kindLabel(job.kind)}</h3>
              <p>
                {stateLabel(job.state)} · {job.attempts} of {job.max_attempts}{" "}
                automatic attempts
              </p>
              <p>{failureLabel(job.error_code)}</p>
              <dl>
                <dt>Task reference</dt>
                <dd className="wrap-anywhere">{job.id}</dd>
                <dt>Created</dt>
                <dd>
                  <time dateTime={job.created_at}>
                    {new Date(job.created_at).toLocaleString()}
                  </time>
                </dd>
                <dt>Scheduled</dt>
                <dd>
                  <time dateTime={job.available_at}>
                    {new Date(job.available_at).toLocaleString()}
                  </time>
                </dd>
                {job.lease_until && (
                  <>
                    <dt>Current lease ends</dt>
                    <dd>
                      <time dateTime={job.lease_until}>
                        {new Date(job.lease_until).toLocaleString()}
                      </time>
                    </dd>
                  </>
                )}
              </dl>
              <Retry
                key={job.retry_generation}
                job={job}
                reload={resource.reload}
              />
              {job.state === "failed" && !job.retryable && (
                <p>
                  This task requires operator investigation before it can be
                  recovered.
                </p>
              )}
            </article>
          ))}
          {resource.data.next && (
            <Action
              onClick={() => {
                change("after", resource.data?.next ?? "");
              }}
            >
              Older tasks
            </Action>
          )}
        </>
      )}
      {after && (
        <Action
          onClick={() => {
            change("after", "");
          }}
        >
          Newest tasks
        </Action>
      )}
    </section>
  );
}
