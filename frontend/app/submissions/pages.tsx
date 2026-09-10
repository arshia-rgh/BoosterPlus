import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Action, ErrorNotice, Select, Text } from "../catalog/controls";
import { listingSchema as gamesSchema, releaseSchema } from "../catalog/model";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import SubmissionEditor from "./form";
import {
  actionLabel,
  historySchema,
  listingSchema,
  stateLabel,
  stateSchema,
  submissionSchema,
  type Submission,
} from "./model";

export function SubmissionList({ admin = false }: { admin?: boolean }) {
  const [after, setAfter] = useState(""),
    [state, setState] = useState(admin ? "submitted" : ""),
    resource = useResource(
      `${admin ? "/admin" : ""}/submissions?after=${encodeURIComponent(after)}&state=${encodeURIComponent(state)}`,
      listingSchema,
    );
  return (
    <section>
      <h2>
        {admin ? "Private account review queue" : "Your account submissions"}
      </h2>
      {!admin && (
        <>
          <p>
            Submit an account you control for private review. A review approval
            does not create a purchase, listing or payout agreement.
          </p>
          <Link className="button compact" to="/sell/new">
            Start an account submission
          </Link>
        </>
      )}
      <Select
        label="Submission status"
        value={state}
        options={[
          ["", "All statuses"],
          ...stateSchema.options.map((s) => [s, stateLabel(s)] as const),
        ]}
        change={(value) => {
          setState(value);
          setAfter("");
        }}
      />
      <Action onClick={resource.reload}>Refresh submissions</Action>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Loading private submissions…</p>}
      {!resource.error && resource.data && (
        <>
          <ul>
            {resource.data.items.map((row) => (
              <li key={row.id}>
                <Link
                  to={`${admin ? "/admin/submissions" : "/sell"}/${row.id}`}
                >
                  {row.title}
                </Link>{" "}
                · {row.game} · {stateLabel(row.state)}
              </li>
            ))}
          </ul>
          {!resource.data.items.length && <p>No submissions in this view.</p>}
          {resource.data.next && (
            <Action
              onClick={() => {
                setAfter(resource.data?.next ?? "");
              }}
            >
              Older submissions
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
          Newest submissions
        </Action>
      )}
    </section>
  );
}

function DraftStart({ slug }: { slug: string }) {
  const resource = useResource(
      `/catalog/games/${encodeURIComponent(slug)}`,
      releaseSchema,
    ),
    [title, setTitle] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [requestKey] = useState(() => crypto.randomUUID()),
    navigate = useNavigate();
  async function create() {
    if (!resource.data) return;
    setBusy(true);
    setError(null);
    try {
      const value = await post(
        "/submissions",
        { request_key: requestKey, slug, release_id: resource.data.id, title },
        submissionSchema,
      );
      void navigate(`/sell/${value.submission.id}`);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="catalog-section">
      <ErrorNotice error={resource.error ?? error} />
      {resource.loading && <p role="status">Loading intake form…</p>}
      {resource.data && !resource.error && (
        <>
          <h3>
            {resource.data.configuration.intake?.name ??
              "Account intake unavailable"}
          </h3>
          <p>{resource.data.configuration.intake?.description}</p>
          <Text
            label="Private account title"
            value={title}
            change={setTitle}
            help="A short label for your submission. Do not enter login or recovery information."
          />
          <Action
            disabled={
              busy ||
              resource.loading ||
              !title.trim() ||
              resource.data.paused ||
              !resource.data.configuration.intake
            }
            onClick={() => {
              void create();
            }}
          >
            Create private draft
          </Action>
          {resource.data.paused && (
            <p>This game is not accepting new submissions right now.</p>
          )}
        </>
      )}
    </section>
  );
}
export function NewSubmission() {
  const [after, setAfter] = useState(""),
    [slug, setSlug] = useState(""),
    resource = useResource(
      `/catalog/games?after=${encodeURIComponent(after)}`,
      gamesSchema,
    );
  return (
    <section>
      <Link to="/sell">← Your submissions</Link>
      <h2>Choose an account game</h2>
      <p>
        Only games with a published intake form accept submissions. Your
        evidence and review conversation stay private to you and administrators.
      </p>
      <ErrorNotice error={resource.error} />
      {!resource.error && resource.data && (
        <>
          <ul>
            {resource.data.games
              .filter((g) => g.intake_enabled && !g.paused)
              .map((game) => (
                <li key={game.id}>
                  <Action
                    onClick={() => {
                      setSlug(game.slug);
                    }}
                  >
                    Submit {game.name} account
                  </Action>
                </li>
              ))}
          </ul>
          {!resource.data.games.some((g) => g.intake_enabled && !g.paused) && (
            <p>No games on this page are accepting accounts.</p>
          )}
          {resource.data.next && (
            <Action
              onClick={() => {
                setAfter(resource.data?.next ?? "");
              }}
            >
              More games
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
          First games
        </Action>
      )}
      {slug && <DraftStart key={slug} slug={slug} />}
    </section>
  );
}

function History({ id, admin }: { id: string; admin: boolean }) {
  const [after, setAfter] = useState(0),
    resource = useResource(
      `${admin ? "/admin" : ""}/submissions/${id}/history?after=${String(after)}`,
      historySchema,
    );
  return (
    <section className="catalog-section">
      <h3>Submission history</h3>
      <ErrorNotice error={resource.error} />
      {!resource.error && resource.data && (
        <>
          <ol>
            {resource.data.events.map((event) => (
              <li key={event.version}>
                <p>
                  {actionLabel(event.action)} · {event.actor_role} ·{" "}
                  {new Date(event.created_at).toLocaleString()}
                </p>
                <p>{event.message}</p>
              </li>
            ))}
          </ol>
          {resource.data.events.length === 50 && (
            <Action
              onClick={() => {
                setAfter(resource.data?.events.at(-1)?.version ?? 0);
              }}
            >
              Later history
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
          First history
        </Action>
      )}
    </section>
  );
}
function ReviewActions({
  value,
  admin,
  reload,
}: {
  value: Submission;
  admin: boolean;
  reload: () => void;
}) {
  const [note, setNote] = useState(""),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    row = value.submission;
  async function change(action: string) {
    setBusy(true);
    setError(null);
    try {
      await post(
        `${admin ? "/admin" : ""}/submissions/${row.id}/${action}`,
        { version: row.version, note },
        submissionSchema,
      );
      reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  if (
    row.state === "withdrawn" ||
    row.state === "rejected" ||
    (admin && row.state === "draft")
  )
    return null;
  return (
    <section className="catalog-section">
      <h3>{admin ? "Review decision" : "Before commercial acceptance"}</h3>
      <ErrorNotice error={error} />
      {admin ? (
        <>
          <Text
            label="Seller-visible review reason"
            value={note}
            change={setNote}
            multiline
          />
          <fieldset disabled={busy || !note.trim()}>
            <legend>Review actions</legend>
            {row.state !== "needs_information" && (
              <Action
                onClick={() => {
                  void change("clarify");
                }}
              >
                Request account information
              </Action>
            )}
            <Action
              onClick={() => {
                void change("reject");
              }}
            >
              Reject account submission
            </Action>
            {row.state === "submitted" && (
              <Action
                onClick={() => {
                  void change("approve_review");
                }}
              >
                Approve review pending terms
              </Action>
            )}
          </fieldset>
          <p>
            This decision does not verify a transfer, publish a listing, accept
            commercial terms or create a payout.
          </p>
        </>
      ) : (
        <>
          <p>
            You may withdraw this submission before accepting any commercial
            agreement.
          </p>
          <Action
            disabled={busy}
            onClick={() => {
              void change("withdraw");
            }}
          >
            Withdraw account submission
          </Action>
        </>
      )}
    </section>
  );
}
export function SubmissionDetail({ admin = false }: { admin?: boolean }) {
  const { id = "" } = useParams(),
    resource = useResource(
      `${admin ? "/admin" : ""}/submissions/${encodeURIComponent(id)}`,
      submissionSchema,
    ),
    value = resource.error ? null : resource.data;
  return (
    <section>
      <Link to={admin ? "/admin/submissions" : "/sell"}>← Submissions</Link>
      <Action onClick={resource.reload}>Refresh submission</Action>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Refreshing submission…</p>}
      {value && (
        <fieldset disabled={resource.loading}>
          <legend>Private account review</legend>
          <h2>{value.submission.title}</h2>
          <p>
            {value.submission.game} · {stateLabel(value.submission.state)}
          </p>
          <p>{value.note}</p>
          <Link
            to={`${admin ? "/admin" : ""}/support/${value.conversation_id}`}
          >
            Open private review conversation
          </Link>
          <p>
            Upload ownership screenshots in that conversation. It is separate
            from buyer support and booster coordination. Never send login
            passwords or recovery codes in ordinary form fields or chat.
          </p>
          {!admin &&
          ["draft", "needs_information"].includes(value.submission.state) ? (
            <SubmissionEditor
              key={value.submission.version}
              value={value}
              reload={resource.reload}
            />
          ) : (
            <section className="catalog-section">
              <h3>Submitted account information</h3>
              <dl>
                {value.offer.configuration.intake?.fields.map((field) => {
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
              <h3>Ownership and control</h3>
              <p>{value.ownership_notes || "Not provided"}</p>
              <p>
                {value.ownership_declared
                  ? "Seller declared authority to submit this account."
                  : "Authority has not been declared."}
              </p>
            </section>
          )}
          <ReviewActions
            key={`actions-${String(value.submission.version)}`}
            value={value}
            admin={admin}
            reload={resource.reload}
          />
          <History
            key={`history-${String(value.submission.version)}`}
            id={id}
            admin={admin}
          />
        </fieldset>
      )}
    </section>
  );
}
