import { Link } from "react-router";
import { Action, ErrorNotice } from "../catalog/controls";
import { useResource } from "../orders/resource";
import { overviewSchema, kindLabel, failureLabel } from "./model";
export default function OperationsOverview() {
  const resource = useResource("/admin/operations", overviewSchema),
    value = resource.data;
  return (
    <section aria-label="Operations overview" className="catalog-section">
      <h2>Operations overview</h2>
      <p>
        Review customer requests, active work and background tasks from one
        place. Counts describe workflow status; they are not revenue or
        settlement reports.
      </p>
      <Action onClick={resource.reload}>Refresh operations</Action>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Loading operations…</p>}
      {value && (
        <>
          <p>
            Refreshed{" "}
            <time dateTime={value.observed_at}>
              {new Date(value.observed_at).toLocaleString()}
            </time>
          </p>
          <div className="identity-grid">
            {value.cards.map((card) => (
              <section className="catalog-section" key={card.key}>
                <h3>
                  <Link to={card.href}>{card.label}</Link>
                </h3>
                <p className="operation-count">{card.count}</p>
                <p>{card.detail}</p>
              </section>
            ))}
          </div>
          <section className="catalog-section">
            <h3>Oldest requests to review</h3>
            {value.requests.length ? (
              <ul className="order-list">
                {value.requests.map((row) => (
                  <li key={row.href}>
                    <Link to={row.href}>{row.label}</Link>
                    <time dateTime={row.at}>
                      {new Date(row.at).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No submitted orders are waiting for review.</p>
            )}
            <Link to="/admin/orders">Open the complete order queue</Link>
          </section>
          <section className="catalog-section">
            <h3>Next confirmed sessions</h3>
            <p>
              Starting within the next 24 hours. Times below use your device’s
              timezone.
            </p>
            {value.sessions.length ? (
              <ul className="order-list">
                {value.sessions.map((row) => (
                  <li key={`${row.href}-${row.at}`}>
                    <Link to={row.href}>{row.label}</Link>
                    <time dateTime={row.at}>
                      {new Date(row.at).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No confirmed sessions start in this window.</p>
            )}
            <Link to="/admin/calendar">Open staff calendars</Link>
          </section>
          <section className="catalog-section">
            <h3>Background tasks needing attention</h3>
            {value.oldest_runnable_at && (
              <p>
                Oldest runnable task was scheduled for{" "}
                <time dateTime={value.oldest_runnable_at}>
                  {new Date(value.oldest_runnable_at).toLocaleString()}
                </time>
                .
              </p>
            )}
            {value.jobs.length ? (
              <ul>
                {value.jobs.map((job) => (
                  <li key={job.id}>
                    {kindLabel(job.kind)} — {failureLabel(job.error_code)}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No failed tasks are waiting.</p>
            )}
            <Link to="/admin/jobs">Inspect and recover background tasks</Link>
          </section>
          <p>
            Payment and payout operations are not enabled. Their reports require
            verified checkout and settlement workflows.
          </p>
        </>
      )}
    </section>
  );
}
