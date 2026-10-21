import "../ui/secondary.css";
import { ActionFields } from "../ui/action-fields";
import { useState } from "react";
import { Link, useSearchParams } from "../portal-router";
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
    <ActionFields error={error} busy={busy}>
      <aside aria-label="Package availability emails" className="panel">
        <h2>Follow availability</h2>
        <p>Get an email when this package reopens.</p>
        {saved ? (
          <p role="status">Availability alerts enabled.</p>
        ) : (
          <>
            <Check
              name="accept"
              label={consentLabel}
              value={accept}
              change={setAccept}
            />
            <Action disabled={!accept || busy} onClick={() => void save()}>
              Enable availability emails
            </Action>
          </>
        )}
        <ErrorNotice error={error} />
        <Link to="/availability">Manage availability alerts</Link>
      </aside>
    </ActionFields>
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
    <li className="panel availability-card">
      <ActionFields error={error} busy={busy}>
        <h3>
          <Link to={destination(item)}>{item.label}</Link>
        </h3>
        <p>
          {item.available
            ? "Capacity is currently available; check the offer before ordering."
            : "Currently unavailable."}
        </p>
        <p>
          {item.state === "active"
            ? "Email alerts on"
            : item.state === "suppressed"
              ? "Email alerts paused"
              : "Email alerts off"}
        </p>
        {item.state === "active" ? (
          <Action disabled={busy} onClick={() => void change(false)}>
            Stop emails for {item.label}
          </Action>
        ) : (
          <>
            <Check
              name="accept"
              label={consentLabel}
              value={accept}
              change={setAccept}
            />
            <Action
              disabled={busy || !accept}
              onClick={() => void change(true)}
            >
              Reactivate emails for {item.label}
            </Action>
          </>
        )}
        <ErrorNotice error={error} />
      </ActionFields>
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
      <h2>Your availability alerts</h2>
      <p>Alerts don’t reserve a package or price. Up to 50 active.</p>
      <Action
        variant="secondary"
        disabled={resource.loading}
        onClick={resource.reload}
      >
        Refresh alerts
      </Action>
      <ErrorNotice error={resource.error} />
      {!resource.data ? (
        <p role="status">
          {resource.loading
            ? "Loading availability alerts…"
            : "Could not load availability alerts. Use Refresh alerts to try again."}
        </p>
      ) : (
        <>
          <ul className="secondary-list availability-list">
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
            <Link
              to={`/availability?after=${encodeURIComponent(resource.data.next)}`}
            >
              Next availability alerts
            </Link>
          )}
        </>
      )}
      {params.get("after") && (
        <Link to="/availability">Newest availability alerts</Link>
      )}
    </section>
  );
}
