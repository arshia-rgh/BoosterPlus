import { useState } from "react";
import { Link, useParams } from "react-router";
import { Action, Check, ErrorNotice, Select, Text } from "../catalog/controls";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import {
  actionLabel,
  historySchema,
  listingSchema,
  reviewSchema,
  stateLabel,
  stateSchema,
  type Review,
} from "./model";
export function ReviewList({ admin = false }: { admin?: boolean }) {
  const [after, setAfter] = useState(""),
    [state, setState] = useState(admin ? "pending" : ""),
    base = admin ? "/admin/reviews" : "/reviews",
    resource = useResource(
      `${base}?after=${encodeURIComponent(after)}&state=${encodeURIComponent(state)}`,
      listingSchema,
    );
  return (
    <section>
      <h2>{admin ? "Review moderation queue" : "Your purchase reviews"}</h2>
      <p>
        {admin
          ? "Moderate documented content-policy violations. A low rating alone is not a reason to hide feedback."
          : "Reviews belong to completed paid purchases. You can edit or withdraw your own feedback from its order."}
      </p>
      <Select
        label="Review status"
        value={state}
        change={(value) => {
          setState(value);
          setAfter("");
        }}
        options={[
          ["", "All statuses"],
          ...stateSchema.options.map(
            (value) => [value, stateLabel(value)] as const,
          ),
        ]}
      />
      <Action onClick={resource.reload}>Refresh reviews</Action>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Loading reviews…</p>}
      {resource.data && (
        <>
          <ul className="order-list">
            {resource.data.items.map((row) => (
              <li key={row.id}>
                <Link to={`${base}/${row.id}`}>
                  {row.game} · {row.rating}/5 · {stateLabel(row.state)}
                </Link>
                <time dateTime={row.updated_at}>
                  {new Date(row.updated_at).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
          {!resource.data.items.length && <p>No reviews in this view.</p>}
          {resource.data.next && (
            <Action
              onClick={() => {
                setAfter(resource.data?.next ?? "");
              }}
            >
              More reviews
            </Action>
          )}
        </>
      )}
      {after && (
        <Action
          onClick={() => {
            setAfter("");
          }}
        >
          Newest reviews
        </Action>
      )}
    </section>
  );
}
function History({ id, admin }: { id: string; admin: boolean }) {
  const [after, setAfter] = useState(0),
    resource = useResource(
      `${admin ? "/admin" : ""}/reviews/${encodeURIComponent(id)}/history?after=${String(after)}`,
      historySchema,
    );
  return (
    <section className="catalog-section">
      <h3>Review revision history</h3>
      <ErrorNotice error={resource.error} />
      {resource.data && (
        <>
          <ol>
            {resource.data.revisions.map((row) => (
              <li key={row.version}>
                <details>
                  <summary>
                    {actionLabel(row.action)} · {row.rating}/5 ·{" "}
                    {new Date(row.created_at).toLocaleString()}
                  </summary>
                  <p>
                    {stateLabel(row.state)} · {row.actor_role}
                  </p>
                  <p className="preserve-lines">{row.body}</p>
                  {row.response && (
                    <p className="preserve-lines">
                      PLAYORA response: {row.response}
                    </p>
                  )}
                  {admin && row.internal_reason && (
                    <p className="preserve-lines">
                      Internal moderation note: {row.internal_reason}
                    </p>
                  )}
                  <p className="preserve-lines">
                    Accepted publication policy: {row.policy.policy.content}
                  </p>
                </details>
              </li>
            ))}
          </ol>
          {resource.data.revisions.length === 50 && (
            <Action
              onClick={() => {
                setAfter(resource.data?.revisions.at(-1)?.version ?? 0);
              }}
            >
              Later revisions
            </Action>
          )}
        </>
      )}
      {after > 0 && (
        <Action
          onClick={() => {
            setAfter(0);
          }}
        >
          First revisions
        </Action>
      )}
    </section>
  );
}
function Moderation({ value, reload }: { value: Review; reload: () => void }) {
  const [note, setNote] = useState(""),
    [reason, setReason] = useState(""),
    [response, setResponse] = useState(value.response),
    [checked, setChecked] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    state = value.review.state;
  async function change(action: string) {
    setBusy(true);
    setError(null);
    try {
      await post(
        `/admin/reviews/${value.review.id}/${action}`,
        {
          version: value.review.version,
          policy_checked: checked,
          reason_code: reason,
          note,
          response,
        },
        reviewSchema,
      );
      reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  if (state === "withdrawn")
    return <p>The customer withdrew this review. Staff cannot republish it.</p>;
  return (
    <section className="catalog-section">
      <h3>Publication decision</h3>
      <ErrorNotice error={error} />
      <fieldset disabled={busy}>
        <legend>Moderation controls</legend>
        <Text
          label="Internal moderation explanation"
          multiline
          value={note}
          change={setNote}
          help="This stays private to administrators and must explain the content-policy decision."
        />
        <Check
          label="I checked this content against its accepted publication policy"
          value={checked}
          change={setChecked}
        />
        {state !== "published" && (
          <Action
            disabled={!checked || !note.trim()}
            onClick={() => {
              void change("publish");
            }}
          >
            Publish customer review
          </Action>
        )}
        <Select
          label="Content-policy violation"
          value={reason}
          change={setReason}
          options={[
            ["", "Choose a documented violation"],
            ["privacy", "Personal data or credentials"],
            ["spam", "Spam"],
            ["abuse", "Abusive content"],
            ["off_topic", "Unrelated content"],
          ]}
        />
        {state === "published" ? (
          <Action
            disabled={!reason || !note.trim()}
            onClick={() => {
              void change("hide");
            }}
          >
            Hide customer review
          </Action>
        ) : (
          state !== "rejected" && (
            <Action
              disabled={!reason || !note.trim()}
              onClick={() => {
                void change("reject");
              }}
            >
              Reject customer review
            </Action>
          )
        )}
        <p>
          A low rating alone is not a content-policy violation. Customer text
          and ratings cannot be rewritten here.
        </p>
        {state === "published" && (
          <>
            <Text
              label="Public PLAYORA response"
              multiline
              value={response}
              change={setResponse}
            />
            <Action
              disabled={!checked || !response.trim()}
              onClick={() => {
                void change("respond");
              }}
            >
              Publish staff response
            </Action>
          </>
        )}
      </fieldset>
    </section>
  );
}
export function ReviewDetail({ admin = false }: { admin?: boolean }) {
  const { id = "" } = useParams(),
    resource = useResource(
      `${admin ? "/admin" : ""}/reviews/${encodeURIComponent(id)}`,
      reviewSchema,
    ),
    value = resource.data;
  return (
    <section>
      <Link to={admin ? "/admin/reviews" : "/reviews"}>← Review list</Link>
      <Action onClick={resource.reload}>Refresh review</Action>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Refreshing review…</p>}
      {value && (
        <fieldset disabled={resource.loading}>
          <legend>Private review history</legend>
          <h2>
            {value.review.game} · {value.review.rating}/5
          </h2>
          <p>{stateLabel(value.review.state)}</p>
          <p className="preserve-lines">{value.body}</p>
          <dl>
            {value.policy.policy.fields.map((field) => {
              const answer = value.answers[field.key];
              return answer === undefined ? null : (
                <div key={field.key}>
                  <dt>{field.label}</dt>
                  <dd>
                    {Array.isArray(answer) ? answer.join(", ") : String(answer)}
                  </dd>
                </div>
              );
            })}
          </dl>
          <Link
            to={`${admin ? "/admin" : ""}/orders/${value.review.order_id}#purchase-review`}
          >
            {admin
              ? "Review original purchase"
              : "Edit or withdraw from your purchase"}
          </Link>
          <p>
            <Link to={`/games/${value.review.slug}/reviews`}>
              Published game reviews
            </Link>
          </p>
          <section
            className="catalog-section"
            aria-label="Accepted review publication policy"
          >
            <h3>Accepted publication policy</h3>
            <p className="preserve-lines">{value.policy.policy.content}</p>
          </section>
          {value.response && (
            <section aria-label="PLAYORA response">
              <h3>PLAYORA response</h3>
              <p className="preserve-lines">{value.response}</p>
            </section>
          )}
          {admin && (
            <>
              {value.internal_reason && (
                <p className="preserve-lines">
                  Internal moderation note: {value.internal_reason}
                </p>
              )}
              <Moderation
                key={value.review.version}
                value={value}
                reload={resource.reload}
              />
            </>
          )}
          <History key={value.review.version} id={id} admin={admin} />
        </fieldset>
      )}
    </section>
  );
}
