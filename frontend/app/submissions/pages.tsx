import "../resale/marketplace.css";
import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "../portal-router";
import { Action, ErrorNotice, Issues, Select, Text } from "../catalog/controls";
import { listingSchema as gamesSchema, releaseSchema } from "../catalog/model";
import { uncertain } from "../support/chat-state";
import { APIError, post } from "../identity/api";
import {
  FieldValidation,
  useFormValidation,
  type FieldIssue,
} from "../ui/form-validation";
import { useResource } from "../orders/resource";
import {
  listingSchema,
  stateLabel,
  stateSchema,
  submissionSchema,
} from "./model";

export function SubmissionList({ admin = false }: { admin?: boolean }) {
  const [params, setParams] = useSearchParams();
  const after = params.get("after") ?? "";
  const state = params.get("state") ?? (admin ? "submitted" : "");
  const setAfter = (after: string) => {
    setParams({ ...Object.fromEntries(params), after });
  };
  const setState = (state: string) => {
    setParams({ ...Object.fromEntries(params), state, after: "" });
  };
  const resource = useResource(
    `${admin ? "/admin" : ""}/submissions?after=${encodeURIComponent(after)}&state=${encodeURIComponent(state)}`,
    listingSchema,
  );
  return (
    <section>
      <h2>{admin ? "Account sales queue" : "Your account sales"}</h2>
      {!admin && (
        <>
          <p>
            Send your account details, agree your payout, then let PLAYORA
            prepare the listing.
          </p>
          <Link className="button compact" to="/sell/new">
            Sell an account
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
        }}
      />
      <Action onClick={resource.reload}>Refresh submissions</Action>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Loading private submissions…</p>}
      {!resource.error && resource.data && (
        <>
          <ul className="submission-list">
            {resource.data.items.map((row) => (
              <li key={row.id}>
                <Link
                  to={`${admin ? "/admin/submissions" : "/sell"}/${row.id}?section=${["draft", "needs_information"].includes(row.state) ? "details" : "overview"}`}
                  state={{ submissionListSearch: params.toString() }}
                >
                  {row.title}
                </Link>
                <span>{row.game}</span>
                <strong className="submission-status">
                  {stateLabel(row.state)}
                </strong>
                <time dateTime={row.updated_at}>
                  Updated {new Date(row.updated_at).toLocaleDateString()}
                </time>
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

function DraftStart({
  slug,
  lockGame,
}: {
  slug: string;
  lockGame: (locked: boolean) => void;
}) {
  const resource = useResource(
      `/catalog/games/${encodeURIComponent(slug)}`,
      releaseSchema,
    ),
    [title, setTitle] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [requestKey] = useState(() => crypto.randomUUID()),
    [unknown, setUnknown] = useState(false),
    navigate = useNavigate();
  const lock = useRef(false);
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const validation = useFormValidation(
    issues,
    (name) => {
      setIssues((old) => old.filter((issue) => issue.path !== name));
    },
    undefined,
    !busy && !unknown,
  );
  async function create() {
    if (!resource.data || lock.current) return;
    setError(null);
    const invalid: FieldIssue[] = [];
    if (!title.trim() || Array.from(title).length > 120 || title.includes("\0"))
      invalid.push({
        path: "title",
        message: "Enter an account title of 1–120 characters.",
      });
    setIssues(invalid);
    if (invalid.length) return;
    lock.current = true;
    lockGame(true);
    setBusy(true);
    setError(null);
    try {
      const value = await post(
        "/submissions",
        { request_key: requestKey, slug, release_id: resource.data.id, title },
        submissionSchema,
      );
      void navigate(`/sell/${value.submission.id}?section=details`);
    } catch (cause) {
      setError(cause);
      if (cause instanceof APIError) setIssues([...cause.issues]);
      setUnknown((previous) => previous || uncertain(cause));
      if (!unknown && !uncertain(cause)) lockGame(false);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <FieldValidation value={validation}>
      <section className="catalog-section">
        <ErrorNotice error={resource.error ?? error} hideIssues />
        <Issues issues={issues} />
        {resource.loading && <p role="status">Loading intake form…</p>}
        {!!resource.error && (
          <Action onClick={resource.reload}>Retry account intake</Action>
        )}
        {resource.data && !resource.error && (
          <>
            <h3>
              {resource.data.configuration.intake?.name ??
                "Account intake unavailable"}
            </h3>
            <p>{resource.data.configuration.intake?.description}</p>
            <fieldset disabled={busy || unknown}>
              <legend>Private draft title</legend>
              <Text
                name="title"
                label="Private account title"
                value={title}
                change={setTitle}
                help="A short label for your submission. Do not enter login or recovery information."
              />
            </fieldset>
            {unknown && (
              <p role="status">
                Creation was not confirmed. Keep this page open and retry to
                recover the same submission. Game selection is locked until the
                request is recovered.
              </p>
            )}
            <Action
              disabled={
                busy ||
                resource.loading ||
                resource.data.paused ||
                !resource.data.configuration.intake
              }
              onClick={() => {
                void create();
              }}
            >
              {unknown
                ? "Check the same submission request"
                : "Continue to account details"}
            </Action>
            {resource.data.paused && (
              <p>This game is not accepting new submissions right now.</p>
            )}
          </>
        )}
      </section>
    </FieldValidation>
  );
}
export function NewSubmission() {
  const [gameLocked, setGameLocked] = useState(false);
  const [params] = useSearchParams();
  const requested = params.get("slug") ?? "";
  const [after, setAfter] = useState(""),
    [slug, setSlug] = useState(() =>
      /^[a-z][a-z0-9-]{0,79}$/.test(requested) ? requested : "",
    ),
    resource = useResource(
      `/catalog/games?after=${encodeURIComponent(after)}`,
      gamesSchema,
    );
  return (
    <section>
      <Link to="/sell">← Your account sales</Link>
      <h2>Sell your account</h2>
      <p>
        Choose your game to get started. Your details stay private during
        review.
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
                    disabled={gameLocked}
                    onClick={() => {
                      setSlug(game.slug);
                    }}
                  >
                    Choose {game.name}
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
      {slug && <DraftStart key={slug} slug={slug} lockGame={setGameLocked} />}
    </section>
  );
}

export { default as SubmissionDetail } from "./workspace";
