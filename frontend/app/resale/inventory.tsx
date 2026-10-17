import {
  ListingReadiness,
  useSellingProgress,
} from "../submissions/selling-progress";
import { Loading } from "../ui/loading";
import { AgreementTemplate } from "./agreement-template";
import { BuyerPriceInput } from "./commission-fields";
import CoverEditor, { ReviewedImage } from "./cover-editor";
import { FieldValidation, ValidationSummary } from "../ui/form-validation";
import { useActionValidation } from "../ui/action-validation";
import { productIssues } from "./validation";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Link,
  useBlocker,
  useLocation,
  useParams,
  useSearchParams,
  type Location,
} from "../portal-router";
import {
  Action,
  Check,
  ErrorNotice,
  NumberInput,
  Select,
  Text,
} from "../catalog/controls";
import { relatedRecord } from "../payments/finance-context";
import { AuthorizedIdentity } from "../identity/frame";
import { sessionEventMatches } from "../identity/portal";
import { denied } from "../support/chat-state";
import { RecordShell } from "../ui/record-shell";
import "../orders/admin-workspace.css";
import { post } from "../identity/api";
import ListingPreview from "./listing-preview";
import { useResource } from "../orders/resource";
import { submissionSchema } from "../submissions/model";
import { messagesSchema } from "../support/model";
import {
  inventorySchema,
  listingSchema,
  type Listing,
  type Product,
} from "./model";

