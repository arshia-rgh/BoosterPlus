import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "../portal-router";
import { APIError } from "../identity/api";
import { useResource } from "../orders/resource";
import { stateLabel } from "../orders/model";
import { nextAction, orderKind } from "../orders/presentation";
import { Action, ErrorNotice } from "../catalog/controls";
import { overviewSchema } from "./overview-model";
import "./activity.css";

// The root header slot remains mounted for the lifetime of the storefront.
const subscribeHeader = () => () => undefined;
const headerSlot = () => document.getElementById("customer-activity-slot");
const serverSlot = () => null;
export default function ActivityWork() {
  const host = useSyncExternalStore(subscribeHeader, headerSlot, serverSlot);
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header || typeof ResizeObserver === "undefined") return;
    const update = () => {
      document.documentElement.style.setProperty(
        "--activity-header-height",
        `${String(header.getBoundingClientRect().height)}px`,
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(header);
    update();
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--activity-header-height");
    };
  }, []);
  useEffect(() => {
    window.dispatchEvent(new Event("playora:activity-layout"));
    return () => {
      window.dispatchEvent(new Event("playora:activity-layout"));
    };
  }, []);
  const work = useResource("/me/overview", overviewSchema);
  const reload = work.reload;
  const [open, setOpen] = useState(false),
    [mobile, setMobile] = useState(false),
    [offline, setOffline] = useState(false),
    [now, setNow] = useState(() => performance.now());
  const location = useLocation();
  const drawer = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(true);
  const id = useId();
  useEffect(() => {
    const size = window.matchMedia("(max-width: 700px)");
    const update = () => {
      setMobile(size.matches);
      setOpen(false);
    };
    update();
    size.addEventListener("change", update);
    return () => {
      size.removeEventListener("change", update);
    };
  }, []);
  const route = location.pathname + location.search;
  const [previousRoute, setPreviousRoute] = useState(route);
  if (previousRoute !== route) {
    setPreviousRoute(route);
    setOpen(false);
  }
  useEffect(() => {
    restoreFocus.current = false;
  }, [route]);
  useEffect(() => {
    if (!open || mobile) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("keydown", close);
    };
  }, [open, mobile]);
  useEffect(() => {
    const sync = () => {
      setNow(performance.now());
      setOffline(!navigator.onLine);
      if (!document.hidden && navigator.onLine) reload();
    };
    sync();
    const timer = window.setInterval(sync, 30000);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [reload]);
  useEffect(() => {
    const dialog = drawer.current;
    if (mobile && open && dialog && !dialog.open) dialog.showModal();
    if ((!mobile || !open) && dialog?.open) dialog.close();
  }, [mobile, open]);
  const denied =
    work.error instanceof APIError &&
    [401, 403, 404].includes(work.error.status);
  if (denied) return null;
  const stale =
    offline ||
    (work.requestedAt !== undefined && now - work.requestedAt > 60000);
  const rows = work.data
    ? [...work.data.attention, ...work.data.active]
        .filter(
          (value, index, list) =>
            list.findIndex((item) => item.id === value.id) === index,
        )
        .slice(0, 5)
    : [];
  const content = (
    <>
      <div className="activity-heading">
        <div>
          <p className="eyebrow">MY ACCOUNT</p>
          <h2 id={id + "-title"}>Your current orders</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            trigger.current?.focus();
          }}
        >
          Close
        </button>
      </div>
      <ErrorNotice error={work.error} />
      {stale && (
        <p role="status">
          Updates may be out of date. Open the order to verify its latest status
          before acting.
        </p>
      )}
      {work.loading && !work.data && (
        <p role="status">Loading your current work…</p>
      )}
      {!work.loading && !work.data && (
        <p>
          We could not load your current orders. Your order history and support
          are still available.
        </p>
      )}
      {work.data && rows.length === 0 && (
        <p>No active orders. Your completed orders remain in order history.</p>
      )}
      <ul>
        {rows.map((order) => {
          const progress = work.data?.progress.find(
            (item) => item.order_id === order.id,
          );
          return (
            <li key={order.id}>
              <Link
                to={`/orders/${order.id}`}
                aria-label={`View order ${order.id} · ${order.game_name}`}
              >
                <strong>{order.game_name}</strong>
                <span>
                  {orderKind(order.kind)} · {stateLabel(order.state)}
                </span>
                <small>Order {order.id.slice(0, 8)}</small>
              </Link>
              <p>{nextAction(order)}</p>
              {progress && (
                <>
                  <label>
                    Staff-reported progress{" "}
                    <progress value={progress.reported_percent} max={100} />
                  </label>
                  <span>{progress.reported_percent}% reported complete</span>
                </>
              )}
              <small>
                Order updated{" "}
                <time dateTime={order.updated_at}>
                  {new Date(order.updated_at).toLocaleString()}
                </time>
              </small>
              {progress && (
                <small>
                  Progress reported{" "}
                  <time dateTime={progress.updated_at}>
                    {new Date(progress.updated_at).toLocaleString()}
                  </time>
                </small>
              )}
            </li>
          );
        })}
      </ul>
      {work.data &&
        (work.data.more_active ||
          work.data.more_attention ||
          work.data.attention.length + work.data.active.length > 5) && (
          <p>Showing five recent orders. Open order history for all orders.</p>
        )}
      <div className="activity-actions">
        <Action disabled={work.loading} onClick={reload}>
          {work.loading ? "Checking updates…" : "Refresh orders"}
        </Action>
        <Link to="/orders">Order history</Link>
        <Link className="button" to="/support">
          Chat with support
        </Link>
      </div>
    </>
  );
  const panel = (
    <aside className="customer-activity" aria-label="Your orders and support">
      <button
        ref={trigger}
        className="activity-trigger"
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup={mobile ? "dialog" : undefined}
        onClick={() => {
          restoreFocus.current = true;
          setOpen((value) => !value);
        }}
      >
        Orders & support
        {rows.length > 0 && (
          <span aria-hidden="true">
            {" "}
            · {rows.length}
            {work.data &&
            (work.data.more_active ||
              work.data.more_attention ||
              work.data.attention.length + work.data.active.length >
                rows.length)
              ? "+"
              : ""}
          </span>
        )}
      </button>
      {mobile ? (
        <dialog
          id={id}
          ref={drawer}
          className="activity-sheet"
          aria-labelledby={id + "-title"}
          onClickCapture={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest("a[href]")
            ) {
              restoreFocus.current = false;
              drawer.current?.close();
              setOpen(false);
            }
          }}
          onClose={() => {
            setOpen(false);
            if (restoreFocus.current) trigger.current?.focus();
          }}
        >
          {content}
        </dialog>
      ) : open ? (
        <section
          id={id}
          className="activity-popover"
          aria-labelledby={id + "-title"}
        >
          {content}
        </section>
      ) : (
        <div id={id} hidden />
      )}
    </aside>
  );
  return host ? createPortal(panel, host) : panel;
}
