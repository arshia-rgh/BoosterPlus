import { denied } from "../support/chat-state";
import { RecordShell } from "../ui/record-shell";
import { RecordDraftBoundary, useRecordDraft } from "../ui/record-drafts";
import "../ui/secondary.css";
import { useState } from "react";
import {
  Link,
  useParams,
  useSearchParams,
  useLocation,
  type Location,
} from "../portal-router";
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
  const [params, setParams] = useSearchParams();
  const state = params.get("state") ?? (admin ? "pending" : ""),
    after = params.get("after") ?? "",
    setAfter = (v: string) => {
      const q = new URLSearchParams(params);
      if (v) q.set("after", v);
      else q.delete("after");
      setParams(q);
    },
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
          setParams({ state: value });
        }}
        options={[
          ["", "All statuses"],
          ...stateSchema.options.map(
            (value) => [value, stateLabel(value)] as const,
          ),
        ]}
      />
      <Action disabled={resource.loading} onClick={resource.reload}>
        Refresh reviews
      </Action>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Loading reviews…</p>}
      {resource.data && (
        <>
          <ul className="secondary-list review-list">
            {resource.data.items.map((row) => (
              <li key={row.id}>
                <Link
                  to={`${base}/${row.id}`}
                  state={{ reviewSearch: params.toString() }}
                >
                  {row.game} · {row.rating}/5 · {stateLabel(row.state)}
                </Link>
                <time dateTime={row.updated_at}>
                  {new Date(row.updated_at).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
          {!resource.data.items.length && (
            <p>
              No reviews in this view.{" "}
              {!admin && (
                <Link to="/orders">
                  Open an eligible completed order to leave feedback
                </Link>
              )}
            </p>
          )}
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
function Moderation({
  value,
  reload,
  saved,
}: {
  value: Review;
  reload: () => void;
  saved: (value: Review) => void;
}) {
  const [note, setNote] = useState(""),
    [reason, setReason] = useState(""),
    [response, setResponse] = useState(value.response),
    [checked, setChecked] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    state = value.review.state;
  useRecordDraft(
    !!note || !!reason || checked || response !== value.response,
    busy,
  );
  async function change(action: string) {
    setBusy(true);
    setError(null);
    try {
      const result = await post(
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
      saved(result);
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
  const { id = "" } = useParams();
  return (
    <RecordDraftBoundary
      record="review"
      description="Review sections keep your moderation explanation and response. Leaving discards unsaved changes."
    >
      <ReviewWorkspace key={id} id={id} admin={admin} />
    </RecordDraftBoundary>
  );
}
function ReviewWorkspace({ id, admin }: { id: string; admin: boolean }) {
  const resource = useResource(
    `${admin ? "/admin" : ""}/reviews/${encodeURIComponent(id)}`,
    reviewSchema,
  );
  const [saved, setSaved] = useState<Review | null>(null);
  if (denied(resource.error) && saved) setSaved(null);
  else if (!saved && resource.data) setSaved(resource.data);
  const value = saved,
    stale = !!(
      value &&
      resource.data &&
      value.review.version !== resource.data.review.version
    );
  const location: Location<unknown> = useLocation();
  const raw =
    location.state &&
    typeof location.state === "object" &&
    "reviewSearch" in location.state &&
    typeof location.state.reviewSearch === "string"
      ? location.state.reviewSearch
      : "";
  const input = new URLSearchParams(raw),
    query = new URLSearchParams();
  const status = input.get("state"),
    after = input.get("after");
  if (
    status !== null &&
    (status === "" || stateSchema.safeParse(status).success)
  )
    query.set("state", status);
  if (after && /^[a-zA-Z0-9_-]{1,180}$/.test(after)) query.set("after", after);
  const base = admin ? "/admin/reviews" : "/reviews";
  return (
    <section className="secondary-workspace">
      <Action disabled={resource.loading} onClick={resource.reload}>
        Refresh review
      </Action>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Refreshing review…</p>}
      {!value && !resource.loading && (
        <Link to={base + (query.size ? `?${query.toString()}` : "")}>
          Back to review list
        </Link>
      )}
      {value && (
        <div hidden={!!resource.error}>
          {stale && (
            <section role="alert" className="catalog-section">
              <p>
                This review has a newer revision. Your unsaved moderation text
                is preserved. Loading the current review discards those changes.
              </p>
              <Action
                disabled={resource.loading}
                onClick={() => {
                  if (resource.data) setSaved(resource.data);
                }}
              >
                Discard moderation draft and load current review
              </Action>
            </section>
          )}
          <RecordShell
            id={id}
            title="Review"
            workspace={admin ? "Admin workspace" : "My account"}
            headingLevel={2}
            status={
              <p>
                {value.review.game} · {value.review.rating}/5 ·{" "}
                {stateLabel(value.review.state)}
              </p>
            }
            back={{
              to: base + (query.size ? `?${query.toString()}` : ""),
              label: "Back to review list",
            }}
            sections={[
              {
                id: "overview",
                label: admin ? "Overview & moderation" : "Overview",
              },
              { id: "policy", label: "Accepted policy" },
              { id: "history", label: "History" },
            ]}
            keepMounted={["overview"]}
          >
            {(section) => (
              <fieldset disabled={resource.loading || stale}>
                {section === "overview" && (
                  <>
                    <legend>Purchase review</legend>
                    <p className="preserve-lines">{value.body}</p>
                    <dl>
                      {value.policy.policy.fields.map((field) => {
                        const answer = value.answers[field.key];
                        return answer === undefined ? null : (
                          <div key={field.key}>
                            <dt>{field.label}</dt>
                            <dd>
                              {Array.isArray(answer)
                                ? answer.join(", ")
                                : String(answer)}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                    <Link
                      to={`${admin ? "/admin" : ""}/orders/${value.review.order_id}?section=${admin ? "fulfillment" : "progress"}#purchase-review`}
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
                          saved={setSaved}
                        />
                      </>
                    )}
                  </>
                )}
                {section === "policy" && (
                  <section aria-label="Accepted review publication policy">
                    <h3>Accepted publication policy</h3>
                    <p className="preserve-lines">
                      {value.policy.policy.content}
                    </p>
                  </section>
                )}
                {section === "history" && (
                  <History key={value.review.version} id={id} admin={admin} />
                )}
              </fieldset>
            )}
          </RecordShell>
        </div>
      )}
    </section>
  );
}
