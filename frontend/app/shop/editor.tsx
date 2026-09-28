import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Link,
  useBlocker,
  useLocation,
  useParams,
  type Location,
} from "react-router";
import {
  Action,
  Check,
  ErrorNotice,
  NumberInput,
  Text,
} from "../catalog/controls";
import { APIError, get, post } from "../identity/api";
import { AuthorizedIdentity } from "../identity/frame";
import { sessionEventMatches } from "../identity/portal";
import { useResource } from "../orders/resource";
import { denied } from "../support/chat-state";
import { RecordShell } from "../ui/record-shell";
import { FieldValidation } from "../ui/form-validation";
import { ShopIssues, fieldIssues, registerField } from "./validation";
import { ProductFields } from "./fields";
import { ProductPreview } from "./preview";
import {
  draftSchema,
  historySchema,
  previewSchema,
  type Definition,
  type Draft,
  type Preview,
  type Stock,
} from "./model";
import "../orders/admin-workspace.css";
import "./shop.css";

const sections = [
  { id: "basics", label: "Details" },
  { id: "variants", label: "Variants" },
  { id: "recipient", label: "Delivery information" },
  { id: "terms", label: "Terms" },
  { id: "stock", label: "Stock" },
  { id: "promotion", label: "Featured offers" },
  { id: "publication", label: "Publication" },
  { id: "history", label: "History" },
];
const endpoint = (id: string) =>
  `/admin/shop/products/${encodeURIComponent(id)}`;
