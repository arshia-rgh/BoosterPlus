import { Link, useSearchParams } from "../portal-router";
import { TableRegion } from "../ui/primitives";
import "./shop.css";
import { Action, ErrorNotice, Select, Text } from "../catalog/controls";
import { useState } from "react";
import { listingSchema, stateLabel } from "../orders/model";
import { useResource } from "../orders/resource";
import { minorDisplay } from "../catalog/dynamic-form";
import "../orders/admin-workspace.css";
export default function ShopQueue() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [filter, setFilter] = useState(params.get("queue") ?? "");
  const appliedParams = params.toString();
  const [priorParams, setPriorParams] = useState(appliedParams);
  if (priorParams !== appliedParams) {
    setPriorParams(appliedParams);
    setSearch(params.get("search") ?? "");
    setFilter(params.get("queue") ?? "");
  }
  const query = new URLSearchParams({
    kind: "shop",
    search: params.get("search") ?? "",
    after: params.get("after") ?? "",
  });
  const applied = params.get("queue") ?? "";
  if (["processing", "held", "submitted", "completed"].includes(applied))
    query.set("delivery", applied);
  if (applied === "ready") {
    query.set("state", "queued");
    query.set("assigned", "unassigned");
  }
  if (applied === "cancelled") query.set("state", "cancelled");
  if (applied === "unpaid") query.set("state", "awaiting_payment");
  const resource = useResource(
    `/admin/orders?${query.toString()}`,
    listingSchema,
  );
  return (
    <section className="admin-order-list shop-delivery-queue">
      <p className="eyebrow">Manual fulfillment</p>
      <p>
        Unpaid orders are visible for support. Delivery starts only after
        verified payment and an explicit staff claim.
      </p>
      <Link to="/admin/shop">Product catalog</Link>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setParams({ search, queue: filter });
        }}
      >
        <Text
          label="Find game or order reference"
          value={search}
          change={setSearch}
        />
        <Select
          label="Delivery queue"
          value={filter}
          change={setFilter}
          options={[
            ["", "All shop orders"],
            ["ready", "Ready to claim"],
            ["processing", "Claimed / processing"],
            ["held", "Held"],
            ["submitted", "Awaiting delivery review"],
            ["completed", "Completed"],
            ["cancelled", "Cancelled"],
            ["unpaid", "Unpaid / payment support"],
          ]}
        />
        <button className="button" type="submit">
          Apply queue filters
        </button>
      </form>
      <ErrorNotice error={resource.error} />
      <Action onClick={resource.reload}>Refresh queue</Action>
      {resource.loading ? (
        <p role="status">Loading shop orders…</p>
      ) : (
        resource.data && (
          <>
            {!resource.data.orders.length ? (
              <p>No orders match this queue.</p>
            ) : (
              <TableRegion label="Shop delivery queue">
                <table>
                  <caption>
                    Shop orders · {resource.data.orders.length} on this page
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Order</th>
                      <th scope="col">Status</th>
                      <th scope="col">Delivery</th>
                      <th scope="col">Updated</th>
                      <th scope="col">Payment</th>
                      <th scope="col">Assignment</th>
                      <th scope="col">Next step</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resource.data.orders.map((row) => (
                      <tr key={row.id}>
                        <th scope="row">
                          {row.game_name}
                          <br />
                          <small title={row.id}>
                            Order {row.id.slice(0, 8)}
                          </small>
                        </th>
                        <td>{stateLabel(row.state)}</td>
                        <td>
                          {row.staff?.delivery_state?.replaceAll("_", " ") ??
                            "Not claimed"}
                        </td>
                        <td>
                          <time dateTime={row.updated_at}>
                            {new Date(row.updated_at).toLocaleString()}
                          </time>
                        </td>
                        <td>
                          {row.staff?.payment_state.replaceAll("_", " ")}
                          {row.accepted_price && (
                            <p>
                              {row.accepted_price.currency}{" "}
                              {minorDisplay(row.accepted_price.amount_minor)}
                            </p>
                          )}
                        </td>
                        <td>
                          {row.staff?.assigned_id
                            ? `Staff ${row.staff.assigned_id.slice(0, 8)}`
                            : "Unclaimed"}
                        </td>
                        <td>
                          <Link
                            className="button"
                            to={`/admin/orders/${row.id}?section=${row.state === "awaiting_payment" ? "payment" : "fulfillment"}`}
                            state={{
                              orderListSearch: query.toString(),
                              shopQueueSearch: params.toString(),
                            }}
                          >
                            Review shop order {row.id.slice(0, 8)}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableRegion>
            )}
            {resource.data.next && (
              <Link
                className="button"
                to={{
                  search:
                    "?" +
                    new URLSearchParams({
                      ...Object.fromEntries(params),
                      after: resource.data.next,
                    }).toString(),
                }}
              >
                Next orders
              </Link>
            )}
          </>
        )
      )}
    </section>
  );
}
