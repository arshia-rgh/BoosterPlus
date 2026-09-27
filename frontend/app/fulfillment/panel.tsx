import "../ui/secondary.css";
import { WorkSummary } from "./work-summary";
import Bookings from "./bookings";
import Coordination from "./coordination";
import ForecastControls from "./forecast";
import { Action, ErrorNotice } from "../catalog/controls";
import { APIError } from "../identity/api";
import type { Detail } from "../orders/model";
import { useResource } from "../orders/resource";
import { Assignment, ExecutionActions } from "./actions";
import Handoff from "./handoff";
import { active, workSchema } from "./model";
import { CustomerSecret, StaffSecret } from "./secrets";
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
            <WorkSummary work={work} staff={admin} />
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
                  <ForecastControls work={work} reload={refresh} />
                )}
                {visible && !resource.loading && (
                  <StaffSecret
                    key={`secret-${String(work.access_version)}`}
                    work={work}
                    admin
                  />
                )}
                {active(work) && (
                  <Assignment
                    id={work.order_id}
                    orderVersion={work.order_version}
                    work={work}
                    reload={refresh}
                  />
                )}
                <ExecutionActions work={work} admin reload={refresh} />
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
export { BoosterQueue, BoosterOrder } from "./booster-workspace";
