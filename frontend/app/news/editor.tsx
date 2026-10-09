import ArtworkUpload from "../artwork/upload";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Link,
  useBlocker,
  useLocation,
  useParams,
  type Location,
} from "../portal-router";
import { z } from "../validation";
import { Action, Check, ErrorNotice, Select, Text } from "../catalog/controls";
import { APIError, post } from "../identity/api";
import { AuthorizedIdentity } from "../identity/frame";
import { sessionEventMatches } from "../identity/portal";
import { useResource } from "../orders/resource";
import { denied } from "../support/chat-state";
import { RecordShell } from "../ui/record-shell";
import {
  draftSchema,
  previewSchema,
  historySchema,
  kinds,
  type Definition,
  type Draft,
} from "./model";
import { BlocksEditor } from "./blocks";
import { type FieldIssue, FieldValidation } from "../ui/form-validation";
import { registerField } from "../shop/validation";
import { ArticleIssues } from "./validation";
import { ArticleContent } from "./content";
import "../orders/admin-workspace.css";
import "../shop/shop.css";
import "./news.css";
export function ArticleEditor() {
  const { id = "" } = useParams();
  return <ArticleSession key={id} id={id} />;
}
function ArticleSession({ id }: { id: string }) {
  const resource = useResource(
      `/admin/news/${encodeURIComponent(id)}`,
      draftSchema,
    ),
    identity = useContext(AuthorizedIdentity);
  const [saved, setSaved] = useState<Draft | null>(null),
    [interrupted, setInterrupted] = useState(false),
    [checking, setChecking] = useState(false);
  const wrong =
    !!identity &&
    (identity.session.portal !== "admin" ||
      !identity.session.user ||
      identity.session.mfa_required ||
      !identity.session.capabilities.includes("admin"));
  const lost = wrong || interrupted || denied(resource.error);
  if (lost && saved) setSaved(null);
  else if (!lost && !checking && resource.data && saved !== resource.data)
    setSaved(resource.data);
  const refresh = resource.reload;
  const reload = useCallback(() => {
    if (lost) setChecking(true);
    setInterrupted(false);
    refresh();
  }, [lost, refresh]);
  useEffect(() => {
    const change = (event: Event) => {
      if (sessionEventMatches(event, "admin")) setInterrupted(true);
    };
    window.addEventListener("boosterplus:session-changed", change);
    return () => {
      window.removeEventListener("boosterplus:session-changed", change);
    };
  }, []);
  if (checking && resource.loading)
    return <p role="status">Checking article access…</p>;
  if (checking && !resource.loading) setChecking(false);
  if (lost)
    return (
      <section role="alert">
        <p>
          Article access changed. Private details and unsaved drafts have been
          cleared.
        </p>
        <Link to="/admin/login">Admin sign-in</Link>
        <Action disabled={resource.loading} onClick={reload}>
          Check article access
        </Action>
      </section>
    );
  const row = resource.data ?? saved;
  return (
    <>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Checking current article…</p>}
      {!!resource.error && (
        <section>
          <p>
            Article details are hidden while the connection is unavailable. Your
            ordinary draft stays in this tab.
          </p>
          <Action disabled={resource.loading} onClick={reload}>
            Retry article
          </Action>
        </section>
      )}
      {row && (
        <Editor
          row={row}
          changed={reload}
          loading={resource.loading}
          suspended={!!resource.error}
          accessLost={() => {
            setInterrupted(true);
          }}
        />
      )}
    </>
  );
}
const sections = [
  { id: "editor", label: "Write" },
  { id: "preview", label: "Preview" },
  { id: "publication", label: "Publication" },
  { id: "history", label: "History" },
];
function Editor({
  row,
  changed,
  loading,
  suspended,
  accessLost,
}: {
  row: Draft;
  changed: () => void;
  loading: boolean;
  suspended: boolean;
  accessLost: () => void;
}) {
  const [value, setValue] = useState(row.definition),
    [saved, setSaved] = useState(row),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [status, setStatus] = useState(""),
    [at, setAt] = useState(""),
    [confirm, setConfirm] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [previewed, setPreviewed] = useState("");
  const [previewIssues, setPreviewIssues] = useState<{
    revision: string;
    issues: FieldIssue[];
  }>({ revision: "", issues: [] });
  const previewReady = useCallback((revision: string, issues: FieldIssue[]) => {
    setPreviewed(issues.length ? "" : revision);
    setPreviewIssues((old) =>
      JSON.stringify(old) === JSON.stringify({ revision, issues })
        ? old
        : { revision, issues },
    );
  }, []);
  const lock = useRef(false),
    alive = useRef(true);
  const location: Location<unknown> = useLocation();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (dirty || busy) && currentLocation.pathname !== nextLocation.pathname,
  );
  const prompt = useRef<HTMLElement>(null);
  useEffect(() => {
    if (blocker.state === "blocked") prompt.current?.focus();
  }, [blocker.state]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!dirty && !busy) return;
    const stop = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", stop);
    return () => {
      window.removeEventListener("beforeunload", stop);
    };
  }, [dirty, busy]);
  const update = (patch: Partial<Definition>) => {
    setValue({ ...value, ...patch, reviewed: patch.reviewed ?? false });
    setDirty(true);
    setConfirm(false);
    setStatus("");
  };
  const stale = row.version !== saved.version;
  async function mutate(action: string) {
    if (lock.current || loading || suspended || stale) return;
    setValidationAttempt((current) => current + 1);
    lock.current = true;
    setBusy(true);
    setError(null);
    setStatus("");
    try {
      const result = await post(
        `/admin/news/${row.id}/${action}`,
        action === "draft"
          ? { version: saved.version, definition: value }
          : {
              version: saved.version,
              revision_id: saved.revision_id,
              at: action === "schedule" && at ? `${at}:00Z` : "",
            },
        draftSchema,
      );
      if (!alive.current) return;
      setSaved(result);
      setValue(result.definition);
      setDirty(false);
      setConfirm(false);
      setStatus(
        action === "draft"
          ? `Saved revision ${String(result.version)}.`
          : `Article ${action} action saved.`,
      );
      changed();
    } catch (cause) {
      if (!alive.current) return;
      if (cause instanceof APIError && cause.code === "article_conflict")
        changed();
      if (denied(cause)) {
        accessLost();
        return;
      }
      setError(cause);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const origin =
    z.object({ newsSearch: z.string().max(2048) }).safeParse(location.state)
      .data?.newsSearch ?? "";
  const issues = [
    ...(error instanceof APIError ? error.issues : []),
    ...(previewIssues.revision === saved.revision_id
      ? previewIssues.issues
      : []),
  ];
  return (
    <div className="news-editor">
      {blocker.state === "blocked" && (
        <section role="alert" tabIndex={-1} ref={prompt}>
          <h2>Leave this article?</h2>
          <p>Unsaved changes will be discarded.</p>
          <Action
            onClick={() => {
              blocker.reset();
            }}
          >
            Keep editing
          </Action>
          <Action
            disabled={busy}
            onClick={() => {
              blocker.proceed();
            }}
          >
            Discard and leave
          </Action>
        </section>
      )}
      <FieldValidation.Provider
        value={{
          issues,
          register: registerField,
          correct: () => {},
        }}
      >
        <div hidden={suspended}>
          <ArticleIssues issues={issues} attempt={validationAttempt} />
          <RecordShell
            id={row.id}
            title="Article"
            workspace="Admin workspace"
            compactReference
            headingLevel={2}
            status={
              <>
                <strong>{value.title || "Untitled draft"}</strong>
                <span>{row.game_name}</span>
                <span>
                  {saved.state} ·{" "}
                  {dirty
                    ? "Unsaved changes"
                    : `Saved revision ${String(saved.version)}`}
                </span>
              </>
            }
            back={{
              to: `/admin/news${origin ? `?${origin}` : ""}`,
              label: "Back to articles",
            }}
            sections={sections}
          >
            {(section) => (
              <>
                <ErrorNotice error={error} />
                {error != null && (
                  <Action disabled={busy || loading} onClick={changed}>
                    Refresh current article
                  </Action>
                )}
                {status && <p role="status">{status}</p>}
                {stale && (
                  <section role="alert">
                    <h3>A newer article version is available</h3>
                    <p>
                      Your working text is preserved below. Review it before
                      replacing it with the current saved revision.
                    </p>
                    <Action
                      disabled={busy || loading}
                      onClick={() => {
                        setValue(row.definition);
                        setSaved(row);
                        setDirty(false);
                        setConfirm(false);
                        setError(null);
                      }}
                    >
                      Discard local edits and load revision {row.version}
                    </Action>
                  </section>
                )}
                {section === "editor" && (
                  <fieldset disabled={busy || loading || stale}>
                    <legend>Working article</legend>
                    <div className="catalog-actions">
                      <Action
                        disabled={!dirty}
                        onClick={() => {
                          void mutate("draft");
                        }}
                      >
                        Save draft
                      </Action>
                    </div>
                    <Text
                      name="title"
                      label="Title"
                      value={value.title}
                      change={(title) => {
                        update({ title });
                      }}
                    />
                    <Text
                      name="slug"
                      label="Article URL slug"
                      help="Changing a published slug keeps its old URL as a same-game redirect."
                      value={value.slug}
                      change={(slug) => {
                        update({ slug });
                      }}
                    />
                    <Select
                      label="Article type"
                      value={value.kind}
                      options={kinds}
                      change={(kind) => {
                        if (
                          kind === "update" ||
                          kind === "patch" ||
                          kind === "guide"
                        )
                          update({ kind });
                      }}
                    />
                    <Text
                      name="summary"
                      label="Summary"
                      multiline
                      value={value.summary}
                      change={(summary) => {
                        update({ summary });
                      }}
                    />
                    <Text
                      name="author"
                      label="Author attribution"
                      value={value.author}
                      change={(author) => {
                        update({ author });
                      }}
                    />
                    <Text
                      name="source"
                      label="Sources and rights"
                      multiline
                      value={value.source}
                      change={(source) => {
                        update({ source });
                      }}
                    />
                    <Text
                      name="source_url"
                      label="Source URL (optional)"
                      value={value.source_url}
                      change={(source_url) => {
                        update({ source_url });
                      }}
                    />
                    <Text
                      name="game_version"
                      label="Game / patch version (optional)"
                      value={value.game_version}
                      change={(game_version) => {
                        update({ game_version });
                      }}
                    />
                    <ArtworkUpload
                      purpose="cover"
                      pathLabel="Hero image path (optional)"
                      value={value.asset}
                      change={(asset) => {
                        update({ asset });
                      }}
                    />
                    <Text
                      name="asset_alt"
                      label="Hero image description"
                      value={value.asset_alt}
                      change={(asset_alt) => {
                        update({ asset_alt });
                      }}
                    />
                    <Text
                      name="asset_source"
                      label="Hero image attribution / rights"
                      value={value.asset_source}
                      change={(asset_source) => {
                        update({ asset_source });
                      }}
                    />
                    <BlocksEditor
                      key={saved.revision_id}
                      value={value.blocks}
                      change={(blocks) => {
                        update({ blocks });
                      }}
                    />
                    <div data-news-field="reviewed" tabIndex={-1}>
                      <Check
                        label="I reviewed accuracy, attribution and all media rights for this revision"
                        value={value.reviewed}
                        change={(reviewed) => {
                          update({ reviewed });
                        }}
                      />
                      {issues
                        .filter((v) => v.path === "reviewed")
                        .map((v) => (
                          <p className="field-error" key={v.path}>
                            {v.message}
                          </p>
                        ))}
                    </div>
                    <Action
                      disabled={!dirty}
                      onClick={() => {
                        void mutate("draft");
                      }}
                    >
                      Save article draft
                    </Action>
                  </fieldset>
                )}
                {section === "preview" && (
                  <>
                    <h3>Private preview · saved revision</h3>
                    <p>
                      This preview does not publish.{" "}
                      {dirty
                        ? "Save your changes to include them in the preview."
                        : "Only administrators can open this preview."}
                    </p>
                    <SavedPreview
                      id={row.id}
                      revision={saved.revision_id}
                      onReady={previewReady}
                    />
                  </>
                )}
                {section === "publication" && (
                  <section className="news-publication">
                    <h3>Publication</h3>
                    <Action disabled={busy || loading} onClick={changed}>
                      Refresh publication state
                    </Action>
                    <Link to="/admin/jobs?kind=news.publish">
                      Review article background tasks
                    </Link>
                    <p>
                      Publish the saved revision after previewing its content.
                      Unpublishing or archiving removes public reading, search
                      and sitemap access. Old URLs only redirect while an
                      article is published.
                    </p>
                    {saved.scheduled_at && (
                      <p role="status">
                        Scheduled for {saved.scheduled_at} · revision{" "}
                        {saved.scheduled_revision.slice(0, 8)}. Later working
                        drafts do not replace this scheduled revision. Job:{" "}
                        {row.schedule_state || "checking"}. If overdue or
                        failed, refresh, review Background tasks, or cancel and
                        schedule again. Publication is confirmed only by the
                        published state.
                      </p>
                    )}
                    <p>
                      {previewed === saved.revision_id
                        ? "Saved revision preview checked; no publication validation issues."
                        : "Open Preview to review this exact saved revision and resolve its publication checklist."}
                    </p>
                    <Link to="?section=preview" state={location.state}>
                      Preview saved revision
                    </Link>
                    <fieldset
                      className="catalog-item"
                      disabled={busy || loading || dirty || stale}
                    >
                      <legend>Saved revision {saved.version}</legend>
                      <Check
                        label="I previewed and approve this exact saved revision and publication change"
                        value={confirm}
                        change={setConfirm}
                      />
                      <div className="catalog-actions">
                        <Action
                          disabled={
                            !confirm ||
                            previewed !== saved.revision_id ||
                            saved.state === "archived"
                          }
                          onClick={() => {
                            void mutate("publish");
                          }}
                        >
                          Publish saved revision now
                        </Action>
                      </div>
                      <Text
                        name="at"
                        label="Publish at · UTC"
                        type="datetime-local"
                        help="Enter UTC, not your local timezone. Scheduling replaces any earlier schedule."
                        value={at}
                        change={setAt}
                      />
                      <Action
                        disabled={
                          !confirm ||
                          !at ||
                          previewed !== saved.revision_id ||
                          saved.state === "archived"
                        }
                        onClick={() => {
                          void mutate("schedule");
                        }}
                      >
                        Schedule saved revision
                      </Action>
                      <div className="catalog-actions">
                        <Action
                          disabled={!confirm || !saved.scheduled_revision}
                          onClick={() => {
                            void mutate("unschedule");
                          }}
                        >
                          Cancel scheduled publication
                        </Action>
                        <Action
                          disabled={
                            !confirm ||
                            (!saved.current_revision &&
                              !saved.scheduled_revision)
                          }
                          onClick={() => {
                            void mutate("unpublish");
                          }}
                        >
                          Unpublish article
                        </Action>
                        <Action
                          disabled={!confirm}
                          onClick={() => {
                            void mutate(
                              saved.state === "archived"
                                ? "restore"
                                : "archive",
                            );
                          }}
                        >
                          {saved.state === "archived"
                            ? "Restore as private draft"
                            : "Archive and remove public article"}
                        </Action>
                      </div>
                    </fieldset>
                    {dirty && (
                      <p>Save your draft before making a publication change.</p>
                    )}
                  </section>
                )}
                {section === "history" && (
                  <ArticleHistory id={row.id} version={saved.version} />
                )}
              </>
            )}
          </RecordShell>
        </div>
      </FieldValidation.Provider>
    </div>
  );
}
function SavedPreview({
  id,
  revision,
  onReady,
}: {
  id: string;
  revision: string;
  onReady?: (revision: string, issues: FieldIssue[]) => void;
}) {
  const r = useResource(
    `/admin/news/${id}/preview?revision=${encodeURIComponent(revision)}`,
    previewSchema,
  );
  useEffect(() => {
    if (r.data && !r.loading && !r.error) onReady?.(revision, r.data.issues);
  }, [r.data, r.loading, r.error, revision, onReady]);
  return (
    <>
      <ErrorNotice error={r.error} />
      {r.loading && <p role="status">Loading saved preview…</p>}
      {!!r.error && <Action onClick={r.reload}>Retry preview</Action>}
      {r.data && (
        <>
          {!onReady && <ArticleIssues issues={r.data.issues} />}
          <ArticleContent value={r.data.definition} />
        </>
      )}
    </>
  );
}
function ArticleHistory({ id, version }: { id: string; version: number }) {
  const [before, setBefore] = useState(0);
  const r = useResource(
    `/admin/news/${id}/history?before=${String(before)}&current=${String(version)}`,
    historySchema,
  );
  const [revision, setRevision] = useState("");
  return (
    <>
      <h3>Revision & publication history</h3>
      <ErrorNotice error={r.error} />
      {r.loading && <p role="status">Loading history…</p>}
      {!!r.error && <Action onClick={r.reload}>Retry history</Action>}
      <ol className="news-history">
        {r.data?.items.map((v) => (
          <li key={v.version}>
            Revision {v.version} · {v.action.replaceAll("_", " ")} · {v.at}
            {v.revision_id && (
              <Action
                onClick={() => {
                  setRevision(v.revision_id);
                }}
              >
                Preview revision from event {v.version}
              </Action>
            )}
          </li>
        ))}
      </ol>
      <div className="catalog-actions">
        {r.data?.next && (
          <Action
            onClick={() => {
              setBefore(r.data?.next ?? 0);
            }}
          >
            Older history
          </Action>
        )}
        {before > 0 && (
          <Action
            onClick={() => {
              setBefore(0);
            }}
          >
            Newest history
          </Action>
        )}
      </div>
      {revision && <SavedPreview id={id} revision={revision} />}
    </>
  );
}
