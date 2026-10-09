import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, type Location } from "../portal-router";
import { useRecordDraft } from "../ui/record-drafts";
import { Action, ErrorNotice, Text } from "../catalog/controls";
import { APIError, post, sessionSchema } from "../identity/api";
import { useResource } from "../orders/resource";
import { conversationSchema, messagesSchema } from "../support/model";
import { deliverySchema, recipientSchema, type ShopDelivery } from "./model";
import { DownloadImage } from "../media/attachment";
import { sessionEventMatches } from "../identity/portal";
import { minorDisplay } from "../catalog/dynamic-form";

function EvidenceChoice({
  id,
  chosen,
  choose,
  user,
}: {
  id: string;
  chosen: string;
  choose: (id: string) => void;
  user: string;
}) {
  const [thread, setThread] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [key] = useState(() => crypto.randomUUID());
  useEffect(() => {
    let active = true;
    void post(
      "/admin/conversations",
      {
        request_key: key,
        kind: "order",
        order_id: id,
        subject: "Shop delivery support",
        slug: "",
      },
      conversationSchema,
    )
      .then((value) => {
        if (active) setThread(value.id);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause);
      });
    return () => {
      active = false;
    };
  }, [id, key, attempt]);
  return (
    <>
      <ErrorNotice error={error} />
      {error && (
        <Action
          onClick={() => {
            setError(null);
            setAttempt((v) => v + 1);
          }}
        >
          Retry evidence list
        </Action>
      )}
      {thread ? (
        <ProofList
          thread={thread}
          chosen={chosen}
          choose={choose}
          user={user}
        />
      ) : !error ? (
        <p role="status">Loading delivery evidence…</p>
      ) : null}
    </>
  );
}
function ProofList({
  thread,
  chosen,
  choose,
  user,
}: {
  thread: string;
  chosen: string;
  choose: (id: string) => void;
  user: string;
}) {
  const [before, setBefore] = useState(0);
  const records = useResource(
    `/admin/conversations/${thread}/messages?before=${String(before)}`,
    messagesSchema,
  );
  const proofs =
    records.data?.messages.filter(
      (m) =>
        m.purpose === "proof" &&
        m.visibility === "public" &&
        m.sender_id === user &&
        !!m.attachments?.length,
    ) ?? [];
  const selected = proofs.find((m) => m.id === chosen);
  return (
    <div>
      {selected && (
        <section aria-label="Selected proof">
          <p>{selected.body}</p>
          {selected.attachments?.map((id) => (
            <DownloadImage key={id} id={id} admin />
          ))}
        </section>
      )}
      <ErrorNotice error={records.error} />
      <Action onClick={records.reload}>Refresh published evidence</Action>
      {records.loading ? (
        <p role="status">Loading proof…</p>
      ) : (
        <label className="catalog-label">
          Delivery evidence
          <select
            value={chosen}
            onChange={(e) => {
              choose(e.target.value);
            }}
          >
            <option value="">Choose published proof</option>
            {proofs.map((m) => (
              <option key={m.id} value={m.id}>
                {new Date(m.created_at).toLocaleString()} ·{" "}
                {m.body.slice(0, 100)}
              </option>
            ))}
          </select>
        </label>
      )}
      {!records.loading && !proofs.length && (
        <p>
          Publish a scanned proof image in Messages, then refresh this list.
        </p>
      )}
      {!!records.data?.next && (
        <Action
          onClick={() => {
            choose("");
            setBefore(records.data?.next ?? 0);
          }}
        >
          Earlier evidence
        </Action>
      )}
      {before > 0 && (
        <Action
          onClick={() => {
            choose("");
            setBefore(0);
          }}
        >
          Latest evidence
        </Action>
      )}
    </div>
  );
}
function DeliveryWork({
  data,
  id,
  changed,
  owner,
  user,
  unavailable,
}: {
  unavailable: boolean;
  data: ShopDelivery;
  id: string;
  changed: () => void;
  owner: boolean;
  user: string;
}) {
  const [note, setNote] = useState("");
  const [proof, setProof] = useState("");
  const [action, setAction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const lock = useRef(false);
  useRecordDraft(!!note || !!action, busy);
  const [revision, setRevision] = useState(
    `${String(data.version)}:${String(data.order_version)}`,
  );
  const stale =
    revision !== `${String(data.version)}:${String(data.order_version)}`;
  if (stale && !note && !action && !busy)
    setRevision(`${String(data.version)}:${String(data.order_version)}`);
  const assigned = data.assigned_id === user;
  const active = ["queued", "in_progress", "on_hold"].includes(
    data.order_state,
  );
  const actions =
    data.version === 0 && data.order_state === "queued"
      ? ["claim"]
      : data.state === "submitted"
        ? ["approve", "return"]
        : data.state === "held"
          ? ["resume"]
          : data.state === "processing"
            ? ["hold", ...(assigned ? ["submit"] : [])]
            : [];
  const labels: Record<string, string> = {
    claim: "Claim delivery",
    hold: "Place delivery on hold",
    resume: "Resume delivery",
    submit: "Submit delivery for review",
    approve: "Approve completed delivery",
    return: "Return for correction",
    take_over: "Take over delivery",
  };
  const label = (key: string) =>
    Object.entries(labels).find(([name]) => name === key)?.[1] ?? key;
  async function save() {
    if (lock.current || unavailable || stale) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await post(
        `/admin/orders/${id}/shop/${action}`,
        {
          version: data.version,
          order_version: data.order_version,
          note,
          proof_message_id: action === "submit" ? proof : "",
        },
        deliverySchema,
      );
      setNote("");
      setProof("");
      setAction("");
      changed();
    } catch (cause) {
      setError(cause);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section aria-label="Staff delivery actions">
      <h4>Next delivery action</h4>
      {stale && (
        <div role="alert">
          <p>
            Delivery changed. Your update is retained; review the current status
            before choosing an action again.
          </p>
          <Action
            disabled={unavailable}
            onClick={() => {
              setRevision(
                `${String(data.version)}:${String(data.order_version)}`,
              );
              setAction("");
              setProof("");
            }}
          >
            Review current delivery
          </Action>
        </div>
      )}

      <p>
        {assigned
          ? "Assigned to you."
          : data.assigned_id
            ? "Claimed by another staff member."
            : "Unclaimed delivery."}
      </p>
      <ErrorNotice error={error} />
      {active ? (
        <fieldset
          className="catalog-item"
          disabled={busy || unavailable || stale}
        >
          <legend className="ui-visually-hidden">Delivery action</legend>
          <label className="catalog-label">
            Action
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
              }}
            >
              <option value="">Choose an action</option>
              {actions
                .filter(
                  (a) =>
                    data.version === 0 ||
                    assigned ||
                    owner ||
                    ["approve", "return"].includes(a),
                )
                .map((a) => (
                  <option key={a} value={a}>
                    {label(a)}
                  </option>
                ))}
              {owner &&
                !assigned &&
                ["processing", "held"].includes(data.state) && (
                  <option value="take_over">Take over delivery</option>
                )}
            </select>
          </label>
          {action && (
            <>
              <Text
                label="Customer-visible update"
                value={note}
                change={setNote}
                multiline
                help="Explain the outcome and next step. Do not include private delivery identifiers or credentials."
              />
              {action === "submit" && (
                <EvidenceChoice
                  id={id}
                  chosen={proof}
                  choose={setProof}
                  user={user}
                />
              )}
              <p>
                {action === "approve"
                  ? "Approval completes this delivery and notifies the customer. Verify the proof in Messages before confirming."
                  : "This change is recorded in order history and sent to the customer."}
              </p>
              <Action
                disabled={
                  note.trim().length < 10 ||
                  note.length > 2000 ||
                  (action === "submit" && !proof)
                }
                onClick={() => void save()}
              >
                {busy ? "Saving…" : `Confirm: ${label(action)}`}
              </Action>
            </>
          )}
        </fieldset>
      ) : (
        <p>Delivery actions are unavailable for the current order state.</p>
      )}
    </section>
  );
}
export default function ShopDeliveryPanel({
  id,
  admin = false,
  visible = true,
  changed,
}: {
  id: string;
  admin?: boolean;
  visible?: boolean;
  changed: () => void;
}) {
  const base = `${admin ? "/admin" : ""}/orders/${id}/shop`;
  const resource = useResource(base, deliverySchema);
  const session = useResource("/auth/session", sessionSchema);
  const location: Location<unknown> = useLocation();
  const [values, setValues] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [revealing, setRevealing] = useState(false);
  const epoch = useRef(0);
  const revealLock = useRef(false);
  const clear = useCallback(() => {
    epoch.current++;
    revealLock.current = false;
    setValues(null);
    setRevealing(false);
  }, []);
  const refreshSession = session.reload;
  useEffect(() => {
    const generation = epoch;
    const sessionChanged = (event: Event) => {
      if (sessionEventMatches(event, admin ? "admin" : "customer")) {
        clear();
        refreshSession();
      }
    };
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    window.addEventListener("boosterplus:session-changed", sessionChanged);
    return () => {
      generation.current++;
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
      window.removeEventListener("boosterplus:session-changed", sessionChanged);
    };
  }, [visible, id, clear, refreshSession, admin]);
  const scope = `${id}:${String(visible)}:${String(resource.loading)}:${String(!!resource.error)}:${String(session.loading)}:${String(!!session.error)}:${session.data?.user?.id ?? ""}`;
  const [priorScope, setPriorScope] = useState(scope);
  if (scope !== priorScope) {
    setPriorScope(scope);
    setValues(null);
    setRevealing(false);
  }
  useEffect(() => {
    const generation = epoch;
    return () => {
      generation.current++;
      revealLock.current = false;
    };
  }, [scope]);
  useEffect(() => {
    if (!values) return;
    const timer = window.setTimeout(clear, 60000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [values, clear]);
  const [saved, setSaved] = useState<ShopDelivery | null>(null);
  const denied =
    resource.error instanceof APIError &&
    [401, 403, 404].includes(resource.error.status);
  if (denied && saved) setSaved(null);
  else if (resource.data && resource.data !== saved) setSaved(resource.data);
  const data = denied || saved?.order_id !== id ? null : saved;
  const unavailable =
    resource.loading || !!resource.error || session.loading || !!session.error;
  const mayReveal =
    !!data &&
    !unavailable &&
    (!admin ||
      (["in_progress", "on_hold"].includes(data.order_state) &&
        ["processing", "held", "submitted"].includes(data.state) &&
        (data.assigned_id === session.data?.user?.id ||
          session.data?.user?.role === "owner")));
  async function reveal() {
    if (revealLock.current || !mayReveal || !visible) return;
    revealLock.current = true;
    const request = epoch.current;
    setRevealing(true);
    setError(null);
    try {
      const out = await post(base + "/recipient", {}, recipientSchema);
      if (request === epoch.current) setValues(out.values);
    } catch (cause) {
      if (request === epoch.current) setError(cause);
    } finally {
      if (request === epoch.current) {
        revealLock.current = false;
        setRevealing(false);
      }
    }
  }
  const params = new URLSearchParams(location.search);
  params.set("section", "messages");
  params.set("channel", "support");
  return (
    <section className="catalog-section" aria-label="Shop delivery">
      <h3>Shop delivery</h3>
      <ErrorNotice error={resource.error} />
      <ErrorNotice error={error} />
      <Action
        onClick={() => {
          clear();
          resource.reload();
          changed();
        }}
      >
        Refresh delivery
      </Action>
      {resource.loading && <p role="status">Loading delivery…</p>}
      {data && (
        <>
          <h4>{data.purchase.product.title}</h4>
          <p>
            {data.purchase.variant.label} · Quantity {data.purchase.quantity} ·{" "}
            {data.purchase.variant.currency}{" "}
            {minorDisplay(data.purchase.amount_minor)}
          </p>
          <dl className="account-attributes">
            <div>
              <dt>Order</dt>
              <dd>{data.order_state.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{data.state.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Compatibility</dt>
              <dd>
                {data.purchase.variant.region} ·{" "}
                {data.purchase.variant.platform} ·{" "}
                {data.purchase.variant.server}
              </dd>
            </div>
          </dl>
          {data.note && <p className="payment-policy">{data.note}</p>}
          <p>
            Estimated delivery:{" "}
            {data.purchase.product.policy.delivery_min_hours}–
            {data.purchase.product.policy.delivery_max_hours} hours after
            verified payment.
          </p>
          <p className="payment-policy">
            {data.purchase.product.policy.delivery_terms}
          </p>
          <details>
            <summary>Accepted cancellation and refund terms</summary>
            <p>{data.purchase.product.policy.cancellation_terms}</p>
            <p>{data.purchase.product.policy.refund_terms}</p>
            <p>{data.purchase.product.policy.fees}</p>
          </details>
          <section aria-label="Private recipient">
            <h4>Delivery recipient</h4>
            <p>
              {data.recipient_provided
                ? "Recipient details are on file and hidden here."
                : "Recipient details need review. Contact support before delivery."}
            </p>
            {values && visible ? (
              <>
                <dl>
                  {Object.entries(values).map(([key, value]) => (
                    <div key={key}>
                      <dt>
                        {data.purchase.product.recipient.find(
                          (f) => f.key === key,
                        )?.label ?? key}
                      </dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <Action onClick={clear}>Hide recipient details</Action>
              </>
            ) : (
              <Action
                disabled={
                  !visible ||
                  revealing ||
                  !data.recipient_provided ||
                  !mayReveal
                }
                onClick={() => void reveal()}
              >
                {revealing
                  ? "Verifying access…"
                  : "View my authorized recipient details"}
              </Action>
            )}
            {admin && !mayReveal && (
              <p>
                Recipient access requires paid active delivery assigned to you,
                or an owner account. Claim or take over eligible work first.
              </p>
            )}
            <p className="quiet">
              Recent verification is required. Details hide when you leave this
              section, switch windows, or after one minute.
            </p>
          </section>
          <Link
            className="button"
            preventScrollReset
            state={location.state}
            to={{
              pathname: location.pathname,
              search: "?" + params.toString(),
            }}
          >
            {data.proof_message_id
              ? "View delivery proof in Messages"
              : "Open order Messages"}
          </Link>
          {admin && session.data?.user && (
            <DeliveryWork
              key={id}
              data={data}
              id={id}
              unavailable={unavailable || !visible}
              changed={() => {
                resource.reload();
                changed();
              }}
              owner={session.data.user.role === "owner"}
              user={session.data.user.id}
            />
          )}
        </>
      )}
    </section>
  );
}
