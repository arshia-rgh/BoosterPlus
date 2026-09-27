import "../ui/secondary.css";
import { workNextStep, customerWorkNextStep } from "./work-presentation";
import Bookings from "./bookings";
import Coordination from "./coordination";
import ForecastControls, { ForecastRange } from "./forecast";
import { useEffect } from "react";
import { Link, useParams } from "react-router";
import { Action, ErrorNotice } from "../catalog/controls";
import { APIError } from "../identity/api";
import type { Detail } from "../orders/model";
import { useResource } from "../orders/resource";
import { Assignment, ExecutionActions } from "./actions";
import Handoff from "./handoff";
import { active, listingSchema, workSchema, type Work } from "./model";
import { CustomerSecret, StaffSecret } from "./secrets";
import { useState } from "react";
function Summary({ work, staff = true }: { work: Work; staff?: boolean }) {
  return (
    <>
      <p>
        {work.mode === "account" ? "Play on your account" : "Play together"} ·{" "}
        {work.alias}
      </p>
      <p>
        Status: {work.state.replaceAll("_", " ")} · Progress {work.progress}%
      </p>
      <progress
        className="work-progress"
        value={work.progress}
        max={100}
        aria-label="Reported fulfillment progress"
      />
      <p className="work-next-step">
        {staff ? workNextStep(work) : customerWorkNextStep(work)}
      </p>
      <p className="preserve-lines">{work.note}</p>
      {work.completion_pending && (
        <p>Completion submitted for administrator review.</p>
      )}
      {work.forecast && (
        <>
          <ForecastRange forecast={work.forecast} />
          {work.forecast_review && (
            <p role="status">
              Delivery forecast needs review: execution or assigned capacity
              changed. The previous range is retained for reference.
            </p>
          )}
        </>
      )}
      {!work.forecast && work.estimated_start && work.estimated_finish && (
        <p>
          Current delivery estimate:{" "}
          {new Date(work.estimated_start).toLocaleString()} –{" "}
          {new Date(work.estimated_finish).toLocaleString()}. This does not
          change the accepted agreement.
        </p>
      )}
      <details>
        <summary>Information shared with assigned staff</summary>
        <dl>
          {work.shared.map((field) => (
            <div key={field.key}>
              <dt>{field.label}</dt>
              <dd>
                {Array.isArray(field.value)
                  ? field.value.join(", ")
                  : String(field.value)}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </>
  );
}
export default function FulfillmentPanel({
  detail,
  admin,
  reload,
  visible = true,
  localCoordination = false,
}: {
  detail: Detail;
  admin: boolean;
  reload: () => void;
  visible?: boolean;
  localCoordination?: boolean;
}) {
  const resource = useResource(
      `${admin ? "/admin" : ""}/fulfillment/${detail.order.id}`,
      workSchema,
    ),
    work = resource.error ? null : resource.data,
    missing =
      resource.error instanceof APIError && resource.error.code === "not_found";
  const refresh = () => {
    resource.reload();
    reload();
  };
  return (
    <section className="catalog-section">
      <h2>Fulfillment</h2>
      <Action disabled={resource.loading} onClick={refresh}>
        Refresh fulfillment
      </Action>
      {resource.loading && <p role="status">Refreshing fulfillment…</p>}
      <fieldset disabled={resource.loading}>
        <legend>Fulfillment controls</legend>
        {!missing && <ErrorNotice error={resource.error} />}
        {work ? (
          <>
            <Summary work={work} staff={admin} />
            <Coordination
              work={work}
              local={localCoordination}
              audience={admin ? "admin" : "account"}
              reload={refresh}
            />
            {work.mode === "together" && (
              <Bookings
                work={work}
                audience={admin ? "admin" : "account"}
                reload={refresh}
              />
            )}
            {admin ? (
              <>
                {active(work) && (
                  <ForecastControls
                    key={`forecast-${String(work.version)}`}
                    work={work}
                    reload={refresh}
                  />
                )}
                <StaffSecret
                  key={`secret-${String(work.access_version)}`}
                  work={work}
                  admin
                />
                {active(work) && (
                  <Assignment
                    key={`assignment-${String(work.version)}`}
                    id={work.order_id}
                    orderVersion={work.order_version}
                    work={work}
                    reload={refresh}
                  />
                )}
                <ExecutionActions
                  key={`actions-${String(work.version)}`}
                  work={work}
                  admin
                  reload={refresh}
                />
              </>
            ) : (
              <>
                {active(work) && (
                  <Handoff
                    key={`handoff-${String(work.version)}`}
                    detail={detail}
                    work={work}
                    reload={refresh}
                  />
                )}{" "}
                {visible && work.mode === "account" && (
                  <CustomerSecret
                    key={`secret-${String(work.access_version)}`}
                    work={work}
                  />
                )}
              </>
            )}
          </>
        ) : missing ? (
          <>
            {admin ? (
              <Assignment
                id={detail.order.id}
                orderVersion={detail.order.version}
                work={null}
                reload={refresh}
              />
            ) : (
              <p>Waiting for staff assignment.</p>
            )}
          </>
        ) : resource.loading ? (
          <p role="status">Loading fulfillment…</p>
        ) : null}
      </fieldset>
    </section>
  );
}
export function BoosterQueue() {
  const [after, setAfter] = useState(""),
    resource = useResource(
      `/booster/fulfillment?after=${encodeURIComponent(after)}`,
      listingSchema,
    );
  return (
    <section>
      <h2>Your assigned orders</h2>
      <p>
        Only work currently assigned to you appears here. Open an order for its
        shared instructions, coordination, schedule and permitted actions.
      </p>
      <Link className="button" to="/booster/calendar">
        Plan your availability
      </Link>
      <Action disabled={resource.loading} onClick={resource.reload}>
        Refresh queue
      </Action>
      {resource.loading && <p role="status">Loading assigned work…</p>}
      <ErrorNotice error={resource.error} />
      {!resource.error && resource.data && (
        <>
          <p className="quiet">
            {resource.data.items.length} assignments in this page. Progress is
            reported by staff; it is not live game telemetry.
          </p>
          <ul className="booster-queue">
            {resource.data.items.map((work) => (
              <li key={work.order_id} className="booster-work-card">
                <Link to={`/booster/orders/${work.order_id}`}>
                  {work.game} · {work.service}
                </Link>{" "}
                <span className="status">
                  {work.completion_pending
                    ? "Awaiting completion review"
                    : work.state.replaceAll("_", " ")}
                </span>
                <p className="quiet">
                  {work.mode === "together"
                    ? "Play together"
                    : "Play on account"}
                </p>
                <p>{workNextStep(work)}</p>
                <progress
                  className="work-progress"
                  value={work.progress}
                  max={100}
                  aria-label={`${work.game} reported progress`}
                />
                <p>Reported progress: {work.progress}%</p>
                <time dateTime={work.updated_at}>
                  Updated {new Date(work.updated_at).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
          {!resource.data.items.length && (
            <p>
              No assigned work. Keep your calendar current; new assignments will
              appear here after the team assigns them to you.
            </p>
          )}
          {resource.data.next && (
            <Action
              onClick={() => {
                setAfter(resource.data?.next ?? "");
              }}
            >
              Older work
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
          Newest work
        </Action>
      )}
    </section>
  );
}
export function BoosterOrder() {
  const { id = "" } = useParams(),
    resource = useResource(
      `/booster/fulfillment/${encodeURIComponent(id)}`,
      workSchema,
    ),
    work = resource.error ? null : resource.data;
  const reload = resource.reload;
  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) reload();
    };
    const timer = window.setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [reload]);
  return (
    <section>
      <Link to="/booster/orders">← Assigned work</Link>
      <Action disabled={resource.loading} onClick={resource.reload}>
        Refresh fulfillment
      </Action>
      {resource.loading && <p role="status">Checking assigned work…</p>}
      <ErrorNotice error={resource.error} />
      {work && (
        <fieldset disabled={resource.loading}>
          <legend>Assigned work controls</legend>
          <h2>
            {work.game} · {work.service}
          </h2>
          <Summary work={work} />
          <Coordination
            work={work}
            audience="booster"
            reload={resource.reload}
          />
          {work.mode === "together" && (
            <Bookings work={work} audience="booster" reload={resource.reload} />
          )}
          <StaffSecret
            key={`secret-${String(work.access_version)}`}
            work={work}
            admin={false}
          />
          <ExecutionActions
            key={`actions-${String(work.version)}`}
            work={work}
            admin={false}
            reload={resource.reload}
          />
        </fieldset>
      )}
    </section>
  );
}
