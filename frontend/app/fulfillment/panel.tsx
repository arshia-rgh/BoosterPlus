import Bookings from "./bookings";
import Coordination from "./coordination";
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
function Summary({ work }: { work: Work }) {
  return (
    <>
      <p>
        {work.mode === "account" ? "Play on your account" : "Play together"} ·{" "}
        {work.alias}
      </p>
      <p>
        Status: {work.state} · Progress {work.progress}%
      </p>
      <p>{work.note}</p>
      {work.completion_pending && (
        <p>Completion submitted for administrator review.</p>
      )}
      {work.estimated_start && work.estimated_finish && (
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
}: {
  detail: Detail;
  admin: boolean;
  reload: () => void;
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
      <Action onClick={refresh}>Refresh fulfillment</Action>
      {resource.loading && <p role="status">Refreshing fulfillment…</p>}
      <fieldset disabled={resource.loading}>
        <legend>Fulfillment controls</legend>
        {!missing && <ErrorNotice error={resource.error} />}
        {work ? (
          <>
            <Summary work={work} />
            <Coordination
              work={work}
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
                {work.mode === "account" && (
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
        ) : (
          <p role="status">Loading fulfillment…</p>
        )}
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
      <Action onClick={resource.reload}>Refresh queue</Action>
      <ErrorNotice error={resource.error} />
      {!resource.error && resource.data && (
        <>
          <ul>
            {resource.data.items.map((work) => (
              <li key={work.order_id}>
                <Link to={`/booster/orders/${work.order_id}`}>
                  {work.game} · {work.service}
                </Link>{" "}
                · {work.state} · {work.progress}%
              </li>
            ))}
          </ul>
          {!resource.data.items.length && <p>No assigned work.</p>}
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
  useEffect(() => {
    const timer = window.setInterval(resource.reload, 30000);
    return () => {
      window.clearInterval(timer);
    };
  }, [resource.reload]);
  return (
    <section>
      <Link to="/booster/orders">← Assigned work</Link>
      <Action onClick={resource.reload}>Refresh fulfillment</Action>
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
