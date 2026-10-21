import { PurchasingControl } from "./purchasing";
import { PrepareListing } from "./prepare";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link } from "../portal-router";
import { Action, ErrorNotice, Select, Text } from "../catalog/controls";
import { get, post } from "../identity/api";
import { AuthorizedIdentity } from "../identity/frame";
import { sessionEventMatches } from "../identity/portal";
import { useResource } from "../orders/resource";
import { denied } from "../support/chat-state";
import { ActionFields, rejectInvalidFields } from "../ui/action-fields";
import { Feedback } from "../ui/feedback";
import { Loading } from "../ui/loading";
import { RecordDraftBoundary, useRecordDraft } from "../ui/record-drafts";
import { OfferEditor } from "./editor";
import { SupplierErrorNotice } from "./feedback";
import {
  centsText,
  connectionSchema,
  connections,
  connectionsSchema,
  deliveryLabels,
  importSchema,
  librarySchema,
  markupBPS,
  type Connection,
  type Import,
  type Offer,
  type Product,
} from "./model";
import "./suppliers.css";

export function SupplierLibrary() {
  const identity = useContext(AuthorizedIdentity),
    [lost, setLost] = useState(false);
  const accessLost = useCallback(() => {
    setLost(true);
  }, []);
  useEffect(() => {
    const changed = (event: Event) => {
      if (sessionEventMatches(event, "admin")) setLost(true);
    };
    window.addEventListener("boosterplus:session-changed", changed);
    return () => {
      window.removeEventListener("boosterplus:session-changed", changed);
    };
  }, []);
  const wrong =
    identity &&
    (identity.session.portal !== "admin" ||
      !identity.session.user ||
      identity.session.mfa_required ||
      !identity.session.capabilities.includes("admin"));
  if (lost || wrong)
    return (
      <section role="alert">
        <h2>Admin access changed</h2>
        <p>
          Private supplier details and drafts have been cleared. Sign in again
          to continue.
        </p>
        <Link className="button" to="/admin/login">
          Admin sign-in
        </Link>
      </section>
    );
  return (
    <RecordDraftBoundary
      record="supplier catalog"
      description="Save your private pricing changes or discard them before leaving this catalog."
    >
      <LibrarySession accessLost={accessLost} />
    </RecordDraftBoundary>
  );
}
function LibrarySession({ accessLost }: { accessLost: () => void }) {
  const resource = useResource("/admin/shop/suppliers", connectionsSchema);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (denied(resource.error)) accessLost();
  }, [resource.error, accessLost]);
  const id =
    selected ??
    resource.data?.items.find((item) => item.configured)?.id ??
    "nexus-sandbox";
  return (
    <div className="supplier-library">
      <div className="supplier-actions">
        <Link className="button secondary" to="/admin/shop">
          Manual products
        </Link>
        <Link className="button secondary" to="/admin/shop/orders">
          Delivery queue
        </Link>
      </div>
      <p className="supplier-intro">
        Import privately, review delivery requirements, then set your customer
        prices.
      </p>
      <ErrorNotice error={resource.error} />
      {!!resource.error && (
        <Action disabled={resource.loading} onClick={resource.reload}>
          Retry supplier connections
        </Action>
      )}
      {resource.loading && !resource.data && (
        <Loading compact label="Loading supplier connections…" />
      )}
      {resource.data && (
        <ConnectionLibrary
          key={id}
          id={id}
          select={setSelected}
          accessLost={accessLost}
        />
      )}
    </div>
  );
}
function ConnectionLibrary({
  id,
  select,
  accessLost,
}: {
  id: string;
  select: (id: string) => void;
  accessLost: () => void;
}) {
  const [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [edit, setEdit] = useState<{
      product: Product;
      offer: Offer;
      connection: Connection;
      importID: string;
    } | null>(null),
    [ruleOpen, setRuleOpen] = useState(false),
    [notice, setNotice] = useState("");
  const resource = useResource(
    `/admin/shop/suppliers/${id}/library?${query}`,
    librarySchema,
  );
  const data = resource.data;
  useEffect(() => {
    if (denied(resource.error)) accessLost();
  }, [resource.error, accessLost]);
  const [lastQuery, setLastQuery] = useState(query);
  if (lastQuery !== query) {
    setLastQuery(query);
    setSearch(new URLSearchParams(query).get("q") ?? "");
  }
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(query);
    next.delete("after");
    next.delete("import");
    if (key === "game") next.delete("category");
    if (value) next.set(key, value);
    else next.delete(key);
    setQuery(next.toString());
  };
  const refresh = resource.reload;
  const latestSaved = () => {
    const next = new URLSearchParams(query);
    next.delete("after");
    next.delete("import");
    if (next.toString() !== query) setQuery(next.toString());
    else refresh();
  };
  if (edit)
    return (
      <OfferEditor
        key={`${edit.product.id}:${edit.offer.id}`}
        connection={edit.connection}
        importID={edit.importID}
        product={edit.product}
        offer={edit.offer}
        accessLost={accessLost}
        close={(changed) => {
          setEdit(null);
          if (changed) {
            setNotice("Private offer saved. Nothing was published.");
          }
          latestSaved();
        }}
      />
    );
  return (
    <>
      <fieldset className="supplier-source" disabled={ruleOpen}>
        <Select
          label="Supplier environment"
          value={id}
          change={select}
          options={connections}
        />
      </fieldset>
      <ErrorNotice error={resource.error} />
      {!!resource.error && (
        <Action disabled={resource.loading} onClick={refresh}>
          Retry supplier library
        </Action>
      )}
      {resource.loading && !data && (
        <Loading compact label="Loading private supplier catalog…" />
      )}
      {data && (
        <>
          <section className="supplier-summary" aria-label="Catalog status">
            <div>
              <span className="supplier-badge">
                {data.connection.testing
                  ? "Test environment"
                  : "Production catalog"}{" "}
                · Private
              </span>
              <h2>{connections.find(([key]) => key === id)?.[1]}</h2>
              <p>
                {data.import
                  ? `${String(data.import.product_count)} imported products · ${String(data.import.offer_count)} offers`
                  : "No catalog imported yet"}
              </p>
              {data.import && (
                <p className="quiet">
                  Catalog read{" "}
                  <time dateTime={data.import.updated_at}>
                    {new Date(data.import.updated_at).toLocaleString()}
                  </time>
                </p>
              )}
            </div>
            <div>
              <PurchasingControl
                connection={data.connection}
                changed={latestSaved}
              />
              <p className="quiet">Imports and price edits stay private.</p>
              <Action
                disabled={ruleOpen || resource.loading}
                onClick={() => {
                  setRuleOpen(true);
                }}
              >
                Default markup: {centsText(String(data.connection.markup_bps))}%
              </Action>
              <Action
                disabled={ruleOpen || resource.loading}
                onClick={latestSaved}
              >
                Reload saved settings
              </Action>
            </div>
          </section>
          {ruleOpen ? (
            <DefaultMarkup
              connection={data.connection}
              accessLost={accessLost}
              close={(changed) => {
                setRuleOpen(false);
                if (changed) {
                  setNotice(
                    "Default markup saved. Fixed prices and individual overrides were preserved.",
                  );
                }
                latestSaved();
              }}
            />
          ) : (
            <ImportControl
              connection={data.connection}
              accessLost={accessLost}
              changed={refresh}
            />
          )}
          {notice && <Feedback>{notice}</Feedback>}
          <fieldset
            disabled={ruleOpen || resource.loading}
            className="supplier-filter-fields"
          >
            <legend>Find imported products</legend>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                update("q", search.trim());
              }}
            >
              <Text
                label="Search supplier products"
                value={search}
                change={setSearch}
                maxLength={120}
              />
              <button type="submit" className="button secondary">
                Search
              </button>
            </form>
            <Select
              label="PLAYORA drafts"
              value={new URLSearchParams(query).get("listing") ?? ""}
              change={(value) => {
                update("listing", value);
              }}
              options={[
                ["", "All offers"],
                ["not_added", "Not added to drafts"],
                ["added", "Already added"],
              ]}
            />
            <Select
              label="Supplier game"
              value={new URLSearchParams(query).get("game") ?? ""}
              change={(value) => {
                update("game", value);
              }}
              options={[
                ["", "All supplier games"],
                ...data.games.map((game): [string, string] => [
                  game.id,
                  `${game.name}${game.closed ? " · unavailable" : ""}`,
                ]),
              ]}
            />
            <Select
              label="Supplier category"
              value={new URLSearchParams(query).get("category") ?? ""}
              change={(value) => {
                update("category", value);
              }}
              options={[
                ["", "All categories"],
                ...data.categories
                  .filter(
                    (category) =>
                      !new URLSearchParams(query).get("game") ||
                      category.game_id ===
                        new URLSearchParams(query).get("game"),
                  )
                  .map((category): [string, string] => [
                    category.id,
                    category.name,
                  ]),
              ]}
            />
          </fieldset>
          <p className="quiet">
            “Already added” includes private and published listings. Only
            matching offers appear when a draft filter is selected.
          </p>
          {data.items.length === 0 && (
            <div className="supplier-empty">
              <h3>
                {data.import
                  ? "No matching products"
                  : "Start with a private import"}
              </h3>
              <p>
                {data.import
                  ? "Try another draft status, game, category or search."
                  : "The catalog will include unavailable products and items that need review. Your own manual products stay unchanged."}
              </p>
              {query && (
                <Action
                  onClick={() => {
                    setQuery("");
                  }}
                >
                  Clear filters
                </Action>
              )}
            </div>
          )}
          <ul className="supplier-products" aria-label="Imported products">
            {data.items.map((product) => (
              <li key={product.id}>
                <div className="supplier-product-heading">
                  <h3>{product.name}</h3>
                  <p>
                    {data.games.find((game) => game.id === product.game_id)
                      ?.name ?? "Game needs review"}{" "}
                    ·{" "}
                    {data.categories.find(
                      (category) => category.id === product.category_id,
                    )?.name ?? "Category needs review"}
                  </p>
                </div>
                {!product.offers.length && (
                  <p>
                    No available pricing methods. This product stays private.
                  </p>
                )}
                <ul className="supplier-offers">
                  {product.offers.map((offer) => (
                    <li key={offer.id}>
                      <div>
                        <strong>{offer.name}</strong>
                        <span>
                          {deliveryLabels.get(
                            offer.pricing.delivery_method ||
                              offer.suggested_delivery,
                          ) ?? "Needs method review"}
                        </span>
                        <span className="quiet">
                          {offer.available
                            ? "Supplier price available"
                            : "Supplier unavailable"}{" "}
                          ·{" "}
                          {offer.pricing.issues.length
                            ? "Needs review"
                            : "Mapping saved"}
                        </span>
                        <span>
                          {offer.pricing.shop_product_id
                            ? "Added to PLAYORA"
                            : "Not added to drafts"}
                        </span>
                      </div>
                      <dl>
                        <div>
                          <dt>Supplier unit cost</dt>
                          <dd>
                            {offer.pricing.cost_usd
                              ? `USD ${offer.pricing.cost_usd}`
                              : "Unavailable"}
                          </dd>
                        </div>
                        <div>
                          <dt>
                            Customer preview · ×
                            {offer.pricing.preview_quantity || "?"}
                          </dt>
                          <dd>
                            {offer.pricing.preview_amount_minor
                              ? `USD ${centsText(offer.pricing.preview_amount_minor)}`
                              : "Needs review"}
                          </dd>
                        </div>
                      </dl>
                      <div>
                        <span className="supplier-price-rule">
                          {offer.pricing.override_minor
                            ? "Fixed price"
                            : `${centsText(String(offer.pricing.effective_markup_bps))}% ${offer.pricing.markup_bps === null ? "default" : "offer"} markup`}
                        </span>
                        <Action
                          disabled={ruleOpen || resource.loading}
                          onClick={() => {
                            setNotice("");
                            setEdit({
                              product,
                              offer,
                              connection: data.connection,
                              importID: data.import?.id ?? "",
                            });
                          }}
                        >
                          Review {offer.name}
                        </Action>
                        <PrepareListing
                          connection={data.connection}
                          importID={data.import?.id ?? ""}
                          product={product}
                          offer={offer}
                          disabled={ruleOpen || resource.loading}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <div className="supplier-actions">
            {data.next && (
              <Action
                disabled={ruleOpen || resource.loading}
                onClick={() => {
                  const next = new URLSearchParams(query);
                  next.set("after", data.next);
                  next.set("import", data.import?.id ?? "");
                  setQuery(next.toString());
                }}
              >
                Next products
              </Action>
            )}
            {new URLSearchParams(query).has("after") && (
              <Action
                disabled={ruleOpen || resource.loading}
                onClick={() => {
                  update("after", "");
                }}
              >
                First products
              </Action>
            )}
            <span className="quiet">
              {String(data.items.length)} products on this page
            </span>
          </div>
        </>
      )}
    </>
  );
}

function DefaultMarkup({
  connection: incomingConnection,
  accessLost,
  close,
}: {
  connection: Connection;
  accessLost: () => void;
  close: (changed: boolean) => void;
}) {
  const [connection] = useState(incomingConnection);
  const [value, setValue] = useState(centsText(String(connection.markup_bps))),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const dirty = value !== centsText(String(connection.markup_bps));
  useRecordDraft(dirty, busy);
  const lock = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const bps = markupBPS(value);
      rejectInvalidFields(
        bps === null
          ? [
              {
                path: "markup",
                message: "Enter 0–1,000%, with at most two decimal places.",
              },
            ]
          : [],
      );
      await post(
        `/admin/shop/suppliers/${connection.id}/markup`,
        { version: connection.version, markup_bps: bps },
        connectionSchema,
      );
      if (alive.current) close(true);
    } catch (cause) {
      if (alive.current) {
        if (denied(cause)) accessLost();
        else setError(cause);
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="supplier-notice">
      <h3>Default markup</h3>
      <p>
        Applies to private offers using the default rule. Fixed prices,
        offer-specific markup and accepted orders stay unchanged.
      </p>
      <ActionFields error={error} busy={busy}>
        <SupplierErrorNotice error={error} />
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <fieldset disabled={busy}>
            <Text
              name="markup"
              label="Default markup (%)"
              inputMode="decimal"
              value={value}
              change={setValue}
            />
            <div className="supplier-actions">
              <button type="submit" className="button">
                {busy ? "Saving…" : "Save default markup"}
              </button>
              <Action
                onClick={() => {
                  close(false);
                }}
              >
                {dirty ? "Discard markup change" : "Close markup settings"}
              </Action>
            </div>
          </fieldset>
        </form>
      </ActionFields>
    </section>
  );
}

function ImportControl({
  connection,
  changed,
  accessLost,
}: {
  connection: Connection;
  changed: () => void;
  accessLost: () => void;
}) {
  const [run, setRun] = useState<Import | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const key = useRef<string | null>(null),
    lock = useRef(false),
    alive = useRef(true);
  const runID = connection.active_import || run?.id || "";
  const [retrying, setRetrying] = useState(false);
  const pending =
    !!connection.active_import ||
    (!!run && ["queued", "loading"].includes(run.state));
  useRecordDraft(false, busy);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!runID || !pending) return;
    let active = true;
    let reading = false;
    const update = async () => {
      if (reading) return;
      reading = true;
      try {
        const next = await get(
          `/admin/shop/supplier-imports/${runID}`,
          importSchema,
        );
        if (!active) return;
        setRun(next);
        setError(null);
        if (!["queued", "loading"].includes(next.state)) changed();
      } catch (cause) {
        if (active) {
          if (denied(cause)) accessLost();
          else setError(cause);
        }
      } finally {
        reading = false;
      }
    };
    void update();
    const timer = window.setInterval(() => {
      if (!document.hidden) void update();
    }, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [runID, pending, changed, accessLost]);
  async function act(cancel = false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      key.current ??= crypto.randomUUID();
      setRetrying(true);
      const next = await post(
        cancel
          ? `/admin/shop/supplier-imports/${runID}/cancel`
          : `/admin/shop/suppliers/${connection.id}/imports`,
        cancel ? {} : { request_id: key.current },
        importSchema,
      );
      if (alive.current) {
        setRun(next);
        key.current = null;
        setRetrying(false);
        changed();
      }
    } catch (cause) {
      if (alive.current) {
        if (denied(cause)) accessLost();
        else setError(cause);
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="supplier-import" aria-label="Import supplier catalog">
      <div>
        <h3>{pending ? "Import in progress" : "Refresh supplier catalog"}</h3>
        <p>
          Imports the full catalog privately. Saved price overrides and manual
          products are preserved.
        </p>
        {!connection.configured && (
          <p>
            Connection is not configured in this environment. No credentials are
            entered in this screen.
          </p>
        )}
        {run && (
          <Feedback>
            {run.state === "complete"
              ? `Import complete: ${String(run.product_count)} products and ${String(run.offer_count)} offers. Nothing was published.`
              : run.state === "failed"
                ? "Import failed. The previous complete catalog is still available. Retry when the supplier connection is restored."
                : run.state === "cancelled"
                  ? "Import cancelled. The previous complete catalog is unchanged."
                  : `${run.state === "queued" ? "Queued" : "Importing"} · ${String(run.product_count)} products processed`}
          </Feedback>
        )}
        <ErrorNotice error={error} />
      </div>
      <div className="supplier-actions">
        <Action
          disabled={busy || pending || !connection.configured}
          onClick={() => {
            void act();
          }}
        >
          {busy
            ? "Updating…"
            : retrying
              ? "Retry same import request"
              : "Import private catalog"}
        </Action>
        {pending && (
          <Action
            disabled={busy}
            onClick={() => {
              void act(true);
            }}
          >
            Cancel import
          </Action>
        )}
      </div>
    </section>
  );
}