export function ShopProductEditor() {
  const { id = "" } = useParams();
  return <ProductSession key={id} id={id} />;
}
function ProductSession({ id }: { id: string }) {
  const resource = useResource(endpoint(id), draftSchema),
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
    return <p role="status">Checking product access…</p>;
  if (checking && !resource.loading) setChecking(false);
  if (lost)
    return (
      <section role="alert">
        <p>
          Product access changed. Private details and unsaved drafts have been
          cleared.
        </p>
        <Link to="/admin/login">Admin sign-in</Link>
        <Action disabled={resource.loading} onClick={reload}>
          Check product access
        </Action>
      </section>
    );
  const row = resource.data ?? saved;
  return (
    <>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Checking current product…</p>}
      {!!resource.error && (
        <section>
          <p>
            Product details are hidden while the connection is unavailable. Your
            ordinary draft stays in this tab.
          </p>
          <Action disabled={resource.loading} onClick={reload}>
            Retry product
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
  const [value, setValue] = useState(row.draft),
    [revision, setRevision] = useState(row.version),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [preview, setPreview] = useState<Preview | null>(null),
    [confirmation, setConfirmation] = useState("");
  const [stockEdits, setStockEdits] = useState(
    new Map<string, { dirty: boolean; busy: boolean }>(),
  );
  const stockChange = useCallback(
    (key: string, dirty: boolean, busy: boolean) => {
      setStockEdits((current) => new Map(current).set(key, { dirty, busy }));
    },
    [],
  );
  const stockDirty = [...stockEdits.values()].some((item) => item.dirty);
  const stockBusy = [...stockEdits.values()].some((item) => item.busy);
  const lock = useRef(false),
    alive = useRef(true),
    leave = useRef<HTMLElement>(null);
  const location: Location<unknown> = useLocation();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (dirty || busy || stockDirty || stockBusy) &&
      currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!dirty && !busy && !stockDirty && !stockBusy) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", prevent);
    return () => {
      window.removeEventListener("beforeunload", prevent);
    };
  }, [dirty, busy, stockDirty, stockBusy]);
  useEffect(() => {
    if (blocker.state === "blocked") leave.current?.focus();
  }, [blocker.state]);
  const stale = row.version > revision,
    locked = loading || suspended || busy || stockBusy || stale;
  function reset(next: Draft) {
    setValue(next.draft);
    setRevision(next.version);
    setDirty(false);
    setPreview(null);
    setConfirmation("");
    setError(null);
  }
  if (stale && !dirty && !busy) reset(row);
  const change = (next: Definition) => {
    setValue(next);
    setError(null);
    setDirty(true);
    setPreview(null);
    setConfirmation("");
  };
  async function act(action: string) {
    if (lock.current || locked || (action !== "draft" && dirty)) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await post(
        endpoint(row.id) + "/" + action,
        action === "draft"
          ? { version: revision, definition: value }
          : { version: revision },
        draftSchema,
      );
      if (alive.current) {
        reset(result);
        changed();
      }
    } catch (cause) {
      if (alive.current) {
        setError(cause);
        if (denied(cause)) accessLost();
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function inspect() {
    if (locked || dirty || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await get(endpoint(row.id) + "/preview", previewSchema);
      if (alive.current) {
        if (result.draft.version !== revision) {
          changed();
          setError(new Error("Revision changed"));
        } else setPreview(result);
      }
    } catch (cause) {
      if (alive.current) {
        setError(cause);
        if (denied(cause)) accessLost();
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const state = location.state;
  const back =
    typeof state === "object" &&
    state !== null &&
    "shopSearch" in state &&
    typeof state.shopSearch === "string" &&
    state.shopSearch.length < 2048
      ? "/admin/shop?" + new URLSearchParams(state.shopSearch).toString()
      : "/admin/shop";
  const actions =
    row.state === "archived"
      ? ["restore"]
      : row.state === "published"
        ? ["pause", "archive"]
        : row.state === "paused"
          ? ["resume", "archive"]
          : ["archive"];
  return (
    <div className="admin-order-workspace shop-editor">
      {blocker.state === "blocked" && (
        <section role="alert" ref={leave} tabIndex={-1}>
          <h2>Keep your product draft?</h2>
          <p>
            Leaving discards unsaved edits. Product sections keep your draft.
          </p>
          <div className="catalog-actions">
            <Action
              onClick={() => {
                blocker.reset();
              }}
            >
              Stay with this draft
            </Action>
            <Action
              disabled={busy || stockBusy}
              onClick={() => {
                blocker.proceed();
              }}
            >
              Discard edits and leave
            </Action>
          </div>
        </section>
      )}
      <div hidden={suspended}>
        <RecordShell
          id={row.id}
          title="Product"
          workspace="Admin workspace"
          headingLevel={2}
          compactReference
          status={
            <>
              <strong>
                {row.game} · {value.title || "Untitled product"}
              </strong>
              <span>
                {row.state} · Revision {revision}
              </span>
            </>
          }
          back={{ to: back, label: "Shop products" }}
          sections={sections}
          keepMounted={["stock", "history"]}
        >
          {(section, visible) => (
            <>
              {visible && (
                <>
                  <ErrorNotice
                    error={
                      error instanceof APIError && error.issues.length
                        ? null
                        : error
                    }
                  />
                  <ShopIssues
                    issues={error instanceof APIError ? error.issues : []}
                  />
                  {stale && (
                    <section role="alert">
                      <h3>A newer revision is available</h3>
                      <p>
                        Your draft has not been overwritten. Review the current
                        saved product before replacing your edits.
                      </p>
                      <ProductPreview value={row.draft} />
                      <Action
                        onClick={() => {
                          reset(row);
                        }}
                      >
                        Discard my edits and use revision {row.version}
                      </Action>
                    </section>
                  )}
                  <div className="shop-toolbar">
                    <span role="status">
                      {dirty
                        ? "Unsaved changes"
                        : `Saved revision ${String(revision)}`}
                    </span>
                    <Action
                      disabled={locked || !dirty || row.state === "archived"}
                      onClick={() => void act("draft")}
                    >
                      Save product draft
                    </Action>
                    <Action disabled={busy || loading} onClick={changed}>
                      Refresh product
                    </Action>
                  </div>
                </>
              )}
              <fieldset
                className="admin-record-content"
                disabled={locked || row.state === "archived"}
              >
                <FieldValidation.Provider
                  value={{
                    issues: fieldIssues(
                      error instanceof APIError
                        ? error.issues
                        : (preview?.issues ?? []),
                    ),
                    register: registerField,
                    correct: () => {},
                  }}
                >
                  <ProductFields
                    section={section}
                    value={value}
                    change={change}
                  />
                </FieldValidation.Provider>
                {section === "publication" && (
                  <>
                    <h3>Review and publish</h3>
                    <p>
                      Save your review, then preview that saved revision.
                      Publishing creates a separate immutable version. Later
                      draft edits do not change it.
                    </p>
                    <Check
                      label="I reviewed artwork rights, public details, compatibility, prices and terms"
                      value={value.reviewed}
                      change={(reviewed) => {
                        change({ ...value, reviewed });
                      }}
                    />
                    <Action disabled={dirty} onClick={() => void inspect()}>
                      Preview saved revision
                    </Action>
                    {preview && (
                      <>
                        <ShopIssues issues={preview.issues} />
                        <ProductPreview value={preview.draft.draft} />
                        <Action
                          disabled={
                            dirty ||
                            preview.issues.length > 0 ||
                            preview.draft.version !== revision
                          }
                          onClick={() => {
                            setConfirmation("publish");
                          }}
                        >
                          Publish reviewed revision
                        </Action>
                      </>
                    )}
                  </>
                )}
              </fieldset>
              {section === "publication" && (
                <>
                  <h3>Availability</h3>
                  <p>
                    Pausing blocks new purchases. Archiving hides the product.
                    Existing orders keep their agreed terms. Restoring a
                    previously published product leaves it paused.
                  </p>
                  <div className="catalog-actions">
                    {actions.map((action) => (
                      <Action
                        key={action}
                        disabled={
                          locked ||
                          dirty ||
                          (action === "resume" && !row.current_release)
                        }
                        onClick={() => {
                          setConfirmation(action);
                        }}
                      >
                        {action.charAt(0).toUpperCase() + action.slice(1)}{" "}
                        product
                      </Action>
                    ))}
                  </div>
                  {confirmation && (
                    <section role="alert">
                      <h3>Confirm {confirmation}</h3>
                      <p>
                        Apply {confirmation} to {value.title || "this product"},
                        revision {revision}?
                      </p>
                      <Action
                        disabled={locked || dirty}
                        onClick={() => void act(confirmation)}
                      >
                        Confirm {confirmation}
                      </Action>
                      <Action
                        disabled={busy}
                        onClick={() => {
                          setConfirmation("");
                        }}
                      >
                        Keep current state
                      </Action>
                    </section>
                  )}
                </>
              )}
              {section === "promotion" && (
                <section className="catalog-section">
                  <h3>Feature this product in its game</h3>
                  <p>
                    Game featured offers bind a published product revision and
                    variant, an explicit start/end, priority and optional
                    remaining-stock badge. Prices come from the product; the
                    offer does not change checkout pricing or reserve stock.
                  </p>
                  <p>
                    Publish this product and enable the game’s Shop service
                    first. Save or discard any product edits before moving to
                    the game catalog. Publish the reviewed game catalog
                    separately to activate its offers.
                  </p>
                  <Link
                    className="button"
                    state={
                      state &&
                      typeof state === "object" &&
                      "shopSearch" in state &&
                      typeof state.shopSearch === "string" &&
                      state.shopSearch.length <= 2048
                        ? { shopSearch: state.shopSearch }
                        : null
                    }
                    to={`/admin/catalog?${new URLSearchParams({ game: row.game_id, section: "catalog-offers", returnProduct: row.id }).toString()}`}
                  >
                    Manage featured offers for {row.game}
                  </Link>
                </section>
              )}
              {section === "stock" && (
                <>
                  <h3>Stock capacity</h3>
                  <p>
                    Capacity includes reserved and committed units. Publication
                    starts new variants at zero. Refunds never add stock
                    automatically.
                  </p>
                  {!row.stocks.length && (
                    <p>
                      Publish a reviewed variant before setting its capacity.
                    </p>
                  )}
                  {row.stocks.map((stock) => (
                    <StockEditor
                      key={stock.variant_key}
                      row={row}
                      stock={stock}
                      disabled={
                        locked || dirty || row.state === "archived" || !visible
                      }
                      changed={changed}
                      accessLost={accessLost}
                      draftChanged={stockChange}
                    />
                  ))}
                </>
              )}
              {section === "history" && (
                <History
                  id={row.id}
                  revision={row.version}
                  active={visible && !suspended}
                  accessLost={accessLost}
                />
              )}
            </>
          )}
        </RecordShell>
      </div>
    </div>
  );
}
function StockEditor({
  row,
  stock,
  disabled,
  changed,
  accessLost,
  draftChanged,
}: {
  row: Draft;
  draftChanged: (key: string, dirty: boolean, busy: boolean) => void;
  stock: Stock;
  disabled: boolean;
  changed: () => void;
  accessLost: () => void;
}) {
  const [total, setTotal] = useState(stock.total),
    [reason, setReason] = useState(""),
    [base, setBase] = useState(stock.version),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [confirmed, setConfirmed] = useState(false);
  const lock = useRef(false);
  const stale = stock.version > base;
  const dirty = total !== stock.total || reason !== "";
  useEffect(() => {
    draftChanged(stock.variant_key, dirty, busy);
  }, [draftChanged, stock.variant_key, dirty, busy]);
  async function save() {
    if (lock.current || disabled || stale || !confirmed) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await post(
        endpoint(row.id) + "/stock",
        {
          version: row.version,
          stock_version: base,
          variant_key: stock.variant_key,
          total,
          reason,
        },
        draftSchema,
      );
      const current = result.stocks.find(
        (item) => item.variant_key === stock.variant_key,
      );
      if (current) {
        setBase(current.version);
        setTotal(current.total);
      }
      setReason("");
      setConfirmed(false);
      changed();
    } catch (cause) {
      setError(cause);
      if (denied(cause)) accessLost();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <fieldset className="catalog-item" disabled={disabled || busy}>
      <legend>{stock.variant_key}</legend>
      <dl className="shop-stock-summary">
        <div>
          <dt>Total</dt>
          <dd>{stock.total}</dd>
        </div>
        <div>
          <dt>Reserved</dt>
          <dd>{stock.reserved}</dd>
        </div>
        <div>
          <dt>Committed</dt>
          <dd>{stock.committed}</dd>
        </div>
        <div>
          <dt>Available</dt>
          <dd>{stock.available}</dd>
        </div>
      </dl>
      <ErrorNotice error={error} />
      {stale && (
        <>
          <p role="alert">
            Stock changed. Review the current counts before editing again.
          </p>
          <Action
            onClick={() => {
              setBase(stock.version);
              setTotal(stock.total);
              setReason("");
              setConfirmed(false);
            }}
          >
            Use current stock counts
          </Action>
        </>
      )}
      <NumberInput
        label={`Total capacity for ${stock.variant_key}`}
        value={total}
        change={(next) => {
          setTotal(next);
          setConfirmed(false);
        }}
      />
      <Text
        label={`Capacity change reason for ${stock.variant_key}`}
        value={reason}
        change={(next) => {
          setReason(next);
          setConfirmed(false);
        }}
      />
      <Check
        label={`I reviewed the stock commitments for ${stock.variant_key}`}
        value={confirmed}
        change={setConfirmed}
      />
      <Action
        disabled={
          stale ||
          !confirmed ||
          reason.trim().length < 10 ||
          total < stock.reserved + stock.committed ||
          total > 1000000000
        }
        onClick={() => void save()}
      >
        Update {stock.variant_key} capacity
      </Action>
    </fieldset>
  );
}
function History({
  id,
  revision,
  active,
  accessLost,
}: {
  id: string;
  revision: number;
  active: boolean;
  accessLost: () => void;
}) {
  return active ? (
    <HistoryPage key={String(revision)} id={id} accessLost={accessLost} />
  ) : null;
}
function HistoryPage({
  id,
  accessLost,
}: {
  id: string;
  accessLost: () => void;
}) {
  const [after, setAfter] = useState(0);
  const resource = useResource(
    endpoint(id) + `/releases?after=${String(after)}`,
    historySchema,
  );
  useEffect(() => {
    if (denied(resource.error)) accessLost();
  }, [resource.error, accessLost]);
  return (
    <>
      <h3>Published revisions</h3>
      <p>These snapshots preserve the details agreed at publication.</p>
      <ErrorNotice error={resource.error} />
      {!!resource.error && (
        <Action onClick={resource.reload}>Retry publication history</Action>
      )}
      {resource.loading && <p role="status">Loading publications…</p>}
      {resource.data?.items.length === 0 && <p>No published revisions yet.</p>}
      {resource.data?.items.map((release) => (
        <details key={release.id}>
          <summary>
            Revision {release.version} ·{" "}
            {new Date(release.created_at).toLocaleString()}
          </summary>
          <ProductPreview value={release.definition} />
        </details>
      ))}
      {!!resource.data?.next && (
        <Action
          onClick={() => {
            setAfter(resource.data?.next ?? 0);
          }}
        >
          Older publications
        </Action>
      )}
      {after > 0 && (
        <Action
          onClick={() => {
            setAfter(0);
          }}
        >
          Latest publications
        </Action>
      )}
    </>
  );
}
