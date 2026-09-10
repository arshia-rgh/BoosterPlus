import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Action, Check, ErrorNotice } from "../catalog/controls";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import {
  consentVersion,
  destination,
  listingSchema,
  subscriptionSchema,
  type Subscription,
} from "./model";

const consentLabel =
  "Email me when this variant becomes available again. I understand this does not reserve a place or guarantee a price.";
export function Subscribe({
  slug,
  pack,
  variant,
}: {
  slug: string;
  pack: string;
  variant: string;
}) {
  const [accept, setAccept] = useState(false),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function save() {
    setBusy(true);
    setError(null);
    try {
      await post(
        "/availability",
        {
          slug,
          package: pack,
          variant,
          accept,
          consent_version: consentVersion,
        },
        subscriptionSchema,
      );
      setSaved(true);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <aside aria-label="Package availability emails" className="panel">
      <h2>Follow availability</h2>
      <p>
        Sign in to send future opening alerts to your verified account email.
        This is separate from order update emails.
      </p>
      {saved ? (
        <p role="status">Availability alerts enabled.</p>
      ) : (
        <>
          <Check label={consentLabel} value={accept} change={setAccept} />
          <Action disabled={!accept || busy} onClick={() => void save()}>
            Enable availability emails
          </Action>
        </>
      )}
      <ErrorNotice error={error} />
      <Link to="/availability">Manage package alerts</Link>
    </aside>
  );
}
function SubscriptionCard({
  item,
  reload,
}: {
  item: Subscription;
  reload: () => void;
}) {
  const [accept, setAccept] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function change(active: boolean) {
    setBusy(true);
    setError(null);
    try {
      await post(
        `/availability/${item.id}`,
        {
          version: item.version,
          active,
          accept,
          consent_version: consentVersion,
        },
        subscriptionSchema,
      );
      reload();
      setAccept(false);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <li className="panel">
      <h3>
        <Link to={destination(item)}>{item.label}</Link>
      </h3>
      <p>
        {item.available
          ? "Capacity is currently available; check the offer before ordering."
          : "Currently unavailable."}
      </p>
      <p>Emails: {item.state}</p>
      {item.state === "active" ? (
        <Action disabled={busy} onClick={() => void change(false)}>
          Stop emails for {item.label}
        </Action>
      ) : (
        <>
          <Check label={consentLabel} value={accept} change={setAccept} />
          <Action disabled={busy || !accept} onClick={() => void change(true)}>
            Reactivate emails for {item.label}
          </Action>
        </>
      )}
      <ErrorNotice error={error} />
    </li>
  );
}
export function Subscriptions() {
  const [params] = useSearchParams();
  const resource = useResource(
    `/availability?after=${encodeURIComponent(params.get("after") ?? "")}`,
    listingSchema,
  );
  return (
    <section>
      <h2>Your package alerts</h2>
      <p>
        Up to 50 active subscriptions. Availability emails do not reserve a
        package or guarantee its price, eligibility or delivery time. Changing
        your account email requires fresh consent for future alerts.
      </p>
      <ErrorNotice error={resource.error} />
      {!resource.data ? (
        <p role="status">Loading package alerts…</p>
      ) : (
        <>
          <ul className="order-list">
            {resource.data.subscriptions.map((item) => (
              <SubscriptionCard
                key={`${item.id}:${String(item.version)}`}
                item={item}
                reload={resource.reload}
              />
            ))}
          </ul>
          {resource.data.subscriptions.length === 0 && (
            <p>
              No subscriptions yet. <Link to="/games">Explore games</Link>.
            </p>
          )}
          {resource.data.next && (
            <Link to={`/availability?after=${resource.data.next}`}>
              Next package alerts
            </Link>
          )}
        </>
      )}
    </section>
  );
}
