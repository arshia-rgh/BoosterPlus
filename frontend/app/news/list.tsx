import { ActionFields, requireText } from "../ui/action-fields";
import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavigationType,
  useBlocker,
  useNavigate,
  useSearchParams,
  useNavigationType,
} from "../portal-router";
import { Action, ErrorNotice, Select, Text } from "../catalog/controls";
import { listingSchema } from "../catalog/model";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import { draftSchema, emptyDefinition, kinds, listSchema } from "./model";
import "../shop/shop.css";
import "./news.css";
function CreateArticle({ search }: { search: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section>
      <h2>Create an article</h2>
      <p>
        Choose an existing game, then define its editorial content and
        publication details.
      </p>
      <Action
        disabled={open}
        onClick={() => {
          setOpen(true);
        }}
      >
        New article draft
      </Action>
      {open && (
        <CreateForm
          search={search}
          close={() => {
            setOpen(false);
          }}
        />
      )}
    </section>
  );
}
function CreateForm({ search, close }: { search: string; close: () => void }) {
  const [after, setAfter] = useState(""),
    [game, setGame] = useState(""),
    [title, setTitle] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const resource = useResource(
      `/admin/catalog/games?after=${encodeURIComponent(after)}`,
      listingSchema,
    ),
    navigate = useNavigate(),
    lock = useRef(false);
  const committed = useRef(false),
    prompt = useRef<HTMLElement>(null);
  const [cancel, setCancel] = useState(false);
  const dirty = !!game || !!title;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !committed.current &&
      (dirty || busy) &&
      currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (cancel || blocker.state === "blocked") prompt.current?.focus();
  }, [cancel, blocker.state]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const prevent = (event: BeforeUnloadEvent) => {
      if (!committed.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", prevent);
    return () => {
      window.removeEventListener("beforeunload", prevent);
    };
  }, [dirty, busy]);
  async function create() {
    if (lock.current || resource.loading || resource.error) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      requireText("game_id", game, 1, 100);
      requireText("title", title, 1, 160);
      const row = await post(
        "/admin/news",
        { game_id: game, definition: { ...emptyDefinition, title } },
        draftSchema,
      );
      committed.current = true;
      await navigate(`/admin/news/${row.id}`, {
        state: { newsSearch: search },
      });
    } catch (cause) {
      setError(cause);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <ActionFields error={error} busy={busy}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        {(cancel || blocker.state === "blocked") && (
          <section role="alert" ref={prompt} tabIndex={-1}>
            <h3>Discard this new article?</h3>
            <p>The game choice and title have not been saved.</p>
            <div className="catalog-actions">
              <Action
                onClick={() => {
                  setCancel(false);
                  if (blocker.state === "blocked") blocker.reset();
                }}
              >
                Keep new article
              </Action>
              <Action
                disabled={busy}
                onClick={() => {
                  if (blocker.state === "blocked") blocker.proceed();
                  else close();
                }}
              >
                Discard new article
              </Action>
            </div>
          </section>
        )}
        <Action
          disabled={busy}
          onClick={() => {
            if (dirty) setCancel(true);
            else close();
          }}
        >
          Cancel new article
        </Action>
        <ErrorNotice error={resource.error ?? error} />
        {!!resource.error && (
          <Action onClick={resource.reload}>Retry game choices</Action>
        )}
        <fieldset disabled={busy || resource.loading || !!resource.error}>
          <legend>New private draft</legend>
          <Select
            name="game_id"
            label="Article game"
            value={game}
            change={setGame}
            options={[
              ["", "Choose game"],
              ...(resource.data?.games
                .filter((row) => !row.archived)
                .map((row) => [row.id, row.name] as const) ?? []),
            ]}
          />
          {!!resource.data?.next && (
            <Action
              onClick={() => {
                setAfter(resource.data?.next ?? "");
                setGame("");
              }}
            >
              More games
            </Action>
          )}
          {after && (
            <Action
              onClick={() => {
                setAfter("");
                setGame("");
              }}
            >
              First games
            </Action>
          )}
          <Text
            name="title"
            label="New article title"
            value={title}
            change={setTitle}
          />
          <button type="submit" className="button compact" disabled={busy}>
            {busy ? "Creating draft…" : "Create article draft"}
          </button>
        </fieldset>
      </form>
    </ActionFields>
  );
}

