import "../ui/secondary.css";
import { ActionFields } from "../ui/action-fields";
import { useContext, useEffect, useRef, useState } from "react";
import { Link, useBlocker, useSearchParams } from "../portal-router";
import { z } from "../validation";
import { Action, ErrorNotice, Text, Check } from "../catalog/controls";
import { AuthorizedIdentity } from "../identity/frame";
import { Form } from "../identity/identity";
import { APIError, post } from "../identity/api";
import { useResource } from "../orders/resource";
import { denied } from "../support/chat-state";
import { RecordShell } from "../ui/record-shell";
import { contentSchema, type Content } from "./model";
import { ContentFields, contentData } from "./content-fields";
import { ContentPreview } from "./content-preview";
const historySchema = z.object({
  releases: z.array(contentSchema),
  next: z.string(),
});
const kinds = ["home", "notifications", "legal", "retention"] as const;
const labels = new Map<string, string>([
  ["home", "Homepage"],
  ["notifications", "Activity and availability email copy"],
  ["legal", "Account terms and privacy (owner)"],
  ["retention", "Deletion retention policy (owner)"],
]);
export default function ContentEditor() {
  const owner = useContext(AuthorizedIdentity)?.session.user?.role === "owner";
  const [params, setParams] = useSearchParams();
  const selected = params.get("kind") ?? "home";
  const kind = kinds.find((k) => k === selected) ?? "home";
  return (
    <section>
      <h2>Content and policies</h2>
      <p>
        Draft changes stay private. Legal and retention policies require the
        owner. Publishing requires recent authenticator or email verification.
      </p>
      <label className="catalog-label">
        Editor
        <select
          value={kind}
          onChange={(e) => {
            setParams({ kind: e.target.value, section: "editor" });
          }}
        >
          {kinds
            .filter((k) => owner || !["legal", "retention"].includes(k))
            .map((k) => (
              <option key={k} value={k}>
                {labels.get(k)}
              </option>
            ))}
        </select>
      </label>
      {!owner && ["legal", "retention"].includes(kind) ? (
        <p role="alert">Only the owner can review this policy.</p>
      ) : (
        <ContentSession key={kind} kind={kind} />
      )}
    </section>
  );
}
function ContentSession({ kind }: { kind: string }) {
  const resource = useResource(`/admin/site/${kind}`, contentSchema);
  const [saved, setSaved] = useState<Content | null>(null);
  if (denied(resource.error) && saved) setSaved(null);
  else if (resource.data && saved !== resource.data) setSaved(resource.data);
  if (denied(resource.error))
    return (
      <>
        <ErrorNotice error={resource.error} />
        <Link to="/admin/login">Admin sign-in</Link>
      </>
    );
  return (
    <>
      <ErrorNotice error={resource.error} />
      {!saved ? (
        <>
          <p role="status">
            {resource.loading ? "Loading content…" : "Content is unavailable."}
          </p>
          <Action disabled={resource.loading} onClick={resource.reload}>
            Retry content
          </Action>
        </>
      ) : (
        <ContentWorkspace
          key={kind}
          latest={saved}
          loading={resource.loading}
          offline={!!resource.error}
          reload={resource.reload}
        />
      )}
    </>
  );
}
function ContentWorkspace({
  latest,
  loading,
  offline,
  reload,
}: {
  latest: Content;
  loading: boolean;
  offline: boolean;
  reload: () => void;
}) {
  const [saved, setSaved] = useState(latest),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [formVersion, setFormVersion] = useState(0),
    [previewed, setPreviewed] = useState(0),
    [confirm, setConfirm] = useState(false),
    [label, setLabel] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState<unknown>(null),
    [after, setAfter] = useState("");
  const history = useResource(
    `/admin/site/${saved.kind}/history?after=${encodeURIComponent(after)}`,
    historySchema,
  );
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (dirty || busy) &&
      (currentLocation.pathname !== nextLocation.pathname ||
        new URLSearchParams(currentLocation.search).get("kind") !==
          new URLSearchParams(nextLocation.search).get("kind")),
  );
  const prompt = useRef<HTMLElement>(null);
  useEffect(() => {
    if (blocker.state === "blocked") prompt.current?.focus();
  }, [blocker.state]);
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
  const stale = latest.version !== saved.version;
  async function publish() {
    if (
      dirty ||
      stale ||
      offline ||
      loading ||
      busy ||
      !confirm ||
      previewed !== saved.version ||
      !label.trim()
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const result = await post(
        `/admin/site/${saved.kind}`,
        { version: saved.version, label, data: saved.data, publish: true },
        contentSchema,
      );
      setSaved(result);
      setPreviewed(0);
      setConfirm(false);
      setLabel("");
      setMessage("Reviewed content published.");
      reload();
      history.reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {blocker.state === "blocked" && (
        <section
          role="alert"
          ref={prompt}
          tabIndex={-1}
          className="catalog-section"
        >
          <h3>Keep your content draft?</h3>
          <p>Changing editors or leaving discards unsaved content.</p>
          <div className="catalog-actions">
            <Action
              onClick={() => {
                blocker.reset();
              }}
            >
              Keep editing content
            </Action>
            <Action
              disabled={busy}
              onClick={() => {
                blocker.proceed();
              }}
            >
              Discard content draft and leave
            </Action>
          </div>
        </section>
      )}
      <div hidden={offline} className="secondary-workspace">
        <RecordShell
          id={saved.kind}
          title="Content"
          workspace="Admin workspace"
          headingLevel={2}
          status={
            <p>
              {labels.get(saved.kind)} · Saved revision {saved.version}
              {dirty ? " · Unsaved changes" : ""}
            </p>
          }
          back={{ to: "/admin", label: "Back to operations" }}
          sections={[
            { id: "editor", label: "Write" },
            { id: "preview", label: "Preview & publish" },
            { id: "history", label: "History" },
          ]}
          keepMounted={["editor"]}
        >
          {(active) => (
            <>
              {active === "editor" && (
                <>
                  <div className="catalog-actions">
                    <Action disabled={busy || loading} onClick={reload}>
                      Check current draft
                    </Action>
                    {stale && (
                      <p role="alert">
                        A newer saved revision is available. Your local changes
                        are still here. Review before discarding them.
                      </p>
                    )}
                    {(stale || dirty) && (
                      <Action
                        disabled={busy || loading}
                        onClick={() => {
                          setSaved(latest);
                          setDirty(false);
                          setFormVersion((v) => v + 1);
                          setPreviewed(0);
                          setConfirm(false);
                          setMessage(
                            "Latest saved draft loaded; local changes discarded.",
                          );
                        }}
                      >
                        Discard local changes and load latest draft
                      </Action>
                    )}
                  </div>
                  <div
                    onClickCapture={(event) => {
                      if (
                        event.target instanceof Element &&
                        event.target.closest('button[type="button"]')
                      ) {
                        setDirty(true);
                        setPreviewed(0);
                        setConfirm(false);
                      }
                    }}
                    onChangeCapture={() => {
                      setDirty(true);
                      setPreviewed(0);
                      setConfirm(false);
                      setMessage("");
                    }}
                  >
                    <Form
                      key={formVersion}
                      title="Save private draft"
                      submit={async (data) => {
                        if (busy || loading || offline || stale)
                          throw new APIError(
                            "Check the current draft before saving; your changes remain here.",
                          );
                        setBusy(true);
                        try {
                          const result = await post(
                            `/admin/site/${saved.kind}`,
                            {
                              version: saved.version,
                              label: "",
                              data: contentData(saved.kind, data),
                              publish: false,
                            },
                            contentSchema,
                          );
                          setSaved(result);
                          setDirty(false);
                          setPreviewed(0);
                          setConfirm(false);
                          reload();
                          history.reload();
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <fieldset disabled={busy || loading || stale}>
                        <ContentFields kind={saved.kind} content={saved} />
                      </fieldset>
                    </Form>
                  </div>
                </>
              )}
              {active === "preview" && (
                <>
                  <h3>Review saved revision</h3>
                  {dirty && (
                    <p>
                      Unsaved changes are not in this preview. Return to Write
                      and save them first.
                    </p>
                  )}
                  <ContentPreview content={saved} />
                  <ActionFields error={error} busy={busy}>
                    <ErrorNotice error={error} />
                    <fieldset disabled={dirty || stale || busy || loading}>
                      <legend>Publish this exact saved revision</legend>
                      <Check
                        name="reviewed"
                        label="I reviewed this saved content preview"
                        value={previewed === saved.version}
                        change={(checked) => {
                          setPreviewed(checked ? saved.version : 0);
                          setConfirm(false);
                        }}
                      />
                      <Text
                        name="label"
                        label="Unique published version"
                        value={label}
                        change={(v) => {
                          setLabel(v);
                          setConfirm(false);
                        }}
                        maxLength={64}
                      />
                      <Check
                        name="confirm"
                        label="I reviewed the complete content and approve publication."
                        value={confirm}
                        change={setConfirm}
                      />
                      <Action
                        disabled={
                          !confirm ||
                          previewed !== saved.version ||
                          !label.trim()
                        }
                        onClick={() => {
                          void publish();
                        }}
                      >
                        Publish reviewed content
                      </Action>
                    </fieldset>
                  </ActionFields>
                </>
              )}
              {active === "history" && (
                <>
                  <h3>Published history</h3>
                  <ErrorNotice error={history.error} />
                  <Action disabled={history.loading} onClick={history.reload}>
                    Refresh published history
                  </Action>
                  {history.loading && (
                    <p role="status">Loading published versions…</p>
                  )}
                  {history.data?.releases.length === 0 && (
                    <p>No published versions.</p>
                  )}
                  {history.data?.releases.map((release) => (
                    <details key={release.release_id}>
                      <summary>
                        {release.label} ·{" "}
                        {new Date(release.updated_at).toLocaleString()}
                      </summary>
                      <ContentPreview content={release} />
                    </details>
                  ))}
                  <div className="catalog-actions">
                    <Action
                      disabled={!after}
                      onClick={() => {
                        setAfter("");
                      }}
                    >
                      First history page
                    </Action>
                    <Action
                      disabled={!history.data?.next || history.loading}
                      onClick={() => {
                        setAfter(history.data?.next ?? "");
                      }}
                    >
                      Next history page
                    </Action>
                  </div>
                </>
              )}
            </>
          )}
        </RecordShell>
      </div>
      {offline && (
        <p role="alert">
          Content could not be refreshed. Your ordinary draft is preserved and
          hidden until access can be checked.
        </p>
      )}
      {offline && (
        <Action disabled={loading} onClick={reload}>
          Check content access
        </Action>
      )}
      <ErrorNotice error={error} />
      {message && <p role="status">{message}</p>}
    </>
  );
}
