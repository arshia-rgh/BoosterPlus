import { orderDestination, type OrderSummary } from "../orders/presentation";
import { Link } from "react-router";
import { useResource } from "../orders/resource";
import { overviewSchema } from "./overview-model";
export { overviewSchema } from "./overview-model";
import { ErrorNotice } from "../catalog/controls";
import { timeLabel } from "../fulfillment/calendar-model";
import "./account.css";

const nextStep: Record<string, string> = {
  needs_information: "Add the requested information",
  quoted: "Review your quote",
  awaiting_payment: "Open checkout",
  submitted: "Waiting for our review",
  queued: "Your order is queued",
  in_progress: "Work is in progress",
  on_hold: "Review the latest update",
};
function Orders({ items }: { items: OrderSummary[] }) {
  return (
    <ul className="account-work-list">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            to={orderDestination(item)}
            aria-label={`View order ${item.id} · ${item.game_name} · ${nextStep[item.state] ?? "View order"}`}
          >
            <span>
              <strong>{item.game_name}</strong>
              <small>
                {item.kind === "account"
                  ? "Account purchase"
                  : item.kind === "package"
                    ? "Fixed package"
                    : "Custom boost"}
              </small>
            </span>
            <span className="account-next">
              {nextStep[item.state] ?? "View order"}
              <span aria-hidden="true"> ↗</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
export default function AccountOverview() {
  const work = useResource("/me/overview", overviewSchema);
  const empty =
    work.data &&
    !work.data.attention.length &&
    !work.data.active.length &&
    !work.data.upcoming.length;
  return (
    <div className="account-overview">
      <div className="account-intro">
        <p>Your next step, in one place.</p>
        <button
          className="account-text-action"
          onClick={() => {
            work.reload();
          }}
        >
          Refresh overview
        </button>
      </div>
      <ErrorNotice error={work.error} />
      {!work.data && (
        <p role="status">
          {work.loading
            ? "Loading your work…"
            : "Your work is unavailable. Refresh overview to try again."}
        </p>
      )}
      {empty && (
        <section className="account-empty">
          <span aria-hidden="true" className="account-empty-mark">
            ↗
          </span>
          <h2>Ready for your next climb?</h2>
          <p>
            Choose a boost or explore accounts. Your active orders and sessions
            will appear here.
          </p>
          <Link className="button" to="/games">
            Explore boosting
          </Link>
          <Link to="/orders">View order history</Link>
        </section>
      )}
      {!!work.data?.attention.length && (
        <section className="account-panel attention-panel">
          <p className="eyebrow">YOUR NEXT STEP</p>
          <h2>Needs your attention</h2>
          <Orders items={work.data.attention} />
          {work.data.more_attention && (
            <p>
              Showing five recent requests.{" "}
              <Link to="/orders">View all orders</Link>
            </p>
          )}
        </section>
      )}
      {!!work.data?.active.length && (
        <section className="account-panel">
          <div className="account-panel-heading">
            <h2>Active work</h2>
            <Link to="/orders">All orders ↗</Link>
          </div>
          <Orders items={work.data.active} />
          {work.data.more_active && (
            <p>More active orders are available in your order list.</p>
          )}
        </section>
      )}
      <div className="account-overview-columns">
        <section className="account-panel">
          <div className="account-panel-heading">
            <h2>Messages</h2>
            <Link to="/support">Open inbox ↗</Link>
          </div>
          {!work.data ? (
            <p role="status">
              {work.loading
                ? "Loading conversations…"
                : "Messages are unavailable. Refresh overview to try again."}
            </p>
          ) : !work.data.messages.length ? (
            <p>You’re caught up. Open your inbox whenever you need help.</p>
          ) : (
            <>
              <p className="quiet">Unread conversations</p>
              <ul className="account-work-list">
                {work.data.messages.map((thread) => (
                  <li key={thread.id}>
                    <Link to={`/support/${thread.id}`}>
                      <span>
                        <strong>{thread.subject}</strong>
                        <small>
                          {thread.unread
                            ? `${String(thread.unread)} unread`
                            : "Up to date"}
                        </small>
                      </span>
                      <span aria-hidden="true">↗</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {work.data.more_messages && (
                <p>More unread conversations are available in your inbox.</p>
              )}
            </>
          )}
        </section>
        {!!work.data?.upcoming.length && (
          <section className="account-panel">
            <h2>Upcoming sessions</h2>
            <ul className="account-work-list">
              {work.data.upcoming.map((item) => (
                <li key={item.id}>
                  <Link to={`/orders/${item.order_id}?section=progress`}>
                    <span>
                      <strong>
                        {item.state === "confirmed"
                          ? "Confirmed session"
                          : "Proposed · awaiting confirmation"}
                      </strong>
                      <small>{timeLabel(item.starts_at, item.timezone)}</small>
                    </span>
                    <span aria-hidden="true">↗</span>
                  </Link>
                </li>
              ))}
            </ul>
            {work.data.more_upcoming && (
              <p>
                Showing the next five sessions. Open your orders for later
                bookings.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
