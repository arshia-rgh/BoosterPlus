import { useEffect, useRef, useState } from "react";
import { Anchor, useSearchParams } from "../portal-router";
import { Action, Check, ErrorNotice, Select, Text } from "../catalog/controls";
import { listingSchema } from "../catalog/model";
import { APIError, post } from "../identity/api";
import { useResource } from "../orders/resource";
import { ActionFields, rejectInvalidFields } from "../ui/action-fields";
import type { FieldIssue } from "../ui/form-validation";
import { z } from "../validation";
import "./wanted-admin.css";

const entrySchema = z.object({
  id: z.string(),
  game_id: z.string(),
  title: z.string(),
  description: z.string(),
  position: z.number().int(),
  visible: z.boolean(),
  version: z.number().int(),
  updated_at: z.string(),
});
const listSchema = z.object({
  game_id: z.string(),
  game_name: z.string(),
  game_slug: z.string(),
  accepting_sales: z.boolean(),
  limit: z.number().int(),
  shown_limit: z.number().int(),
  items: z.array(entrySchema).max(20),
});
const deletedSchema = z.object({ deleted: z.literal(true) });
type Entry = z.infer<typeof entrySchema>;
type List = z.infer<typeof listSchema>;
type Draft = { title: string; description: string; visible: boolean };

export function wantedIssues(draft: Draft): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const title = draft.title.trim();
  if (!title || Array.from(title).length > 80 || /[\r\n]/.test(title))
    issues.push({
      path: "title",
      message: "Enter a title of 1–80 characters.",
    });
  const description = draft.description.trim().replaceAll("\r\n", "\n");
  if (
    Array.from(description).length > 300 ||
    description.split("\n").length > 5
  )
    issues.push({
      path: "description",
      message: "Use up to 300 characters and 4 line breaks.",
    });
  return issues;
}

function conflict(error: unknown) {
  return error instanceof APIError && error.status === 409;
}

function updated(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

function WantedForm({
  legend,
  initial,
  shownFull,
  save,
  cancel,
}: {
  legend: string;
  initial: Draft;
  shownFull: boolean;
  save: (draft: Draft) => Promise<void>;
  cancel: () => void;
}) {
  const [draft, setDraft] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    lock = useRef(false),
    form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    form.current?.querySelector<HTMLInputElement>("input[name=title]")?.focus();
  }, []);
  const showLocked = shownFull && !initial.visible;
  async function submit() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      rejectInvalidFields(wantedIssues(draft));
      await save(draft);
    } catch (cause) {
      setError(cause);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <ActionFields error={conflict(error) ? null : error} busy={busy}>
      <form
        ref={form}
        className="wanted-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <fieldset disabled={busy}>
          <legend>{legend}</legend>
          {!conflict(error) && <ErrorNotice error={error} />}
          <div className="form-grid">
            <Text
              name="title"
              label="Title (required)"
              value={draft.title}
              maxLength={80}
              change={(title) => {
                setDraft((old) => ({ ...old, title }));
              }}
            />
            <Text
              name="description"
              label="Description (optional)"
              multiline
              maxLength={300}
              value={draft.description}
              change={(description) => {
                setDraft((old) => ({ ...old, description }));
              }}
            />
          </div>
          <Check
            name="visible"
            label="Show on the site"
            value={showLocked ? false : draft.visible}
            disabled={showLocked}
            hint={showLocked ? "6 already shown." : undefined}
            change={(visible) => {
              setDraft((old) => ({ ...old, visible }));
            }}
          />
          <div className="form-actions">
            <button type="submit" className="button compact">
              {busy ? "Saving…" : "Save"}
            </button>
            <Action variant="secondary" onClick={cancel}>
              Cancel
            </Action>
          </div>
        </fieldset>
      </form>
    </ActionFields>
  );
}

