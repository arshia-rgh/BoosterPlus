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
      <h2>{admin ? "Order queue" : "Your orders"}</h2>
      <form onSubmit={filter} className="catalog-grid">
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
        <p role="status">Loading orders…</p>
      ) : (
        <>
          {resource.data.orders.length === 0 && (
            <p>
              No matching orders. <Link to="/games">Explore games</Link>.
            </p>
          )}
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
