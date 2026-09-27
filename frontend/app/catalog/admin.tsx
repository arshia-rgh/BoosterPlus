import { PricingEditor } from "./pricing-editor";
import "./admin-workspace.css";
import { useResource } from "../orders/resource";
import DiscoveryEditor from "./discovery-editor";
import HeroLayoutEditor from "./hero-layout-editor";
import { useEffect, useRef, useState } from "react";
import { Link, useBlocker, useSearchParams } from "react-router";
import { z } from "../validation";
import { get, post } from "../identity/api";
import {
  Action,
  Check,
  ErrorNotice,
  Issues,
  Ordering,
  Select,
  Text,
  move,
} from "./controls";
import {
  PackagesEditor,
  ReferencesEditor,
  ServicesEditor,
} from "./editor-parts";
import DynamicForm from "./dynamic-form";
import IntakeEditor from "./intake-editor";
import ReviewPolicyEditor from "./review-policy-editor";
import {
  draftSchema,
  emptyConfiguration,
  historySchema,
  listingSchema,
  previewSchema,
  price,
  type Configuration,
  type Draft,
  type Release,
  type Issue,
} from "./model";

function Preview({ draft, issues }: { draft: Draft; issues: Issue[] }) {
  const [serviceKey, setServiceKey] = useState(
      draft.configuration.services[0]?.key ?? "",
    ),
    [stage, setStage] = useState("estimate");
  const service = draft.configuration.services.find(
    (s) => s.key === serviceKey,
  );
  return (
    <section className="catalog-preview">
      <h2>Saved draft preview</h2>
      <p>
        This preview is private. Publication checks use this saved revision.
      </p>
      <Issues issues={issues} />
      {issues.length === 0 && <p role="status">Publication checks passed.</p>}
      <h3>{draft.configuration.name}</h3>
      <p>{draft.configuration.description}</p>
      <Select
        label="Preview service"
        value={serviceKey}
        change={setServiceKey}
        options={draft.configuration.services.map((s) => [s.key, s.name])}
      />
      <Select
        label="Preview collection stage"
        value={stage}
        change={setStage}
        options={[
          ["estimate", "Estimate"],
          ["order", "Order submission"],
          ["fulfillment", "After payment"],
        ]}
      />
      {service && (
        <DynamicForm
          key={String(draft.revision) + service.key + stage}
          config={draft.configuration}
          service={service}
          releaseID={String(draft.revision)}
          slug={draft.slug}
          stage={stage}
          previewPath={`/admin/catalog/games/${draft.id}/validate-preview`}
        />
      )}
      <h3>Package preview</h3>
      {draft.configuration.packages.map((pack) => (
        <article key={pack.key}>
          <h4>{pack.name}</h4>
          <p>{pack.description}</p>
          <ul>
            {pack.variants.map((variant) => (
              <li key={variant.key}>
                {variant.name} · {price(variant)} · {variant.delivery_min_hours}
                –{variant.delivery_max_hours} hours
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
function History({ entries, more }: { entries: Release[]; more: () => void }) {
  return (
    <section>
      <h2>Published history</h2>
      <p>
        These snapshots remain available after edits or archiving. They cannot
        be overwritten.
      </p>
      {entries.length === 0 && <p>No published versions.</p>}
      {entries.map((release) => (
        <details key={release.id} className="catalog-section">
          <summary>
            Release {release.version} · {release.created_at}
          </summary>
          <p>
            {release.configuration.name} ·{" "}
            {release.configuration.services.length} services ·{" "}
            {release.configuration.packages.length} packages
          </p>
          <pre className="catalog-json">
            {JSON.stringify(release.configuration, null, 2)}
          </pre>
        </details>
      ))}
      {entries.length > 0 && entries.length % 20 === 0 && (
        <Action onClick={more}>Earlier releases</Action>
      )}
    </section>
  );
}
function Editor({
  id,
  onBack,
  onSaved,
}: {
  id: string;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [status, setStatus] = useState(""),
    [preview, setPreview] = useState<{ draft: Draft; issues: Issue[] } | null>(
      null,
    ),
    [history, setHistory] = useState<Release[] | null>(null),
    [deleteConfirmed, setDeleteConfirmed] = useState(false),
    [reload, setReload] = useState(0);
  const [params, setParams] = useSearchParams();
  const tabs = [
    ["catalog-basics", "Game & ranks"],
    ["catalog-intake", "Seller intake"],
    ["catalog-services", "Boosting forms"],
    ["catalog-pricing", "Price estimation"],
    ["catalog-packages", "Packages"],
    ["catalog-faq", "FAQ"],
    ["catalog-publish", "Review & publish"],
  ] as const;
  const section =
    tabs.find(([key]) => key === params.get("section"))?.[0] ??
    "catalog-basics";
  const choose = (section: string) => {
    const next = new URLSearchParams(params);
    next.set("section", section);
    setParams(next, { preventScrollReset: true });
  };
  useEffect(() => {
    document.getElementById(section)?.focus({ preventScroll: true });
  }, [section]);
  const generation = useRef(0);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (dirty || busy) &&
      (nextLocation.pathname !== currentLocation.pathname ||
        new URLSearchParams(nextLocation.search).get("game") !== id),
  );
  useEffect(() => {
    if (!dirty && !busy) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", prevent);
    return () => {
      window.removeEventListener("beforeunload", prevent);
    };
  }, [dirty, busy]);

  useEffect(() => {
    let active = true;
    void get(`/admin/catalog/games/${encodeURIComponent(id)}`, draftSchema)
      .then((value) => {
        if (active) {
          setDraft(value);
          setError(null);
          setDirty(false);
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause);
      });
    return () => {
      active = false;
    };
  }, [id, reload]);
  const update = (patch: Partial<Configuration>) => {
    setDraft((value) =>
      value
        ? {
            ...value,
            configuration: {
              ...value.configuration,
              ...patch,
              reviewed: patch.reviewed ?? false,
            },
          }
        : value,
    );
    setDirty(true);
    setPreview(null);
    setStatus("");
  };
  async function run(action: string) {
    if (!draft) return;
    const requestGeneration = ++generation.current;
    setBusy(true);
    setError(null);
    setStatus("");
    try {
      const path = `/admin/catalog/games/${encodeURIComponent(id)}`;
      if (action === "preview") {
        setPreview(await get(path + "/preview", previewSchema));
        choose("catalog-publish");
      } else if (action === "history" || action === "more-history") {
        const before =
          action === "more-history" ? history?.at(-1)?.version : undefined;
        const result = await get(
          path + "/history" + (before ? `?before=${String(before)}` : ""),
          historySchema,
        );
        setHistory((current) =>
          action === "more-history"
            ? [...(current ?? []), ...result.releases]
            : result.releases,
        );
      } else if (action === "delete") {
        await post(
          path + "/delete",
          { revision: draft.revision, configuration: draft.configuration },
          z.null(),
        );
        onSaved();
        onBack();
      } else {
        const result = await post(
          path + "/" + action,
          { revision: draft.revision, configuration: draft.configuration },
          draftSchema,
        );
        if (requestGeneration === generation.current) {
          setDraft(result);
          setDirty(false);
          setPreview(null);
          setHistory(null);
          setStatus(
            action === "publish" ? "Catalog published." : "Changes saved.",
          );
          onSaved();
        }
      }
    } catch (cause) {
      setError(cause);
    } finally {
      if (requestGeneration === generation.current) setBusy(false);
    }
  }
  return (
    <section className="catalog-editor">
      {blocker.state === "blocked" && (
        <div className="catalog-issues" role="alert">
          <p>
            {busy
              ? "Wait for the current action to finish before leaving."
              : "You have unsaved catalog edits."}
          </p>
          <Action
            onClick={() => {
              blocker.reset();
            }}
          >
            Stay in editor
          </Action>
          <Action
            disabled={busy}
            onClick={() => {
              blocker.proceed();
            }}
          >
            Discard edits and leave
          </Action>
        </div>
      )}

      <Action onClick={onBack} disabled={busy || dirty}>
        ← All catalog drafts
      </Action>
      <ErrorNotice error={error} />
      {!draft ? (
        <>
          {!error && <p role="status">Loading draft…</p>}
          <Action
            onClick={() => {
              setReload((v) => v + 1);
            }}
          >
            Retry draft
          </Action>
        </>
      ) : (
        <>
          <div className="catalog-heading">
            <div>
              <h2>{draft.configuration.name}</h2>
              <p className="quiet">
                /{draft.slug} · draft revision {draft.revision} ·{" "}
                {draft.archived
                  ? "Archived"
                  : draft.published
                    ? "Published"
                    : "Unpublished"}
                {draft.paused ? " · Ordering paused" : ""}
              </p>
            </div>
            <p>Admin catalog workspace · private draft</p>
          </div>
          <p className="quiet">
            {dirty
              ? "Unsaved changes. Save your draft or discard edits before leaving this editor."
              : "Draft saved. Editing does not change published offerings."}
          </p>
          <nav
            className="admin-view-nav catalog-section-nav"
            aria-label="Catalog sections"
          >
            {tabs.map(([target, label]) => (
              <Link
                key={target}
                to={`?${new URLSearchParams({ ...Object.fromEntries(params), section: target }).toString()}`}
                preventScrollReset
                aria-current={section === target ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="catalog-save-bar">
            <span role="status">
              {dirty ? "Unsaved draft changes" : "Draft saved"}
            </span>
            <Action disabled={busy} onClick={() => void run("save")}>
              Save changes
            </Action>
            <Action
              disabled={busy || dirty}
              onClick={() => void run("preview")}
            >
              Preview saved changes
            </Action>
          </div>
          <fieldset disabled={busy} className="catalog-editor-fields">
            <legend>Catalog configuration</legend>
            <section
              id="catalog-basics"
              hidden={section !== "catalog-basics"}
              tabIndex={-1}
              className="catalog-edit-section"
              aria-label="Game and rank references"
            >
              <h3>Game and rank references</h3>
              <div className="catalog-grid">
                <Text
                  label="Game name"
                  value={draft.configuration.name}
                  change={(name) => {
                    update({ name });
                  }}
                />
                <Text
                  label="Public asset path"
                  value={draft.configuration.asset}
                  change={(asset) => {
                    update({ asset });
                  }}
                  help="Approved files under /catalog-assets/ only. Add public media to frontend/public/catalog-assets before publishing."
                />
                <Text
                  label="Image alternative text"
                  value={draft.configuration.asset_alt}
                  change={(asset_alt) => {
                    update({ asset_alt });
                  }}
                />
              </div>
              <Text
                label="Game description"
                multiline
                value={draft.configuration.description}
                change={(description) => {
                  update({ description });
                }}
              />
              <DiscoveryEditor
                config={draft.configuration}
                slug={draft.slug}
                change={(discovery) => {
                  update({ discovery });
                }}
              />
              <HeroLayoutEditor
                config={draft.configuration}
                change={(hero_layout) => {
                  update({ hero_layout });
                }}
              />
              <ReferencesEditor
                value={draft.configuration.references}
                change={(references) => {
                  update({ references });
                }}
              />
            </section>
            <section
              id="catalog-intake"
              hidden={section !== "catalog-intake"}
              tabIndex={-1}
              className="catalog-edit-section"
              aria-label="Seller intake and review policy"
            >
              <h3>Seller intake and review policy</h3>
              <IntakeEditor
                config={draft.configuration}
                change={(intake) => {
                  update({ intake });
                }}
              />
              <ReviewPolicyEditor
                config={draft.configuration}
                change={(review_policy) => {
                  update({ review_policy });
                }}
              />
            </section>
            <section
              id="catalog-services"
              hidden={section !== "catalog-services"}
              tabIndex={-1}
              className="catalog-edit-section"
              aria-label="Boosting form editor"
            >
              <ServicesEditor
                showPricing={false}
                config={draft.configuration}
                change={(services) => {
                  update({ services });
                }}
              />
            </section>
            <section
              id="catalog-pricing"
              hidden={section !== "catalog-pricing"}
              tabIndex={-1}
              className="catalog-edit-section"
              aria-label="Price estimation rules"
            >
              <h2>Price estimation rules</h2>
              <p>
                Estimates are provisional. Customers accept a staff quote for
                custom services; package prices use their own configured
                variants.
              </p>
              {draft.configuration.services.length === 0 && (
                <p>
                  Add a service in Boosting forms before configuring its
                  estimate.
                </p>
              )}
              {draft.configuration.services.map((service, index) => (
                <details key={service.key} className="catalog-section">
                  <summary>
                    {service.name} · {service.key}
                  </summary>
                  <PricingEditor
                    service={service}
                    config={draft.configuration}
                    change={(patch) => {
                      update({
                        services: draft.configuration.services.map(
                          (current, i) =>
                            i === index ? { ...current, ...patch } : current,
                        ),
                      });
                    }}
                  />
                </details>
              ))}
            </section>
            <section
              id="catalog-packages"
              hidden={section !== "catalog-packages"}
              tabIndex={-1}
              className="catalog-edit-section"
              aria-label="Fixed packages editor"
            >
              <PackagesEditor
                config={draft.configuration}
                change={(packages) => {
                  update({ packages });
                }}
              />
            </section>
            <section
              id="catalog-faq"
              hidden={section !== "catalog-faq"}
              tabIndex={-1}
              className="catalog-edit-section"
            >
              <h2>Frequently asked questions</h2>
              {draft.configuration.faqs.map((faq, i) => (
                <fieldset className="catalog-item" key={i}>
                  <legend>FAQ {i + 1}</legend>
                  <Text
                    label="Question"
                    value={faq.question}
                    change={(question) => {
                      update({
                        faqs: draft.configuration.faqs.map((value, index) =>
                          index === i ? { ...value, question } : value,
                        ),
                      });
                    }}
                  />
                  <Text
                    label="Answer"
                    multiline
                    value={faq.answer}
                    change={(answer) => {
                      update({
                        faqs: draft.configuration.faqs.map((value, index) =>
                          index === i ? { ...value, answer } : value,
                        ),
                      });
                    }}
                  />
                  <Ordering
                    index={i}
                    count={draft.configuration.faqs.length}
                    change={(direction) => {
                      update({
                        faqs: move(draft.configuration.faqs, i, direction),
                      });
                    }}
                    remove={() => {
                      update({
                        faqs: draft.configuration.faqs.filter(
                          (_, index) => index !== i,
                        ),
                      });
                    }}
                  />
                </fieldset>
              ))}
              <Action
                disabled={draft.configuration.faqs.length >= 20}
                onClick={() => {
                  update({
                    faqs: [
                      ...draft.configuration.faqs,
                      { question: "New question", answer: "" },
                    ],
                  });
                }}
              >
                Add FAQ
              </Action>
            </section>
            <section
              id="catalog-publish"
              hidden={section !== "catalog-publish"}
              tabIndex={-1}
              className="catalog-publication catalog-edit-section"
            >
              <h2>Review and publication</h2>
              <Check
                label="I verified the actual rank/option data, availability, prices and customer promises, including any win-rate terms."
                value={draft.configuration.reviewed}
                change={(reviewed) => {
                  update({ reviewed });
                }}
              />
              <p>
                Publishing requires recent email/Google verification and an
                authenticator check. Use Profile and security if asked to verify
                again.
              </p>
              <div className="catalog-actions">
                <Action onClick={() => void run("save")}>Save draft</Action>
                <Action
                  disabled={!dirty}
                  onClick={() => {
                    setReload((v) => v + 1);
                    setPreview(null);
                    setStatus("");
                  }}
                >
                  Discard unsaved edits
                </Action>
                <Action disabled={dirty} onClick={() => void run("preview")}>
                  Preview saved draft
                </Action>
                <Action
                  disabled={
                    dirty ||
                    draft.archived ||
                    !draft.configuration.reviewed ||
                    !preview ||
                    preview.draft.revision !== draft.revision ||
                    preview.issues.length > 0
                  }
                  onClick={() => void run("publish")}
                >
                  Publish catalog
                </Action>
                <Action disabled={dirty} onClick={() => void run("history")}>
                  View release history
                </Action>
              </div>
              {status && <p role="status">{status}</p>}
              <div className="catalog-actions">
                <Action
                  disabled={dirty || draft.archived}
                  onClick={() => void run(draft.paused ? "resume" : "pause")}
                >
                  {draft.paused ? "Resume ordering" : "Pause ordering"}
                </Action>
                <Action
                  disabled={dirty}
                  onClick={() =>
                    void run(draft.archived ? "restore" : "archive")
                  }
                >
                  {draft.archived ? "Restore as paused" : "Archive game"}
                </Action>
              </div>
              {!draft.current_release && (
                <>
                  <Check
                    label="Delete this unpublished draft permanently"
                    value={deleteConfirmed}
                    change={setDeleteConfirmed}
                  />
                  <Action
                    disabled={!deleteConfirmed || dirty}
                    onClick={() => void run("delete")}
                  >
                    Delete unpublished draft
                  </Action>
                </>
              )}
            </section>
          </fieldset>
          {section === "catalog-publish" && preview && (
            <Preview
              key={preview.draft.revision}
              draft={preview.draft}
              issues={preview.issues}
            />
          )}{" "}
          {section === "catalog-publish" && history && (
            <History entries={history} more={() => void run("more-history")} />
          )}
        </>
      )}
    </section>
  );
}
export default function CatalogAdmin() {
  const [params, setParams] = useSearchParams();
  const selected = params.get("game") ?? "";
  const setSelected = (game: string) => {
    const next = new URLSearchParams(params);
    if (game) next.set("game", game);
    else next.delete("game");
    next.delete("section");
    setParams(next);
  };
  const [name, setName] = useState(""),
    [slug, setSlug] = useState(""),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const query = new URLSearchParams({
    search: params.get("search") ?? "",
    state: params.get("state") ?? "",
    after: params.get("after") ?? "",
  });
  const resource = useResource(
    `/admin/catalog/games?${query.toString()}`,
    listingSchema,
  );
  const listing = resource.data;
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [state, setState] = useState(params.get("state") ?? "");
  const filters = JSON.stringify([params.get("search"), params.get("state")]);
  const [previous, setPrevious] = useState(filters);
  if (previous !== filters) {
    setPrevious(filters);
    setSearch(params.get("search") ?? "");
    setState(params.get("state") ?? "");
  }
  async function create() {
    setBusy(true);
    setError(null);
    try {
      const draft = await post(
        "/admin/catalog/games",
        { slug, configuration: emptyConfiguration(name) },
        draftSchema,
      );
      setSelected(draft.id);
      setName("");
      setSlug("");
      resource.reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  if (selected)
    return (
      <Editor
        key={selected}
        id={selected}
        onBack={() => {
          setSelected("");
        }}
        onSaved={() => {
          resource.reload();
        }}
      />
    );
  return (
    <section className="catalog-admin">
      <ErrorNotice error={error ?? resource.error} />
      <form
        className="orders-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setParams({ search, state });
        }}
      >
        <Text
          label="Search catalog name or slug"
          value={search}
          change={setSearch}
        />
        <Select
          label="Catalog state"
          value={state}
          change={setState}
          options={[
            ["", "All states"],
            ["draft", "Draft"],
            ["published", "Published"],
            ["paused", "Paused"],
            ["archived", "Archived"],
          ]}
        />
        <button type="submit" className="button">
          Filter catalogs
        </button>
      </form>
      <Action
        onClick={() => {
          resource.reload();
        }}
        disabled={busy}
      >
        Reload catalogs
      </Action>
      {!listing ? (
        <p role="status">
          {resource.error
            ? "Catalog unavailable. Retry loading drafts."
            : "Loading catalog drafts…"}
        </p>
      ) : (
        <div className="catalog-cards">
          {!listing.games.length && (
            <p>No catalog drafts match these filters.</p>
          )}
          {listing.games.map((game) => (
            <article className="game-card" key={game.id}>
              <h2>{game.name}</h2>
              <p className="quiet">{game.slug}</p>
              <p>
                {game.archived
                  ? "Archived"
                  : game.published
                    ? "Published"
                    : "Draft"}{" "}
                · revision {game.revision}
              </p>
              <Action
                onClick={() => {
                  setSelected(game.id);
                }}
              >
                Edit {game.name}
              </Action>
            </article>
          ))}
        </div>
      )}
      {params.get("after") && (
        <Link
          to={`?${new URLSearchParams({ ...Object.fromEntries(query), after: "" }).toString()}`}
        >
          First catalog page
        </Link>
      )}
      {listing?.next && (
        <Link
          to={`?${new URLSearchParams({ ...Object.fromEntries(query), after: listing.next }).toString()}`}
        >
          More drafts
        </Link>
      )}
      <form
        className="catalog-create"
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        <fieldset disabled={busy}>
          <legend>Create a game draft</legend>
          <div className="catalog-grid">
            <Text label="New game name" value={name} change={setName} />
            <Text
              label="New game slug"
              value={slug}
              change={setSlug}
              help="Permanent lowercase URL slug; letters, numbers and hyphens."
            />
          </div>
          <button className="button" type="submit">
            Create draft
          </button>
        </fieldset>
      </form>
    </section>
  );
}
