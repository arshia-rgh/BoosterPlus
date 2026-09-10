import { useState } from "react";
import { Link } from "react-router";
import { Action, Check, ErrorNotice, Select, Text } from "../catalog/controls";
import { Input } from "../catalog/dynamic-form";
import {
  emptyConfiguration,
  matches,
  reviewService,
  visibleAnswers,
  type Answers,
} from "../catalog/model";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import {
  orderReviewSchema,
  reviewSchema,
  stateLabel,
  type OrderReview,
} from "./model";
function Editor({ value, reload }: { value: OrderReview; reload: () => void }) {
  const [body, setBody] = useState(value.review?.body ?? ""),
    [rating, setRating] = useState(String(value.review?.review.rating ?? "")),
    [answers, setAnswers] = useState<Answers>(value.review?.answers ?? {}),
    [editing, setEditing] = useState(!value.review),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [key] = useState(() => crypto.randomUUID()),
    policy = value.policy;
  if (!policy) return null;
  const service = reviewService(policy.policy),
    visible = visibleAnswers(service, answers, "order"),
    config = {
      ...emptyConfiguration("Purchase feedback"),
      references: policy.references,
      review_policy: policy.policy,
    };
  async function save() {
    if (!policy) return;
    setBusy(true);
    setError(null);
    try {
      await post(
        `/orders/${value.order_id}/review`,
        {
          request_key: key,
          version: value.review?.review.version ?? 0,
          policy_release_id: policy.release_id,
          rating: Number(rating),
          body,
          answers: visible,
          accept_policy: accepted,
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
  if (!editing)
    return (
      <Action
        onClick={() => {
          setEditing(true);
        }}
      >
        Edit and resubmit my review
      </Action>
    );
  return (
    <section className="catalog-section">
      <h3>
        {value.review ? "Edit purchase feedback" : "Write purchase feedback"}
      </h3>
      <p>
        Share your actual experience. Do not include account credentials,
        contact details or private conversations. Changes require moderation
        before publication.
      </p>
      <ErrorNotice error={error} />
      <fieldset disabled={busy}>
        <legend>Your review</legend>
        <Select
          label="Purchase rating"
          value={rating}
          change={setRating}
          options={[
            ["", "Choose your rating"],
            ["5", "5 — Excellent"],
            ["4", "4 — Good"],
            ["3", "3 — Average"],
            ["2", "2 — Poor"],
            ["1", "1 — Very poor"],
          ]}
        />
        <Text
          label="Purchase feedback"
          multiline
          value={body}
          change={setBody}
          help="1–4,000 characters. Your rating and wording remain yours; staff may moderate publication and add a labeled response."
        />
        {service.fields
          .filter((field) =>
            matches(field.visible_when, visible, service.fields),
          )
          .map((field) => (
            <Input
              key={field.key}
              config={config}
              field={field}
              value={visible[field.key]}
              required={
                field.required ||
                (!!field.required_when &&
                  matches(field.required_when, visible, service.fields))
              }
              error={undefined}
              change={(value) => {
                setAnswers((current) => {
                  const next = Object.fromEntries(
                    Object.entries(current).filter(
                      ([key]) => key !== field.key,
                    ),
                  );
                  if (value !== undefined) next[field.key] = value;
                  return next;
                });
              }}
            />
          ))}
        <section aria-label="Review publication policy">
          <h4>Publication policy</h4>
          <p className="preserve-lines">{policy.policy.content}</p>
        </section>
        <Check
          label="I accept this review publication policy"
          value={accepted}
          change={setAccepted}
        />
        <Action
          disabled={!accepted || !body.trim() || !rating}
          onClick={() => {
            void save();
          }}
        >
          Submit review for moderation
        </Action>
      </fieldset>
    </section>
  );
}
function Withdraw({
  value,
  reload,
}: {
  value: OrderReview;
  reload: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function withdraw() {
    setBusy(true);
    setError(null);
    try {
      await post(
        `/orders/${value.order_id}/review/withdraw`,
        { version: value.review?.review.version },
        reviewSchema,
      );
      reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  if (!value.review || value.review.review.state === "withdrawn") return null;
  return (
    <>
      <Action
        disabled={busy}
        onClick={() => {
          void withdraw();
        }}
      >
        Withdraw my review
      </Action>
      <ErrorNotice error={error} />
    </>
  );
}
export default function PurchaseReview({
  orderID,
  completed,
}: {
  orderID: string;
  completed: boolean;
}) {
  const resource = useResource(
      `/orders/${encodeURIComponent(orderID)}/review`,
      orderReviewSchema,
    ),
    value = resource.data;
  if (value && !completed && !value.review) return null;
  return (
    <section
      id="purchase-review"
      className="catalog-section"
      aria-label="Purchase review"
    >
      <h2>Your purchase review</h2>
      <Action onClick={resource.reload}>Refresh purchase review</Action>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Loading review…</p>}
      {value && (
        <fieldset disabled={resource.loading}>
          <legend>Verified-buyer feedback</legend>
          {value.review && (
            <>
              <p>
                {stateLabel(value.review.review.state)} ·{" "}
                {value.review.review.rating}/5
              </p>
              <p className="preserve-lines">{value.review.body}</p>
              {value.review.response && (
                <section aria-label="Booster Plus response">
                  <h3>Booster Plus response</h3>
                  <p className="preserve-lines">{value.review.response}</p>
                </section>
              )}
              <Link to={`/reviews/${value.review.review.id}`}>
                Review revision history
              </Link>
              <p>
                <Link to={`/games/${value.review.review.slug}/reviews`}>
                  Published customer reviews
                </Link>
              </p>
              <Withdraw
                key={value.review.review.version}
                value={value}
                reload={resource.reload}
              />
            </>
          )}
          {value.eligible ? (
            <Editor
              key={`${value.policy?.release_id ?? ""}-${String(value.review?.review.version ?? 0)}`}
              value={value}
              reload={resource.reload}
            />
          ) : (
            <p>
              Writing feedback requires a completed paid boosting order, a
              customer account and a published review policy.
            </p>
          )}
        </fieldset>
      )}
    </section>
  );
}
