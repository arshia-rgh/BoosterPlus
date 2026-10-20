import {
  FieldValidation,
  useFormValidation,
  type FieldIssue,
} from "../ui/form-validation";
import { useEffect, useRef, useState } from "react";
import { Link } from "../portal-router";
import {
  Action,
  Check,
  ErrorNotice,
  Issues,
  Select,
  Text,
} from "../catalog/controls";
import { Input } from "../catalog/dynamic-form";
import {
  emptyConfiguration,
  matches,
  reviewService,
  visibleAnswers,
  type Answers,
} from "../catalog/model";
import { APIError, post } from "../identity/api";
import { useResource } from "../orders/resource";
import {
  orderReviewSchema,
  reviewSchema,
  stateLabel,
  type OrderReview,
} from "./model";
import "./form.css";
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
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const validation = useFormValidation(
    issues,
    (name) => {
      setIssues((old) => old.filter((issue) => issue.path !== name));
      setError((current: unknown) =>
        current instanceof APIError && current.issues.length ? null : current,
      );
    },
    undefined,
    !busy,
  );
  const errorRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLHeadingElement>(null);
  const openEditor = useRef(false);
  useEffect(() => {
    if (
      !busy &&
      error &&
      !issues.length &&
      !(error instanceof APIError && error.issues.length) &&
      !document.hidden &&
      document.hasFocus()
    )
      errorRef.current?.focus();
  }, [busy, error, issues.length]);
  useEffect(() => {
    if (editing && openEditor.current) {
      openEditor.current = false;
      editorRef.current?.focus();
    }
  }, [editing]);
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
    const invalid: FieldIssue[] = [];
    if (!/^[1-5]$/.test(rating))
      invalid.push({ path: "rating", message: "Choose a rating from 1 to 5." });
    if (!body.trim() || Array.from(body).length > 4000 || body.includes("\0"))
      invalid.push({
        path: "body",
        message: "Write your feedback using 1–4,000 characters.",
      });
    if (!accepted)
      invalid.push({
        path: "accept_policy",
        message: "Accept the publication policy before submitting your review.",
      });
    setIssues(invalid);
    if (invalid.length) return;
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
      if (cause instanceof APIError) setIssues(cause.issues);
    } finally {
      setBusy(false);
    }
  }
  if (!editing)
    return (
      <Action
        onClick={() => {
          openEditor.current = true;
          setEditing(true);
        }}
      >
        Edit and resubmit my review
      </Action>
    );
  return (
    <FieldValidation value={validation}>
      <section className="purchase-review-editor">
        <h3 ref={editorRef} tabIndex={-1}>
          {value.review ? "Edit purchase feedback" : "Write purchase feedback"}
        </h3>
        <p>
          Share your actual experience. Do not include account credentials,
          contact details or private conversations. Changes require moderation
          before publication.
        </p>
        <div
          ref={errorRef}
          tabIndex={-1}
          role="group"
          aria-label="Review could not be submitted"
        >
          <ErrorNotice error={error} hideIssues />
        </div>
        <Issues issues={issues} />
        <fieldset className="purchase-review-fields" disabled={busy}>
          <legend className="ui-visually-hidden">Your review</legend>
          <Select
            name="rating"
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
            name="body"
            label="Purchase feedback"
            multiline
            value={body}
            change={setBody}
            help="1–4,000 characters. Your rating and wording remain yours; staff may add a labeled response."
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
                  validation.correct(field.key);
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
            name="accept_policy"
            label="I accept this review publication policy"
            value={accepted}
            change={setAccepted}
          />
          <Action
            disabled={busy}
            onClick={() => {
              void save();
            }}
          >
            Submit review for moderation
          </Action>
        </fieldset>
      </section>
    </FieldValidation>
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
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!busy && error && !document.hidden && document.hasFocus())
      errorRef.current?.focus();
  }, [busy, error]);
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
      <div
        ref={errorRef}
        tabIndex={-1}
        role="group"
        aria-label="Review could not be withdrawn"
      >
        <ErrorNotice error={error} />
      </div>
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
  const resultRef = useRef<HTMLHeadingElement>(null);
  const resourceErrorRef = useRef<HTMLDivElement>(null);
  const awaitingResult = useRef(false);
  const resultScope = useRef(orderID);
  useEffect(() => {
    if (resultScope.current !== orderID) {
      resultScope.current = orderID;
      awaitingResult.current = false;
      return;
    }
    if (!resource.loading && awaitingResult.current) {
      awaitingResult.current = false;
      if (!document.hidden && document.hasFocus()) {
        if (resource.error) resourceErrorRef.current?.focus();
        else resultRef.current?.focus();
      }
    }
  }, [resource.data, resource.error, resource.loading, orderID]);
  function changed() {
    awaitingResult.current = true;
    resource.reload();
  }
  if (value && (!completed || !value.eligible) && !value.review) return null;
  return (
    <section
      id="purchase-review"
      className="catalog-section purchase-review-panel"
      aria-label="Purchase review"
    >
      <h2 ref={resultRef} tabIndex={-1}>
        Your purchase review
      </h2>
      <Action onClick={resource.reload}>Refresh purchase review</Action>
      <div
        ref={resourceErrorRef}
        tabIndex={-1}
        role="group"
        aria-label="Review could not be refreshed"
      >
        <ErrorNotice error={resource.error} />
      </div>
      {resource.loading && <p role="status">Loading review…</p>}
      {value && (
        <fieldset className="purchase-review-body" disabled={resource.loading}>
          <legend className="ui-visually-hidden">
            Verified-buyer feedback
          </legend>
          {value.review && (
            <>
              <p>
                {stateLabel(value.review.review.state)} ·{" "}
                {value.review.review.rating}/5
              </p>
              <p className="preserve-lines">{value.review.body}</p>
              {value.review.response && (
                <section aria-label="PLAYORA response">
                  <h3>PLAYORA response</h3>
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
                reload={changed}
              />
            </>
          )}
          {value.eligible ? (
            <Editor
              key={`${value.policy?.release_id ?? ""}-${String(value.review?.review.version ?? 0)}`}
              value={value}
              reload={changed}
            />
          ) : (
            <p>
              New feedback is not currently available for this purchase. You can
              still view or withdraw your existing review.
            </p>
          )}
        </fieldset>
      )}
    </section>
  );
}