function GameFilter({
  selected,
  change,
}: {
  selected: string;
  change: (value: string) => void;
}) {
  const [after, setAfter] = useState("");
  const resource = useResource(
    `/admin/catalog/games?after=${encodeURIComponent(after)}`,
    listingSchema,
  );
  const current = resource.data?.games.some((game) => game.id === selected);
  return (
    <fieldset className="catalog-item">
      <legend>Filter by game</legend>
      <ErrorNotice error={resource.error} />
      {!!resource.error && (
        <Action onClick={resource.reload}>Retry game filters</Action>
      )}
      <Select
        label="Game filter"
        value={selected}
        change={change}
        disabled={resource.loading || !!resource.error}
        options={[
          ["", "All games"],
          ...(selected && !current
            ? [[selected, "Selected game from another page"] as const]
            : []),
          ...(resource.data?.games.map(
            (game) => [game.id, game.name] as const,
          ) ?? []),
        ]}
      />
      {!!resource.data?.next && (
        <Action
          disabled={resource.loading}
          onClick={() => {
            setAfter(resource.data?.next ?? "");
          }}
        >
          More filter games
        </Action>
      )}
      {after && (
        <Action
          onClick={() => {
            setAfter("");
          }}
        >
          First filter games
        </Action>
      )}
    </fieldset>
  );
}
export function Articles() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [author, setAuthor] = useState(params.get("author") ?? "");
  const navigationType = useNavigationType();
  const [submitted, setSubmitted] = useState<{
    search: string;
    author: string;
  } | null>(null);
  const committedSearch = params.get("q") ?? "";
  const committedAuthor = params.get("author") ?? "";
  const [previousSearch, setPreviousSearch] = useState(committedSearch);
  const [previousAuthor, setPreviousAuthor] = useState(committedAuthor);
  if (previousSearch !== committedSearch) {
    setPreviousSearch(committedSearch);
    if (
      navigationType === NavigationType.Pop ||
      submitted?.search !== committedSearch
    )
      setSearch(committedSearch);
  }
  if (previousAuthor !== committedAuthor) {
    setPreviousAuthor(committedAuthor);
    if (
      navigationType === NavigationType.Pop ||
      submitted?.author !== committedAuthor
    )
      setAuthor(committedAuthor);
  }
  if (previousSearch !== committedSearch || previousAuthor !== committedAuthor)
    setSubmitted(null);
  const query = new URLSearchParams();
  for (const k of ["q", "game", "state", "kind", "author", "after"]) {
    const v = params.get(k);
    if (v) query.set(k, v);
  }
  const r = useResource(`/admin/news?${query.toString()}`, listSchema);
  const update = (k: string, v: string) => {
    const next = new URLSearchParams(query);
    next.delete("after");
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next);
  };
  return (
    <div className="news-editor">
      <p>
        Create game updates, patch notes and guides. Drafts stay private until
        you publish.
      </p>
      <CreateArticle search={query.toString()} />
      <section aria-label="Find articles">
        <h2>Articles</h2>
        <GameFilter
          selected={params.get("game") ?? ""}
          change={(v) => {
            update("game", v);
          }}
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted({ search, author });
            const next = new URLSearchParams(query);
            next.delete("after");
            if (search) next.set("q", search);
            else next.delete("q");
            if (author) next.set("author", author);
            else next.delete("author");
            setParams(next);
          }}
        >
          <Text
            label="Search article title or reference"
            value={search}
            change={setSearch}
          />
          <Text label="Author filter" value={author} change={setAuthor} />
          <button className="button compact" type="submit">
            Search articles
          </button>
        </form>
        <Select
          label="Article state"
          value={params.get("state") ?? ""}
          options={[
            "",
            "draft",
            "scheduled",
            "published",
            "unpublished",
            "archived",
          ].map((v) => [v, v || "Any state"])}
          change={(v) => {
            update("state", v);
          }}
        />
        <Select
          label="Article type filter"
          value={params.get("kind") ?? ""}
          options={[["", "All types"], ...kinds]}
          change={(v) => {
            update("kind", v);
          }}
        />
        <Action
          onClick={() => {
            setSearch("");
            setAuthor("");
            setParams({});
          }}
        >
          Clear article filters
        </Action>
        <ErrorNotice error={r.error} />
        {r.loading && <p role="status">Loading articles…</p>}
        {!!r.error && <Action onClick={r.reload}>Retry articles</Action>}
        {r.data?.items.length === 0 && (
          <p>
            No articles match these filters. Clear the filters or create a
            private draft.
          </p>
        )}
        <div className="news-cards">
          {r.data?.items.map((v) => (
            <article className="news-card" key={v.id}>
              <span className="status">{v.state}</span>
              <h3>{v.title || "Untitled article"}</h3>
              <p>
                {v.game_name} · {v.kind} · {v.author || "Author not set"}
              </p>
              <p className="quiet">Updated {v.updated_at}</p>
              {v.scheduled_at && <p>Scheduled {v.scheduled_at}</p>}
              <Link
                className="button compact"
                to={`/admin/news/${v.id}`}
                state={{ newsSearch: query.toString() }}
              >
                Edit {v.title || "untitled article"}
              </Link>
            </article>
          ))}
        </div>
        {r.data?.next && (
          <Action
            disabled={r.loading}
            onClick={() => {
              const next = new URLSearchParams(query);
              next.set("after", r.data?.next ?? "");
              setParams(next);
            }}
          >
            More articles
          </Action>
        )}
        {params.get("after") && (
          <Action
            onClick={() => {
              update("after", "");
            }}
          >
            First articles
          </Action>
        )}
      </section>
    </div>
  );
}