export function WantedAccountsAdmin() {
  const [params, setParams] = useSearchParams();
  const slug = params.get("game") ?? "";
  const [after, setAfter] = useState("");
  const resource = useResource(
    `/admin/catalog/games?after=${encodeURIComponent(after)}`,
    listingSchema,
  );
  const [known, setKnown] = useState<
    { id: string; slug: string; name: string }[]
  >([]);
  const [page, setPage] = useState<typeof resource.data>(null);
  if (resource.data && page !== resource.data) {
    const data = resource.data;
    setPage(data);
    setKnown((previous) => [
      ...previous,
      ...data.games
        .filter(
          (row) => !row.archived && !previous.some((old) => old.id === row.id),
        )
        .map((row) => ({ id: row.id, slug: row.slug, name: row.name })),
    ]);
  }
  const next = page?.next ?? "";
  const game = known.find((row) => row.slug === slug);
  const first = known[0]?.slug ?? "";
  useEffect(() => {
    if (!slug && first) setParams({ game: first }, { replace: true });
  }, [slug, first, setParams]);
  // A bookmarked game on a later catalog page loads the following pages.
  if (slug && !game && next && page === resource.data && after !== next)
    setAfter(next);
  return (
    <section className="wanted-admin">
      <p>Shown on each game&apos;s Accounts page. Up to 6 per game.</p>
      <ErrorNotice error={resource.error} />
      {!!resource.error && <Action onClick={resource.reload}>Try again</Action>}
      <div className="wanted-game">
        <Select
          label="Game"
          value={game ? slug : ""}
          disabled={!known.length}
          change={(value) => {
            setParams({ game: value });
          }}
          options={[
            ...(game
              ? []
              : [
                  [
                    "",
                    known.length ? "Choose game" : "Loading games…",
                  ] as const,
                ]),
            ...known.map((row) => [row.slug, row.name] as const),
          ]}
        />
        {!!next && !(slug && !game) && (
          <Action
            variant="secondary"
            onClick={() => {
              setAfter(next);
            }}
          >
            More games
          </Action>
        )}
      </div>
      {game ? (
        <Workspace key={game.id} gameID={game.id} />
      ) : (
        slug &&
        !resource.error &&
        (next || !page ? (
          <p role="status">Loading wanted accounts…</p>
        ) : (
          <p>This game is not available.</p>
        ))
      )}
    </section>
  );
}

