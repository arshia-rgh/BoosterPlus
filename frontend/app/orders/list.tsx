import { orderDestination } from "./presentation";
import { activePortal, sessionEventMatches } from "../identity/portal";
import {
  useContext,
  useEffect,
  useRef,
  useState,
  type SubmitEvent,
} from "react";
import { Link, useSearchParams } from "react-router";
import { ErrorNotice, Select, Text, Action } from "../catalog/controls";
import { listingSchema, states, stateLabel } from "./model";
import { minorDisplay } from "../catalog/dynamic-form";
import { nextAction, orderKind } from "./presentation";
import "./order-workspace.css";
import "./admin-workspace.css";
import { AuthorizedIdentity } from "../identity/frame";
import { useResource } from "./resource";
// Only order IDs and filters, never form bodies. Clear at every identity boundary.
const listAnchors = new Map<string, string>();
let listEpoch = 0;
if (typeof window !== "undefined")
  window.addEventListener("boosterplus:session-changed", (event) => {
    if (!sessionEventMatches(event, activePortal())) return;
    listEpoch++;
    listAnchors.clear();
  });
function OrderListView({ admin = false }: { admin?: boolean }) {
  const [params, setParams] = useSearchParams(),
    [search, setSearch] = useState(params.get("search") ?? ""),
    [state, setState] = useState(params.get("state") ?? ""),
    [advanced, setAdvanced] = useState(
      Object.fromEntries(
        ["game", "kind", "customer", "assigned", "from", "to"].map((key) => [
          key,
          params.get(key) ?? "",
        ]),
      ),
    );
  const appliedFilters = JSON.stringify([
    params.get("search"),
    params.get("state"),
    ...["game", "kind", "customer", "assigned", "from", "to"].map((key) =>
      params.get(key),
    ),
  ]);
  const [previousFilters, setPreviousFilters] = useState(appliedFilters);
  if (previousFilters !== appliedFilters) {
    setPreviousFilters(appliedFilters);
    setSearch(params.get("search") ?? "");
    setState(params.get("state") ?? "");
    setAdvanced(
      Object.fromEntries(
        ["game", "kind", "customer", "assigned", "from", "to"].map((key) => [
          key,
          params.get(key) ?? "",
        ]),
      ),
    );
  }
  const base = admin ? "/admin/orders" : "/orders",
    query = new URLSearchParams({
      after: params.get("after") ?? "",
      state: params.get("state") ?? "",
      search: params.get("search") ?? "",
      ...(admin
        ? Object.fromEntries(
            ["game", "kind", "customer", "assigned", "from", "to"].map(
              (key) => [key, params.get(key) ?? ""],
            ),
          )
        : {}),
    });
  const resource = useResource(base + "?" + query.toString(), listingSchema);
  const identity = useContext(AuthorizedIdentity);
  const cacheKey =
    activePortal() +
    ":" +
    (identity?.session.user?.id ?? "isolated-view") +
    ":" +
    base +
    "?" +
    params.toString();
  const anchor = useRef("");
  useEffect(() => {
    const remembered = listAnchors.get(cacheKey);
    if (resource.data && remembered)
      document
        .querySelector<HTMLElement>(
          `[data-order-id="${CSS.escape(remembered)}"]`,
        )
        ?.scrollIntoView({ block: "nearest" });
  }, [cacheKey, resource.data]);
  useEffect(() => {
    const key = cacheKey;
    const epoch = listEpoch;
    const reference = anchor;
    return () => {
      if (reference.current && epoch === listEpoch) {
        listAnchors.set(key, reference.current);
        if (listAnchors.size > 20) {
          const oldest = listAnchors.keys().next().value;
          if (oldest) listAnchors.delete(oldest);
        }
      }
    };
  }, [cacheKey]);
  function filter(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setParams({ state, search, ...(admin ? advanced : {}) });
  }
  return (
    <section className="orders-workspace-list">
      {admin && <h2>Requests and active work</h2>}
      {!admin && (
        <>
          <p>
            Review requests, follow your progress, and keep in touch with your
            team.
          </p>
        </>
      )}
      <form
        onSubmit={filter}
        className={admin ? "catalog-grid order-filters" : "orders-filters"}
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
        {admin && (
          <details
            className="order-advanced-filters"
            key={appliedFilters}
            open={
              Object.keys(advanced).some((key) => params.get(key)) || undefined
            }
          >
            <summary>More filters</summary>
            <div className="catalog-grid">
              <Text
                label="Game slug"
                value={advanced.game ?? ""}
                change={(v) => {
                  setAdvanced({ ...advanced, game: v });
                }}
              />
              <Select
                label="Order type"
                value={advanced.kind ?? ""}
                change={(v) => {
                  setAdvanced({ ...advanced, kind: v });
                }}
                options={[
                  ["", "All types"],
                  ["custom", "Custom boost"],
                  ["package", "Fixed pack"],
                  ["account", "Account purchase"],
                  ["shop", "Shop purchase"],
                ]}
              />
              <Text
                label="Customer ID"
                value={advanced.customer ?? ""}
                change={(v) => {
                  setAdvanced({ ...advanced, customer: v });
                }}
              />
              <Text
                label="Assignee ID or unassigned"
                value={advanced.assigned ?? ""}
                change={(v) => {
                  setAdvanced({ ...advanced, assigned: v });
                }}
              />
              <label>
                Created from (UTC, inclusive)
                <input
                  type="date"
                  value={advanced.from ?? ""}
                  onChange={(event) => {
                    setAdvanced({ ...advanced, from: event.target.value });
                  }}
                />
              </label>
              <label>
                Created until (UTC, exclusive)
                <input
                  type="date"
                  value={advanced.to ?? ""}
                  onChange={(event) => {
                    setAdvanced({ ...advanced, to: event.target.value });
                  }}
                />
              </label>
            </div>
          </details>
        )}
        <button className="button" type="submit">
          Filter orders
        </button>
      </form>
      <div className="order-toolbar">
        <Action onClick={resource.reload}>Refresh orders</Action>
        {!!params.toString() && (
          <Action
            onClick={() => {
              setParams({});
            }}
          >
            Clear order filters
          </Action>
        )}
      </div>
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
              {admin
                ? "No orders match the current queue filters. "
                : query.get("search") || query.get("state")
                  ? "No orders match these filters. "
                  : "No orders yet. Your requests and purchases will appear here. "}
              {admin ? (
                "Adjust or clear the filters to continue."
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
                    <th scope="col">Customer / assignment / payment</th>
                    <th scope="col">Next action</th>
                    <th scope="col">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.orders.map((order) => (
                    <tr key={order.id} data-order-id={order.id}>
                      <td data-label="Game / order">
                        <Link
                          to={`${base}/${order.id}`}
                          state={{ orderListSearch: params.toString() }}
                          onClick={() => {
                            anchor.current = order.id;
                          }}
                        >
                          <strong>{order.game_name}</strong>
                          <small>Order {order.id}</small>
                        </Link>
                      </td>
                      <td data-label="Service">{orderKind(order.kind)}</td>
                      <td data-label="Status">
                        <span className="status">
                          {stateLabel(order.state)}
                        </span>
                      </td>
                      <td data-label="Customer / assignment / payment">
                        <div className="order-triage-summary">
                          {order.staff ? (
                            <>
                              <span>
                                Customer {order.staff.customer_id.slice(0, 8)}
                              </span>
                              <span>
                                {order.staff.assigned_id
                                  ? `Assignee ${order.staff.assigned_id.slice(0, 8)}`
                                  : "Unassigned"}
                              </span>
                              <span>
                                Payment: {stateLabel(order.staff.payment_state)}
                              </span>
                            </>
                          ) : (
                            <span>
                              Queue context unavailable — review the record
                            </span>
                          )}
                        </div>
                      </td>
                      <td data-label="Next action">
                        <Link
                          to={`${base}/${order.id}?section=${staffAction(order.state).section}`}
                          state={{ orderListSearch: params.toString() }}
                          onClick={() => {
                            anchor.current = order.id;
                          }}
                        >
                          {staffAction(order.state).label}
                        </Link>
                      </td>
                      <td data-label="Updated">
                        <time dateTime={order.updated_at}>
                          {new Date(order.updated_at).toLocaleString()}
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
                  <li key={order.id} data-order-id={order.id}>
                    <Link
                      to={orderDestination(order)}
                      aria-label={`View order ${order.id} · ${order.game_name} · ${stateLabel(order.state)}`}
                      state={{ orderListSearch: params.toString() }}
                      onClick={() => {
                        anchor.current = order.id;
                      }}
                    >
                      <strong>{order.game_name}</strong>
                      <span>
                        {orderKind(order.kind)} · {stateLabel(order.state)}
                      </span>
                      <span className="order-next-label">
                        {nextAction(order)}
                      </span>
                      {order.accepted_price && (
                        <span className="order-list-price">
                          Accepted total · {order.accepted_price.currency}{" "}
                          {minorDisplay(order.accepted_price.amount_minor)}
                        </span>
                      )}
                      {order.unread && (
                        <span className="order-unread">Unread messages</span>
                      )}
                      <small>Reference {order.id.slice(0, 8)}</small>
                    </Link>
                    <time dateTime={order.updated_at}>
                      Updated {new Date(order.updated_at).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
            </>
          )}
          {params.get("after") && (
            <Link
              to={`${base}?${new URLSearchParams({ ...Object.fromEntries(query), after: "" }).toString()}`}
            >
              Newest orders
            </Link>
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

export default function OrderList({ admin = false }: { admin?: boolean }) {
  const [params] = useSearchParams();
  return (
    <OrderListView
      key={(admin ? "admin:" : "customer:") + params.toString()}
      admin={admin}
    />
  );
}

function staffAction(state: string) {
  if (state === "submitted")
    return { section: "request", label: "Review request" };
  if (state === "needs_information")
    return { section: "messages", label: "Review clarification" };
  if (state === "quoted") return { section: "quote", label: "Review quote" };
  if (state === "awaiting_payment")
    return { section: "payment", label: "Check payment" };
  if (["queued", "in_progress", "on_hold"].includes(state))
    return { section: "fulfillment", label: "Review fulfillment" };
  return { section: "history", label: "Review history" };
}