function Images({
  conversation,
  selected,
  change,
}: {
  conversation: string;
  selected: string[];
  change: (ids: string[]) => void;
}) {
  const [before, setBefore] = useState(0),
    resource = useResource(
      `/admin/conversations/${conversation}/messages?before=${String(before)}`,
      messagesSchema,
    );
  return (
    <section>
      <h3>Reviewed public images</h3>
      <p>
        Select only images cleared for public publication. Check for email
        addresses, player identifiers, recovery information and private chat.
        Maximum eight images.
      </p>
      <ErrorNotice error={resource.error} />
      {resource.data?.messages
        .filter((m) => m.visibility === "public")
        .map((m) => (
          <div key={m.id}>
            {m.attachments?.map((id, i) => (
              <div key={id}>
                <ReviewedImage
                  id={id}
                  label={`Source image ${String(i + 1)} from message ${String(m.sequence)}`}
                />
                <Check
                  label={`Publish image ${String(i + 1)} from message ${String(m.sequence)}`}
                  value={selected.includes(id)}
                  change={(on) => {
                    change(
                      on ? [...selected, id] : selected.filter((v) => v !== id),
                    );
                  }}
                />
              </div>
            ))}
          </div>
        ))}
      {resource.data?.next !== undefined && resource.data.next > 0 && (
        <Action
          onClick={() => {
            setBefore(resource.data?.next ?? 0);
          }}
        >
          Older review images
        </Action>
      )}
      {before > 0 && (
        <Action
          onClick={() => {
            setBefore(0);
          }}
        >
          Latest review images
        </Action>
      )}
    </section>
  );
}
const textFields = [
  ["title", "Public account title"],
  ["description", "Public account description"],
  ["region", "Public region"],
  ["rank", "Public rank"],
  ["sale_terms", "Buyer sale terms"],
  ["transfer_requirements", "Buyer transfer requirements"],
  ["dispute_terms", "Buyer dispute terms"],
  ["acknowledgement_terms", "Buyer acknowledgement terms"],
] as const;
function productText(product: Product, key: (typeof textFields)[number][0]) {
  switch (key) {
    case "title":
      return product.title;
    case "description":
      return product.description;
    case "region":
      return product.region;
    case "rank":
      return product.rank;
    case "sale_terms":
      return product.sale_terms;
    case "transfer_requirements":
      return product.transfer_requirements;
    case "dispute_terms":
      return product.dispute_terms;
    case "acknowledgement_terms":
      return product.acknowledgement_terms;
  }
}
function Editor({
  row,
  changed,
  back,
  loading,
  suspended,
}: {
  row: Listing;
  changed: () => void;
  back: string;
  loading: boolean;
  suspended: boolean;
}) {
  const [product, setProduct] = useState(row.draft),
    [reviewed, setReviewed] = useState(false),
    [baseVersion, setBaseVersion] = useState(row.version),
    [dirty, setDirty] = useState(false),
    [preview, setPreview] = useState(false),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    submission = useResource(
      `/admin/submissions/${row.submission_id}`,
      submissionSchema,
    );
  const progress = useSellingProgress(row.submission_id, true, row.version);
  const [params, setParams] = useSearchParams();
  const location: Location<unknown> = useLocation();
  const validation = useActionValidation((target) => {
    const section = target.closest<HTMLElement>("[data-editor-section]")
      ?.dataset.editorSection;
    if (section && params.get("section") !== section) {
      const next = new URLSearchParams(params);
      next.set("section", section);
      setParams(next, {
        replace: true,
        preventScrollReset: true,
        state: location.state,
      });
    }
  });
  const lock = useRef(false);
  const leavePrompt = useRef<HTMLElement>(null);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (dirty || busy) && currentLocation.pathname !== nextLocation.pathname,
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
    if (blocker.state === "blocked") {
      leavePrompt.current?.focus();
      leavePrompt.current?.scrollIntoView({ block: "center" });
    }
  }, [blocker.state]);
  const stale = row.version > baseVersion;
  function reset(current: Listing) {
    setProduct(current.draft);
    setBaseVersion(current.version);
    setDirty(false);
    setReviewed(false);
    setPreview(false);
    setError(null);
    validation.clear();
  }
  if (stale && !dirty && !busy) reset(row);
  function edit<K extends keyof Product>(key: K, value: Product[K]) {
    setProduct((p) => ({ ...p, [key]: value }));
    setReviewed(false);
    setPreview(false);
    setDirty(true);
  }
  async function act(action: string) {
    if (lock.current || stale || loading || suspended) return;
    if (
      action !== "withdraw" &&
      !validation.check(productIssues(product, action === "publish"))
    )
      return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const saved = await post(
        `/admin/account-listings/${row.id}/${action}`,
        { version: baseVersion, product, public_reviewed: reviewed },
        listingSchema,
      );
      reset(saved);
      changed();
      progress.reload();
    } catch (cause) {
      validation.server(cause);
      setError(cause);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <FieldValidation value={validation.validation}>
      <div className="admin-order-workspace">
        {blocker.state === "blocked" && (
          <section
            ref={leavePrompt}
            tabIndex={-1}
            role="alert"
            aria-label="Unsaved listing changes"
          >
            <h2>Keep your listing draft?</h2>
            <p>
              Leaving this account listing discards unsaved edits. Local listing
              sections preserve your draft.
            </p>
            <Action
              onClick={() => {
                blocker.reset();
              }}
            >
              Stay with this draft
            </Action>
            <Action
              disabled={busy}
              onClick={() => {
                blocker.proceed();
              }}
            >
              Discard draft and leave
            </Action>
          </section>
        )}
        <RecordShell
          id={row.id}
          title="Account listing"
          headingLevel={2}
          compactReference
          workspace="Admin workspace"
          stickyStatus={row.state}
          back={{
            to: back,
            state: location.state,
            label: back.startsWith("/admin/submissions/")
              ? "Account sale"
              : "Account inventory",
          }}
          sections={[
            { id: "details", label: "Listing details" },
            { id: "images", label: "Public images" },
            { id: "terms", label: "Buyer terms" },
            { id: "publication", label: "Preview & publication" },
          ]}
          status={
            <>
              <strong>{row.draft.title || "Untitled account"}</strong>
              <span>{row.game}</span>
              <span className="status">{row.state}</span>
              <Action disabled={loading} onClick={changed}>
                Refresh inventory item
              </Action>
            </>
          }
        >
          {(section) => (
            <>
              <p>Inventory state: {row.state}</p>
              <Link
                to={`/admin/submissions/${row.submission_id}?section=agreement`}
                state={{
                  inventorySearch:
                    typeof location.state === "object" &&
                    location.state !== null &&
                    "inventorySearch" in location.state &&
                    typeof location.state.inventorySearch === "string"
                      ? location.state.inventorySearch.slice(0, 2048)
                      : undefined,
                  inventoryID: row.id,
                  inventorySection:
                    new URLSearchParams(location.search).get("section") ??
                    "details",
                }}
              >
                Seller agreement and sale progress
              </Link>
              <ErrorNotice error={error} hideIssues />
              <ValidationSummary
                issues={validation.validation.issues}
                fields={validation.validation.fields}
              />
              {stale && dirty && (
                <section role="alert">
                  <p>
                    This listing changed. Your draft is retained, but you must
                    load the current version before saving or publishing.
                  </p>
                  <Action
                    onClick={() => {
                      reset(row);
                    }}
                  >
                    Discard draft and load current listing
                  </Action>
                </section>
              )}
              <fieldset
                className="account-listing-editor"
                disabled={
                  busy ||
                  loading ||
                  suspended ||
                  stale ||
                  ["reserved", "sold"].includes(row.state)
                }
              >
                <legend>Account listing editor</legend>
                <div
                  hidden={section !== "details"}
                  data-editor-section="details"
                >
                  {!product.commission && (
                    <p>
                      This saved listing uses its earlier price. Enter an
                      explicit base below to apply the new 5% buyer commission
                      on its next release. Existing orders keep their agreed
                      total.
                    </p>
                  )}
                  <BuyerPriceInput
                    key={baseVersion}
                    price={product.commission}
                    change={(commission) => {
                      setProduct((p) => ({
                        ...p,
                        commission,
                        currency: "USD",
                        amount_minor: commission.total_minor,
                      }));
                      setDirty(true);
                      setReviewed(false);
                      setPreview(false);
                    }}
                  />
                </div>
                {textFields.map(([key, label]) => (
                  <div
                    key={key}
                    data-editor-section={
                      [
                        "title",
                        "description",
                        "region",
                        "rank",
                        "currency",
                        "amount_minor",
                      ].includes(key)
                        ? "details"
                        : "terms"
                    }
                    hidden={
                      section !==
                      ([
                        "title",
                        "description",
                        "region",
                        "rank",
                        "currency",
                        "amount_minor",
                      ].includes(key)
                        ? "details"
                        : "terms")
                    }
                  >
                    <Text
                      name={`product.${key}`}
                      label={label}
                      value={productText(product, key)}
                      change={(v) => {
                        edit(key, v);
                      }}
                      multiline={[
                        "description",
                        "sale_terms",
                        "transfer_requirements",
                        "dispute_terms",
                        "acknowledgement_terms",
                      ].includes(key)}
                    />
                  </div>
                ))}
                <div hidden={section !== "terms"} data-editor-section="terms">
                  <AgreementTemplate
                    label="Replace with approved buyer terms"
                    apply={(defaults) => {
                      setProduct((p) => ({
                        ...p,
                        sale_terms: defaults.buyer.sale_terms,
                        transfer_requirements:
                          defaults.buyer.transfer_requirements,
                        dispute_terms: defaults.buyer.dispute_terms,
                        acknowledgement_terms:
                          defaults.buyer.acknowledgement_terms,
                        dispute_hours: 168,
                      }));
                      setDirty(true);
                      setReviewed(false);
                      setPreview(false);
                    }}
                  />
                  <NumberInput
                    name="product.dispute_hours"
                    label="Initial buyer inspection hours"
                    value={product.dispute_hours}
                    change={(v) => {
                      edit("dispute_hours", v);
                    }}
                  />
                  <NumberInput
                    name="product.delivery_min_hours"
                    label="Earliest delivery hours"
                    value={product.delivery_min_hours}
                    change={(v) => {
                      edit("delivery_min_hours", v);
                    }}
                  />
                  <NumberInput
                    name="product.delivery_max_hours"
                    label="Latest delivery hours"
                    value={product.delivery_max_hours}
                    change={(v) => {
                      edit("delivery_max_hours", v);
                    }}
                  />
                </div>
                <div
                  hidden={section !== "details"}
                  data-editor-section="details"
                >
                  <h3>Public account characteristics</h3>
                  {product.attributes.map((item, index) => (
                    <fieldset key={index}>
                      <legend>Characteristic {index + 1}</legend>
                      <Text
                        name={`product.attributes.${String(index)}.label`}
                        label={`Characteristic ${String(index + 1)} name`}
                        value={item.label}
                        change={(v) => {
                          edit(
                            "attributes",
                            product.attributes.map((a, i) =>
                              i === index ? { ...a, label: v } : a,
                            ),
                          );
                        }}
                      />
                      <Text
                        name={`product.attributes.${String(index)}.value`}
                        label={`Characteristic ${String(index + 1)} value`}
                        value={item.value}
                        change={(v) => {
                          edit(
                            "attributes",
                            product.attributes.map((a, i) =>
                              i === index ? { ...a, value: v } : a,
                            ),
                          );
                        }}
                      />
                      <Action
                        onClick={() => {
                          edit(
                            "attributes",
                            product.attributes.filter((_, i) => i !== index),
                          );
                        }}
                      >
                        Remove characteristic {index + 1}
                      </Action>
                    </fieldset>
                  ))}
                  <Action
                    disabled={product.attributes.length >= 30}
                    onClick={() => {
                      edit("attributes", [
                        ...product.attributes,
                        { label: "", value: "" },
                      ]);
                    }}
                  >
                    Add account characteristic
                  </Action>
                </div>
                <div hidden={section !== "images"} data-editor-section="images">
                  <CoverEditor
                    product={product}
                    change={(patch) => {
                      setProduct((old) => ({ ...old, ...patch }));
                      setDirty(true);
                      setReviewed(false);
                      setPreview(false);
                    }}
                  />
                </div>
                {section === "images" && (
                  <>
                    <h3>Public image selection</h3>
                    <ErrorNotice error={submission.error} />
                    {!!submission.error && (
                      <Action onClick={submission.reload}>
                        Retry source images
                      </Action>
                    )}
                  </>
                )}
                {section === "images" && submission.data && (
                  <Images
                    conversation={submission.data.conversation_id}
                    selected={product.media_ids}
                    change={(ids) => {
                      if (ids.length <= 8) {
                        edit("media_ids", ids);
                        if (
                          product.cover_media_id &&
                          !ids.includes(product.cover_media_id)
                        )
                          edit("cover_media_id", "");
                      }
                    }}
                  />
                )}
                <div hidden={section !== "publication"}>
                  <h3>Preview & publication</h3>
                  <ListingReadiness
                    resource={progress}
                    submissionID={row.submission_id}
                    dirty={dirty}
                    reviewed={reviewed}
                    preview={preview}
                  />
                  {progress.data?.listing_state === "published" && (
                    <p role="status">
                      This account is live. Publishing again replaces its public
                      version; existing orders keep their accepted terms.
                    </p>
                  )}
                  {progress.data?.listing_state === "withdrawn" && (
                    <p role="status">
                      This listing is paused. Complete the steps below to
                      publish it again.
                    </p>
                  )}
                  <p>
                    Preview the saved listing before publishing. Draft changes
                    are private until publication.
                  </p>
                  <Check
                    label="I reviewed every public field and selected image, with permission to publish, and removed private information"
                    value={reviewed}
                    change={setReviewed}
                  />
                  <Action
                    onClick={() => {
                      setPreview((v) => !v);
                    }}
                  >
                    {preview ? "Hide" : "Show"} listing preview
                  </Action>
                  <Action
                    disabled={
                      !reviewed ||
                      dirty ||
                      !preview ||
                      progress.loading ||
                      !!progress.error ||
                      !progress.data ||
                      progress.data.blockers.some((code) =>
                        ["seller_payment", "game_unavailable"].includes(code),
                      )
                    }
                    onClick={() => void act("publish")}
                  >
                    Publish account listing
                  </Action>
                  {row.state === "published" && (
                    <Action onClick={() => void act("withdraw")}>
                      Pause public listing
                    </Action>
                  )}
                </div>
                {section !== "publication" && (
                  <Link
                    className="button compact"
                    to={`?section=${section === "details" ? "images" : section === "images" ? "terms" : "publication"}`}
                    state={location.state}
                    preventScrollReset
                  >
                    Continue to{" "}
                    {section === "details"
                      ? "images"
                      : section === "images"
                        ? "buyer terms"
                        : "preview & publication"}
                  </Link>
                )}
                <Action disabled={!dirty} onClick={() => void act("save")}>
                  Save account listing
                </Action>
                {dirty && (
                  <p role="status">
                    You have unsaved changes. Save them before publication.
                  </p>
                )}
              </fieldset>
              {section === "publication" && preview && (
                <ListingPreview
                  key={JSON.stringify([
                    product.media_ids,
                    product.cover_media_id,
                  ])}
                  listing={{
                    id: row.id,
                    release_id: row.release_id,
                    game: row.game,
                    slug: row.slug,
                    state: row.state,
                    product,
                    images: [],
                  }}
                />
              )}
              {["reserved", "sold"].includes(row.state) && (
                <p>
                  Reserved or paid inventory is locked. Handle payment or
                  delivery issues through the buyer order and its service case.
                </p>
              )}
            </>
          )}
        </RecordShell>
      </div>
    </FieldValidation>
  );
}
function InventorySession() {
  const { id = "" } = useParams();
  const location: Location<unknown> = useLocation();
  const identity = useContext(AuthorizedIdentity);
  const resource = useResource(
    `/admin/account-listings/${encodeURIComponent(id)}`,
    listingSchema,
  );
  const [saved, setSaved] = useState<Listing | null>(null),
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
  const reloadResource = resource.reload;
  const reload = useCallback(() => {
    if (lost) setChecking(true);
    setInterrupted(false);
    reloadResource();
  }, [lost, reloadResource]);
  useEffect(() => {
    const change = (event: Event) => {
      if (sessionEventMatches(event, "admin")) setInterrupted(true);
    };
    window.addEventListener("boosterplus:session-changed", change);
    return () => {
      window.removeEventListener("boosterplus:session-changed", change);
    };
  }, []);
  const back =
    relatedRecord(location.state, "submissionID") ??
    "/admin/accounts" +
      (typeof location.state === "object" &&
      location.state !== null &&
      "inventorySearch" in location.state &&
      typeof location.state.inventorySearch === "string" &&
      location.state.inventorySearch.length < 2048
        ? "?" + new URLSearchParams(location.state.inventorySearch).toString()
        : "");
  if (checking && resource.loading)
    return <Loading compact label="Checking inventory access…" />;
  if (checking && !resource.loading) setChecking(false);
  if (lost)
    return (
      <section role="alert">
        <p>
          Inventory access changed. Private details and unsaved drafts have been
          cleared.
        </p>
        <Link to="/admin/login">Admin sign-in</Link>
        <Action disabled={resource.loading} onClick={reload}>
          Check inventory access
        </Action>
      </section>
    );
  const row = resource.data ?? saved;
  const suspended = !!resource.error;
  return (
    <>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Checking current inventory…</p>}
      {suspended && (
        <section>
          <p>
            The listing is hidden while the connection is unavailable. Ordinary
            drafts stay in this tab.
          </p>
          <Action disabled={resource.loading} onClick={reload}>
            Retry inventory
          </Action>
        </section>
      )}
      {row && (
        <div hidden={suspended}>
          <Editor
            row={row}
            changed={reload}
            back={back}
            loading={resource.loading}
            suspended={suspended}
          />
        </div>
      )}
    </>
  );
}
export function InventoryDetail() {
  const { id } = useParams();
  return <InventorySession key={id} />;
}
export function AccountInventory() {
  const [params, setParams] = useSearchParams();
  const state = params.get("state") ?? "",
    after = params.get("after") ?? "";
  const setState = (state: string) => {
    setParams({ ...Object.fromEntries(params), state, after: "" });
  };
  const setAfter = (after: string) => {
    setParams({ ...Object.fromEntries(params), after });
  };
  const resource = useResource(
    `/admin/account-listings?state=${encodeURIComponent(state)}&after=${encodeURIComponent(after)}`,
    inventorySchema,
  );
  return (
    <section>
      <Link to="/admin/submissions">
        Review seller submissions and create offers
      </Link>
      <Select
        label="Inventory status"
        value={state}
        change={(v) => {
          setState(v);
        }}
        options={[
          "",
          "draft",
          "published",
          "reserved",
          "sold",
          "withdrawn",
        ].map((s) => [s, s || "All states"] as const)}
      />
      <Action onClick={resource.reload}>Refresh inventory</Action>
      <ErrorNotice error={resource.error} />
      <ul>
        {resource.data?.items.map((row) => (
          <li key={row.id}>
            <Link
              to={`/admin/accounts/${row.id}?section=details`}
              state={{ inventorySearch: params.toString() }}
            >
              {row.draft.title || "Untitled reviewed account"}
            </Link>{" "}
            · {row.game} · {row.state}
          </li>
        ))}
      </ul>
      {resource.data?.items.length === 0 && <p>No inventory in this view.</p>}
      {resource.data?.next && (
        <Action
          onClick={() => {
            setAfter(resource.data?.next ?? "");
          }}
        >
          More inventory
        </Action>
      )}
      {after && (
        <Action
          onClick={() => {
            setAfter("");
          }}
        >
          First inventory
        </Action>
      )}
    </section>
  );
}