function Workspace({ gameID }: { gameID: string }) {
  const resource = useResource(
    `/admin/wanted-accounts?game=${encodeURIComponent(gameID)}`,
    listSchema,
  );
  const [source, setSource] = useState<List | null>(null),
    [list, setList] = useState<List | null>(null),
    [editing, setEditing] = useState<string | null>(null),
    [confirming, setConfirming] = useState<string | null>(null),
    [busy, setBusy] = useState<string | null>(null),
    [status, setStatus] = useState(""),
    [stale, setStale] = useState(false),
    [error, setError] = useState<unknown>(null),
    [focus, setFocusTarget] = useState<{ key: string } | null>(null),
    [requestKey, setRequestKey] = useState(() => crypto.randomUUID()),
    [reloading, setReloading] = useState(false);
  if (resource.data && source !== resource.data) {
    setSource(resource.data);
    setList(resource.data);
    setStale(false);
    if (reloading) {
      setReloading(false);
      setStatus("List reloaded.");
      setFocusTarget({ key: editing ? "form-title" : "heading" });
    }
  }
  const root = useRef<HTMLDivElement>(null);
  // A new object each time refocuses even the same control after a change.
  const setFocus = (key: string) => {
    setFocusTarget({ key });
  };
  useEffect(() => {
    if (!focus) return;
    const target =
      root.current?.querySelector<HTMLElement>(
        focus.key === "form-title"
          ? ".wanted-form input[name=title]"
          : `[data-focus="${focus.key}"]`,
      ) ?? root.current?.querySelector<HTMLElement>('[data-focus="heading"]');
    target?.focus();
  }, [focus]);
  if (resource.error)
    return (
      <>
        <ErrorNotice error={resource.error} />
        <Action onClick={resource.reload}>Try again</Action>
      </>
    );
  if (!list) return <p role="status">Loading wanted accounts…</p>;
  const shown = list.items.filter((item) => item.visible).length;
  const full = list.items.length >= list.limit;
  // Keyboard users keep their place: a conflict focuses its recovery action,
  // any other row failure focuses the error notice.
  function stale409() {
    setStale(true);
    setFocus("reload");
  }
  function failed(cause: unknown) {
    if (conflict(cause)) stale409();
    else {
      setError(cause);
      setFocus("error");
    }
  }
  function replace(entry: Entry) {
    setList((old) =>
      old
        ? {
            ...old,
            items: old.items.map((item) =>
              item.id === entry.id ? entry : item,
            ),
          }
        : old,
    );
  }
  async function run(key: string, action: () => Promise<void>) {
    if (busy) return;
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (cause) {
      failed(cause);
    } finally {
      setBusy(null);
    }
  }
  async function create(draft: Draft) {
    if (!list) return;
    const entry = await post(
      "/admin/wanted-accounts",
      {
        request_key: requestKey,
        game_id: list.game_id,
        title: draft.title,
        description: draft.description,
        visible: draft.visible,
      },
      entrySchema,
    ).catch((cause: unknown) => {
      if (conflict(cause)) stale409();
      throw cause;
    });
    setRequestKey(crypto.randomUUID());
    setList((old) =>
      old && !old.items.some((item) => item.id === entry.id)
        ? { ...old, items: [...old.items, entry] }
        : old,
    );
    setEditing(null);
    setStatus("Saved.");
    setFocus(`title:${entry.id}`);
  }
  async function update(entry: Entry, draft: Draft) {
    const saved = await post(
      `/admin/wanted-accounts/${entry.id}`,
      { version: entry.version, ...draft },
      entrySchema,
    ).catch((cause: unknown) => {
      if (conflict(cause)) stale409();
      throw cause;
    });
    replace(saved);
    setEditing(null);
    setStatus("Saved.");
    setFocus(`title:${saved.id}`);
  }
  return (
    <div className="wanted-workspace" ref={root}>
      <h2 data-focus="heading" tabIndex={-1}>
        {list.game_name}
      </h2>
      {!list.accepting_sales && (
        <p className="wanted-closed" role="note">
          Not shown on the site: this game isn&apos;t accepting account sales.
        </p>
      )}
      <p className="wanted-summary">
        <span>
          {shown} of {list.shown_limit} shown
        </span>
        <Anchor
          href={`/games/${encodeURIComponent(list.game_slug)}/accounts#wanted-accounts`}
          target="_blank"
          rel="noreferrer"
        >
          View on site ↗<span className="sr-only"> (opens in a new tab)</span>
        </Anchor>
      </p>
      <p className="wanted-live" role="status" aria-live="polite">
        {status}
      </p>
      {stale && (
        <div className="wanted-stale" role="alert">
          <p>This list changed in another session.</p>
          <button
            type="button"
            className="button compact"
            data-focus="reload"
            onClick={() => {
              setStatus("");
              setReloading(true);
              resource.reload();
            }}
          >
            Reload list
          </button>
        </div>
      )}
      {!!error && (
        <div data-focus="error" tabIndex={-1} className="wanted-error">
          <ErrorNotice error={error} />
        </div>
      )}
      {editing === "new" ? (
        <div className="wanted-new">
          <WantedForm
            legend="Add wanted account"
            initial={{ title: "", description: "", visible: shown < 6 }}
            shownFull={shown >= list.shown_limit}
            save={create}
            cancel={() => {
              setEditing(null);
              setFocus("add");
            }}
          />
        </div>
      ) : (
        <div className="wanted-add">
          <button
            type="button"
            className="button compact"
            data-focus="add"
            disabled={full || !!editing}
            onClick={() => {
              setStatus("");
              setConfirming(null);
              setEditing("new");
            }}
          >
            Add wanted account
          </button>
          {full && <p>Up to 20 per game. Delete one to add another.</p>}
        </div>
      )}
      {!list.items.length && editing !== "new" && (
        <p>No wanted accounts for {list.game_name} yet.</p>
      )}
      {list.items.length > 0 && (
        <ol className="wanted-admin-list" aria-label="Wanted accounts in order">
          {list.items.map((entry, index) => {
            const last = index === list.items.length - 1;
            const working = busy !== null;
            const moveTo = async (direction: "up" | "down") => {
              const moved = await post(
                `/admin/wanted-accounts/${entry.id}/move`,
                { version: entry.version, direction },
                listSchema,
              );
              setList(moved);
              const position = moved.items.findIndex(
                (item) => item.id === entry.id,
              );
              const atEdge =
                (direction === "up" && position === 0) ||
                (direction === "down" && position === moved.items.length - 1);
              setFocus(
                `${atEdge ? (direction === "up" ? "down" : "up") : direction}:${entry.id}`,
              );
              setStatus(
                `Moved to position ${String(position + 1)} of ${String(moved.items.length)}.`,
              );
            };
            if (editing === entry.id)
              return (
                <li key={entry.id} className="wanted-row is-editing">
                  <WantedForm
                    legend="Edit wanted account"
                    initial={{
                      title: entry.title,
                      description: entry.description,
                      visible: entry.visible,
                    }}
                    shownFull={shown >= list.shown_limit}
                    save={(draft) => update(entry, draft)}
                    cancel={() => {
                      setEditing(null);
                      setFocus(`title:${entry.id}`);
                    }}
                  />
                </li>
              );
            return (
              <li
                key={entry.id}
                className="wanted-row"
                data-state={entry.visible ? "shown" : "hidden"}
              >
                <div className="wanted-row-text">
                  <p className="wanted-row-heading">
                    <strong data-focus={`title:${entry.id}`} tabIndex={-1}>
                      {entry.title}
                    </strong>
                    <span
                      className="wanted-chip"
                      data-state={entry.visible ? "shown" : "hidden"}
                    >
                      {entry.visible ? "Shown" : "Hidden"}
                    </span>
                  </p>
                  {entry.description && (
                    <p className="wanted-row-description">
                      {entry.description}
                    </p>
                  )}
                  {updated(entry.updated_at) && (
                    <p className="wanted-row-date">
                      Updated {updated(entry.updated_at)}
                    </p>
                  )}
                </div>
                {confirming === entry.id ? (
                  <div
                    className="wanted-confirm"
                    role="group"
                    aria-label="Confirm delete"
                  >
                    <p>Delete “{entry.title}”? This can&apos;t be undone.</p>
                    <div className="form-actions">
                      <button
                        type="button"
                        className="button compact"
                        data-variant="destructive"
                        disabled={working}
                        onClick={() => {
                          void run(`delete:${entry.id}`, async () => {
                            await post(
                              `/admin/wanted-accounts/${entry.id}/delete`,
                              { version: entry.version },
                              deletedSchema,
                            );
                            const next =
                              list.items[index + 1] ?? list.items[index - 1];
                            setList((old) =>
                              old
                                ? {
                                    ...old,
                                    items: old.items.filter(
                                      (item) => item.id !== entry.id,
                                    ),
                                  }
                                : old,
                            );
                            setConfirming(null);
                            setStatus("Deleted.");
                            setFocus(next ? `title:${next.id}` : "heading");
                          });
                        }}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        className="button compact secondary"
                        data-focus={`keep:${entry.id}`}
                        onClick={() => {
                          setConfirming(null);
                          setFocus(`delete:${entry.id}`);
                        }}
                      >
                        Keep
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="wanted-row-actions">
                    <button
                      type="button"
                      className="button compact secondary"
                      data-focus={`up:${entry.id}`}
                      aria-label={`Move up: ${entry.title}`}
                      disabled={index === 0 || working || !!editing}
                      onClick={() => {
                        void run(`up:${entry.id}`, () => moveTo("up"));
                      }}
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      className="button compact secondary"
                      data-focus={`down:${entry.id}`}
                      aria-label={`Move down: ${entry.title}`}
                      disabled={last || working || !!editing}
                      onClick={() => {
                        void run(`down:${entry.id}`, () => moveTo("down"));
                      }}
                    >
                      Move down
                    </button>
                    <button
                      type="button"
                      className="button compact secondary"
                      aria-label={`Edit: ${entry.title}`}
                      disabled={working || !!editing}
                      onClick={() => {
                        setStatus("");
                        setConfirming(null);
                        setEditing(entry.id);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="button compact secondary wanted-visibility"
                      data-focus={`visible:${entry.id}`}
                      aria-label={`${entry.visible ? "Hide" : "Show"}: ${entry.title}`}
                      disabled={
                        working ||
                        !!editing ||
                        (!entry.visible && shown >= list.shown_limit)
                      }
                      onClick={() => {
                        void run(`visible:${entry.id}`, async () => {
                          const saved = await post(
                            `/admin/wanted-accounts/${entry.id}`,
                            {
                              version: entry.version,
                              title: entry.title,
                              description: entry.description,
                              visible: !entry.visible,
                            },
                            entrySchema,
                          );
                          replace(saved);
                          setStatus(saved.visible ? "Shown." : "Hidden.");
                          setFocus(`visible:${entry.id}`);
                        });
                      }}
                    >
                      {entry.visible ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      className="button compact secondary"
                      data-focus={`delete:${entry.id}`}
                      aria-label={`Delete: ${entry.title}`}
                      disabled={working || !!editing}
                      onClick={() => {
                        setStatus("");
                        setConfirming(entry.id);
                        setFocus(`keep:${entry.id}`);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
