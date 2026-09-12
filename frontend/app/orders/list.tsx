import { useState, type SubmitEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { ErrorNotice, Select, Text, Action } from "../catalog/controls";
import { listingSchema, states, stateLabel } from "./model";
import { useResource } from "./resource";
export default function OrderList({ admin = false }: { admin?: boolean }) {
  const [params, setParams] = useSearchParams(),
    [search, setSearch] = useState(params.get("search") ?? ""),
    [state, setState] = useState(params.get("state") ?? "");
  const base = admin ? "/admin/orders" : "/orders",
    query = new URLSearchParams({
      after: params.get("after") ?? "",
      state: params.get("state") ?? "",
      search: params.get("search") ?? "",
    });
  const resource = useResource(base + "?" + query.toString(), listingSchema);
  function filter(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setParams({ state, search });
  }
  return (
    <section>
      <h2>{admin ? "Requests and active work" : "Your orders"}</h2>
      {!admin && (
        <>
          <p>
            Review requests, follow your progress, and keep in touch with your
            team.
          </p>
          {resource.data && (
            <section aria-label="Orders on this page">
              <div className="account-summary">
                <div>
                  <strong>
                    {
                      resource.data.orders.filter((order) =>
                        ["needs_information", "quoted"].includes(order.state),
                      ).length
                    }
                  </strong>
                  <span>Need your review</span>
                </div>
                <div>
                  <strong>
                    {
                      resource.data.orders.filter((order) =>
                        ["queued", "in_progress", "on_hold"].includes(
                          order.state,
                        ),
                      ).length
                    }
                  </strong>
                  <span>In fulfillment</span>
                </div>
                <div>
                  <strong>
                    {
                      resource.data.orders.filter(
                        (order) => order.state === "completed",
                      ).length
                    }
                  </strong>
                  <span>Completed</span>
                </div>
              </div>
              <p className="quiet">
                Counts reflect this page and its current filters.
              </p>
            </section>
          )}
        </>
      )}
      <form
        onSubmit={filter}
        className={admin ? "catalog-grid order-filters" : "catalog-grid"}
      >
        <Text
          label="Search game or full order ID"
          value={search}
          change={setSearch}
        />
        <Select
          label="Order status"
          value={state}
          change={setState}
          options={[
            ["", "All statuses"],
            ...states.map((v) => [v, stateLabel(v)] as const),
          ]}
        />
        <button className="button" type="submit">
          Filter orders
        </button>
      </form>
      <Action onClick={resource.reload}>Refresh orders</Action>
      <ErrorNotice error={resource.error} />
      {!resource.data ? (
        <p role="status">
          {resource.loading
            ? "Loading orders…"
            : "Orders could not be loaded. Use Refresh orders to try again."}
        </p>
      ) : (
        <>
          {resource.data.orders.length === 0 && (
            <p>
              No matching orders.{" "}
              {admin ? (
                "Try a different search or status."
              ) : (
                <Link to="/games">Explore games</Link>
              )}
            </p>
          )}
          {admin ? (
            <div className="admin-order-table-wrap">
              <table className="admin-order-table">
                <caption className="sr-only">
                  Orders matching the current filters
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Game / order</th>
                    <th scope="col">Service</th>
                    <th scope="col">Status</th>
                    <th scope="col">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link to={`${base}/${order.id}`}>
                          <strong>{order.game_name}</strong>
                          <small>Order {order.id}</small>
                        </Link>
                      </td>
                      <td>
                        {order.kind === "package"
                          ? "Fixed package"
                          : "Custom request"}
                      </td>
                      <td>
                        <span className="status">
                          {stateLabel(order.state)}
                        </span>
                      </td>
                      <td>
                        <time dateTime={order.created_at}>
                          {new Date(order.created_at).toLocaleString()}
                        </time>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              <ul className="order-list">
                {resource.data.orders.map((order) => (
                  <li key={order.id}>
                    <Link to={`${base}/${order.id}`}>
                      <strong>{order.game_name}</strong>
                      <span>
                        {order.kind === "package"
                          ? "Fixed package"
                          : "Custom request"}{" "}
                        · {stateLabel(order.state)}
                      </span>
                      <small>Order {order.id}</small>
                    </Link>
                    <time dateTime={order.created_at}>
                      {new Date(order.created_at).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
            </>
          )}
          {resource.data.next && (
            <Link
              to={`${base}?${new URLSearchParams({ ...Object.fromEntries(query), after: resource.data.next }).toString()}`}
            >
              Next orders
            </Link>
          )}
        </>
      )}
    </section>
  );
}
