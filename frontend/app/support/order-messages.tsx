import type { Location } from "react-router";
import { useEffect, useState } from "react";
import { Link, useLocation } from "../portal-router";
import { Action, ErrorNotice } from "../catalog/controls";
import { APIError, post, sessionSchema } from "../identity/api";
import type { Detail } from "../orders/model";
import { useResource } from "../orders/resource";
import { workSchema } from "../fulfillment/model";
import { conversationSchema } from "./model";
import Thread from "./thread";
import { deliverySchema } from "../shop/model";
function ShopProofThread({
  id,
  conversationID,
  visible,
  version,
}: {
  id: string;
  conversationID: string;
  visible: boolean;
  version: number;
}) {
  const delivery = useResource(`/admin/orders/${id}/shop`, deliverySchema),
    session = useResource("/auth/session", sessionSchema);
  const reload = delivery.reload;
  useEffect(() => {
    if (visible) reload();
  }, [visible, version, reload]);
  const allowed =
    !delivery.loading &&
    !delivery.error &&
    !session.error &&
    !session.loading &&
    delivery.data?.assigned_id === session.data?.user?.id &&
    delivery.data?.state === "processing" &&
    delivery.data.order_state === "in_progress";
  return (
    <>
      <ErrorNotice error={delivery.error} />
      {delivery.error && (
        <Action onClick={reload}>Retry delivery authority</Action>
      )}
      <Thread
        conversationID={conversationID}
        admin
        embedded
        visible={visible}
        shopProof={allowed}
      />
    </>
  );
}

function PrivateOrderThread({
  detail,
  visible,
  admin = false,
}: {
  detail: Detail;
  visible: boolean;
  admin?: boolean;
}) {
  const [id, setID] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const [key] = useState(() => crypto.randomUUID());
  const order = detail.order;
  useEffect(() => {
    if (!visible || id) return;
    let active = true;
    void post(
      (admin ? "/admin" : "") + "/conversations",
      {
        request_key: key,
        kind: "order",
        order_id: order.id,
        subject: order.game_name.slice(0, 120) + " order support",
        slug: "",
      },
      conversationSchema,
    )
      .then((thread) => {
        if (active) setID(thread.id);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause);
      });
    return () => {
      active = false;
    };
  }, [visible, id, attempt, key, order.id, order.game_name, admin]);
  return (
    <>
      <p>
        Private customer and PLAYORA support conversation. Boosters cannot read
        this conversation. Internal notes are visible only to administrators.
      </p>
      {!id && (
        <>
          <ErrorNotice error={error} />
          {error ? (
            <Action
              onClick={() => {
                setError(null);
                setAttempt((v) => v + 1);
              }}
            >
              Retry order support
            </Action>
          ) : (
            <p role="status">Opening this order’s support conversation…</p>
          )}
        </>
      )}
      {id &&
        (admin && order.kind === "shop" ? (
          <ShopProofThread
            id={order.id}
            conversationID={id}
            visible={visible}
            version={order.version}
          />
        ) : (
          <Thread
            conversationID={id}
            admin={admin}
            embedded
            visible={visible}
          />
        ))}
    </>
  );
}
function CoordinationThread({
  id,
  visible,
  admin = false,
}: {
  id: string;
  visible: boolean;
  admin?: boolean;
}) {
  const work = useResource(
    `${admin ? "/admin" : ""}/fulfillment/${id}`,
    workSchema,
  );
  const [threadID, setThreadID] = useState("");
  const denied =
    work.error instanceof APIError &&
    [401, 403, 404].includes(work.error.status);
  const valid =
    work.data?.order_id === id ? work.data.coordination_id : undefined;
  const reload = work.reload;
  useEffect(() => {
    if (visible) reload();
  }, [visible, reload]);
  if ((denied || (work.data && !valid)) && threadID) setThreadID("");
  else if (!denied && valid && valid !== threadID) setThreadID(valid);
  const checking = work.loading || !!work.error;
  return (
    <>
      <p>
        Coordination and proof for this order. The assigned booster can read
        shared history only while staff authorizes sharing. Keep private support
        questions in the separate support conversation.
      </p>
      <ErrorNotice error={work.error} />
      {work.error ? (
        <Action onClick={reload}>Retry coordination access</Action>
      ) : work.loading ? (
        <p role="status">Checking shared coordination…</p>
      ) : !valid ? (
        <p>
          Staff has not enabled a shared coordination conversation for this
          order.
        </p>
      ) : null}
      {threadID && !denied && (
        <div hidden={checking}>
          <Thread
            conversationID={threadID}
            admin={admin}
            embedded
            visible={visible && !checking}
          />
        </div>
      )}
    </>
  );
}
export default function OrderMessages({
  detail,
  visible,
  admin = false,
}: {
  detail: Detail;
  visible: boolean;
  admin?: boolean;
}) {
  const location: Location<unknown> = useLocation();
  const query = new URLSearchParams(location.search);
  const allowed =
    detail.order.kind !== "account" &&
    detail.order.kind !== "shop" &&
    detail.contract?.payment_state === "settled";
  const shared = allowed && query.get("channel") === "coordination";
  const [visited, setVisited] = useState({
    support: !shared,
    coordination: shared,
  });
  if (shared && !visited.coordination)
    setVisited({ ...visited, coordination: true });
  if (!shared && !visited.support) setVisited({ ...visited, support: true });
  const link = (channel: string, label: string) => {
    const next = new URLSearchParams(query);
    next.set("section", "messages");
    next.set("channel", channel);
    return (
      <Link
        state={location.state}
        preventScrollReset
        to={{ pathname: location.pathname, search: "?" + next.toString() }}
        aria-current={
          (channel === "coordination") === shared ? "page" : undefined
        }
      >
        {label}
      </Link>
    );
  };
  return (
    <section className="order-messages" aria-label="Messages for this order">
      <h2>Messages for this order</h2>
      {allowed && (
        <nav
          aria-label="Order conversation audience"
          className="record-sections"
        >
          {link("support", "Private support")}
          {link("coordination", "Shared coordination")}
        </nav>
      )}
      {visited.support && (
        <div hidden={shared}>
          <PrivateOrderThread
            detail={detail}
            admin={admin}
            visible={visible && !shared}
          />
        </div>
      )}
      {allowed && visited.coordination && (
        <div hidden={!shared}>
          <CoordinationThread
            id={detail.order.id}
            admin={admin}
            visible={visible && shared}
          />
        </div>
      )}
    </section>
  );
}
