import AdminOrderWorkspace from "./admin-workspace";
import { useCallback, useEffect, useState } from "react";
import { z } from "../validation";
import { Link, useLocation, useParams } from "react-router";
import { Action, ErrorNotice } from "../catalog/controls";
import { sessionEventMatches, activePortal } from "../identity/portal";
import { denied } from "../support/chat-state";
import { sessionSchema, type Session } from "../identity/api";
import { detailSchema, type Detail } from "./model";
import { useResource } from "./resource";
import CustomerWorkspace from "./customer-workspace";
import "./order-workspace.css";
function OrderSession() {
  const { id = "" } = useParams(),
    base = "/orders/" + encodeURIComponent(id),
    resource = useResource(base, detailSchema),
    session = useResource("/auth/session", sessionSchema);
  const location = useLocation();
  const source = z
    .object({ orderListSearch: z.string().max(2048) })
    .safeParse(location.state);
  const back =
    "/orders" +
    (source.success
      ? "?" + new URLSearchParams(source.data.orderListSearch).toString()
      : "");
  const [interrupted, setInterrupted] = useState(false);
  useEffect(() => {
    const changed = (event: Event) => {
      if (sessionEventMatches(event, activePortal())) setInterrupted(true);
    };
    window.addEventListener("boosterplus:session-changed", changed);
    return () => {
      window.removeEventListener("boosterplus:session-changed", changed);
    };
  }, []);
  const reloadOrder = resource.reload,
    reloadSession = session.reload;
  const reload = useCallback(() => {
    setInterrupted(false);
    reloadOrder();
    reloadSession();
  }, [reloadOrder, reloadSession]);
  const [saved, setSaved] = useState<{
    detail: Detail;
    session: Session;
  } | null>(null);
  const detail =
    resource.error ||
    session.error ||
    !session.data ||
    (!saved && (resource.loading || session.loading))
      ? null
      : resource.data;
  const lost =
    interrupted ||
    denied(resource.error) ||
    denied(session.error) ||
    (session.data &&
      (!session.data.user ||
        session.data.mfa_required ||
        session.data.portal !== "customer" ||
        !session.data.capabilities.includes("account")));
  if (lost && saved) setSaved(null);
  else if (
    !lost &&
    detail &&
    session.data &&
    (saved?.detail !== detail || saved.session !== session.data)
  )
    setSaved({ detail, session: session.data });
  if (lost)
    return (
      <section aria-label="Order access unavailable">
        <p role="alert">
          Order access is no longer available. Sign in to your customer account
          to continue.
        </p>
        <div className="configuration-actions">
          <Link to="/login">Customer sign-in</Link>
          <Action
            disabled={resource.loading || session.loading}
            onClick={reload}
          >
            Check order access again
          </Action>
          <Link to={back}>Return to order list</Link>
        </div>
      </section>
    );
  const current =
    detail && session.data ? { detail, session: session.data } : saved;
  if (current) {
    const suspended =
      !!resource.error || !!session.error || !detail || !session.data;
    return (
      <>
        {suspended && (
          <section aria-label="Order connection recovery">
            <ErrorNotice error={resource.error ?? session.error} />
            <p role="status">
              Order details are hidden while access is checked. Your unsent
              drafts stay in memory.
            </p>
            <Action
              disabled={resource.loading || session.loading}
              onClick={reload}
            >
              Retry order access
            </Action>
            <Link to={back}>Return to order list</Link>
          </section>
        )}
        <div hidden={suspended}>
          <CustomerWorkspace
            detail={current.detail}
            session={current.session}
            refreshing={resource.loading || session.loading || suspended}
            suspended={suspended}
            reload={reload}
          />
        </div>
      </>
    );
  }
  return (
    <section>
      <Link to={back}>Return to order list</Link>
      <Action onClick={reload}>Refresh order</Action>
      <ErrorNotice error={resource.error ?? session.error} />
      <p role="status">
        {resource.error || session.error
          ? "Order unavailable. Refresh to check access again."
          : "Loading order…"}
      </p>
    </section>
  );
}

export default function OrderDetail({ admin = false }: { admin?: boolean }) {
  const { id = "" } = useParams();
  if (admin) return <AdminOrderWorkspace />;
  return <OrderSession key={"customer:" + id} />;
}
