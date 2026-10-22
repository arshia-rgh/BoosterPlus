import {
  ListingReadiness,
  useSellingProgress,
  type ReadinessResource,
} from "../submissions/selling-progress";
import { Loading } from "../ui/loading";
import { AgreementTemplate } from "./agreement-template";
import { BuyerPriceInput } from "./commission-fields";
import CoverEditor, { ReviewedImage } from "./cover-editor";
import { FieldValidation, ValidationSummary } from "../ui/form-validation";
import { useActionValidation } from "../ui/action-validation";
import { productIssues } from "./validation";
import SummaryFields from "./summary-fields";
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
import { StatusBadge } from "../ui/primitives";
import { minorDisplay } from "../catalog/price-estimate";
import ArtworkUpload from "../artwork/upload";
import {
  CreatePlayoraListing,
  OwnershipChip,
  OwnershipPanel,
  saleOutcome,
  sourceLabel,
} from "./ownership";
import { post } from "../identity/api";
import ListingPreview from "./listing-preview";
import { useResource } from "../orders/resource";
import { submissionSchema, type Submission } from "../submissions/model";
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
type EditorProps = {
  row: Listing;
  changed: () => void;
  back: string;
  loading: boolean;
  suspended: boolean;
};
// Seller rows read their submission and selling progress; PLAYORA-created rows
// have neither, so their readiness comes from the listing itself.
function SellerEditor(props: EditorProps) {
  const submission = useResource(
    `/admin/submissions/${props.row.submission_id}`,
    submissionSchema,
  );
  const progress = useSellingProgress(
    props.row.submission_id,
    true,
    props.row.version,
  );
  return <Editor {...props} submission={submission} progress={progress} />;
}
function PlayoraEditor(props: EditorProps) {
  const progress: ReadinessResource = {
    data: {
      blockers: props.row.blockers ?? [],
      listing_id: props.row.id,
      listing_state: props.row.state,
    },
    error: null,
    loading: props.loading,
    reload: props.changed,
  };
  return <Editor {...props} submission={null} progress={progress} />;
}
function Editor({
  row,
  changed,
  back,
  loading,
  suspended,
  submission,
  progress,
}: EditorProps & {
  submission: ReturnType<typeof useResource<Submission>> | null;
  progress: ReadinessResource;
}) {
  const owned = row.origin === "playora",
    playoraOwned = row.ownership === "playora";
  const [product, setProduct] = useState(row.draft),
    [reviewed, setReviewed] = useState(false),
    [baseVersion, setBaseVersion] = useState(row.version),
    [dirty, setDirty] = useState(false),
    [preview, setPreview] = useState(false),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    [action, setAction] = useState(""),
    [published, setPublished] = useState(false);
  const publishedNotice = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (published) publishedNotice.current?.focus();
  }, [published]);
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
    setAction(action);
    setError(null);
    const first = row.release_id === "";
    try {
      const saved = await post(
        `/admin/account-listings/${row.id}/${action}`,
        { version: baseVersion, product, public_reviewed: reviewed },
        listingSchema,
      );
      reset(saved);
      setPublished(action === "publish" && first);
      changed();
      progress.reload();
    } catch (cause) {
      validation.server(cause);
      setError(cause);
    } finally {
      lock.current = false;
      setBusy(false);
      setAction("");
    }
  }
  return (
    <FieldValidation value={validation.validation}>
      <div className="admin-order-workspace ownership-record">
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
          stickyStatus={statusLabel(row.state)}
          back={{
            to: back,
            state: location.state,
            label:
              !owned && back.startsWith("/admin/submissions/")
                ? "Account sale"
                : "Account inventory",
          }}
          sections={[
            { id: "details", label: "Listing details" },
            { id: "images", label: owned ? "Account images" : "Public images" },
            { id: "terms", label: "Buyer terms" },
            { id: "publication", label: "Preview & publication" },
          ]}
          status={
            <>
              <strong>{row.draft.title || "Untitled account"}</strong>
              <span>{row.game}</span>
              <OwnershipChip row={row} />
              <StatusBadge tone={statusTone(row.state)}>
                {statusLabel(row.state)}
              </StatusBadge>
              <Action variant="secondary" disabled={loading} onClick={changed}>
                Refresh inventory item
              </Action>
            </>
          }
        >
          {(section) => (
            <>
              <OwnershipPanel row={row} />
              {!owned && (
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
              )}
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
                  {!product.commission && product.amount_minor !== "" && (
                    <p>
                      This saved listing uses its earlier price. Enter an
                      explicit base below to apply the new 5% buyer commission
                      on its next release. Existing orders keep their agreed
                      total.
                    </p>
                  )}
                  <BuyerPriceInput
                    key={baseVersion}
                    consignment={row.origin === "consignment"}
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
                <div
                  hidden={section !== "details"}
                  data-editor-section="details"
                >
                  <SummaryFields
                    staff={owned}
                    product={product}
                    submission={submission?.data ?? undefined}
                    change={(next) => {
                      setProduct(next);
                      setDirty(true);
                      setReviewed(false);
                      setPreview(false);
                    }}
                  />
                </div>
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
                    uploads={owned}
                    product={product}
                    change={(patch) => {
                      setProduct((old) => ({ ...old, ...patch }));
                      setDirty(true);
                      setReviewed(false);
                      setPreview(false);
                    }}
                  />
                </div>
                {section === "images" && owned && (
                  <div className="account-uploads">
                    <ArtworkUpload
                      purpose="account"
                      value=""
                      pathEntry={false}
                      pathLabel="Account image"
                      disabled={product.media_ids.length >= 8}
                      disabledHint="8 images added. Remove one to add another."
                      change={(asset) => {
                        const id = /\/artwork\/([0-9a-f-]{36})\/wide$/.exec(
                          asset,
                        )?.[1];
                        if (
                          id &&
                          !product.media_ids.includes(id) &&
                          product.media_ids.length < 8
                        )
                          edit("media_ids", [...product.media_ids, id]);
                      }}
                    />
                  </div>
                )}
                {section === "images" && submission && (
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
                {section === "images" && submission?.data && (
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
                    owned={owned}
                    resource={progress}
                    submissionID={row.submission_id}
                    dirty={dirty}
                    reviewed={reviewed}
                    preview={preview}
                  />
                  {progress.data?.listing_state === "published" &&
                    !published && (
                      <p role="status">
                        This account is live. Publishing again replaces its
                        public version; existing orders keep their accepted
                        terms.
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
                  {published && (
                    <p
                      role="status"
                      tabIndex={-1}
                      ref={publishedNotice}
                      className="ownership-success"
                    >
                      Published. Buyers can now find this account on the{" "}
                      {row.game} Accounts page.
                    </p>
                  )}
                  <Check
                    label={
                      playoraOwned
                        ? "I confirm PLAYORA owns this account, and I reviewed every public field and image and removed private information."
                        : "I reviewed every public field and selected image, with permission to publish, and removed private information"
                    }
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
                    {busy && action === "publish"
                      ? "Publishing…"
                      : "Publish account listing"}
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
          <EditorFor
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
function EditorFor(props: EditorProps) {
  return props.row.origin === "playora" ? (
    <PlayoraEditor {...props} />
  ) : (
    <SellerEditor {...props} />
  );
}
export function InventoryDetail() {
  const { id } = useParams();
  return <InventorySession key={id} />;
}
const statusOptions = [
  ["", "All statuses"],
  ["draft", "Draft"],
  ["published", "Published"],
  ["reserved", "Reserved"],
  ["sold", "Sold"],
  ["withdrawn", "Paused"],
] as const;
const statusLabel = (state: string) =>
  statusOptions.find(([key]) => key === state)?.[1] ?? state;
const statusTone = (state: string) =>
  state === "published"
    ? "positive"
    : state === "reserved"
      ? "warning"
      : state === "sold"
        ? "info"
        : "neutral";
const owners = [
  ["", "All", "listings"],
  ["playora", "PLAYORA-owned", "PLAYORA-owned listings"],
  ["consignment", "Seller consignment", "seller consignment listings"],
] as const;
export function AccountInventory() {
  const [params, setParams] = useSearchParams();
  const rawOwner = params.get("owner") ?? "",
    owner =
      rawOwner === "playora" || rawOwner === "consignment" ? rawOwner : "",
    state = statusOptions.some(([key]) => key === params.get("state"))
      ? (params.get("state") ?? "")
      : "",
    after = params.get("after") ?? "";
  const [creating, setCreating] = useState(false);
  const addButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Unknown ownership values fall back to All without adding history.
    if (rawOwner && !owner) {
      const next = new URLSearchParams(params);
      next.delete("owner");
      setParams(next, { replace: true });
    }
  }, [rawOwner, owner, params, setParams]);
  const query = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries({ ...changes })) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    return next;
  };
  const setState = (value: string) => {
    setParams(query({ state: value, after: "" }), { preventScrollReset: true });
  };
  const setAfter = (value: string) => {
    setParams(query({ after: value }));
  };
  const ownership =
    owner === "playora" ? "playora" : owner === "consignment" ? "seller" : "";
  const resource = useResource(
    `/admin/account-listings?state=${encodeURIComponent(state)}&ownership=${ownership}&after=${encodeURIComponent(after)}`,
    inventorySchema,
  );
  const counts = resource.data?.counts;
  const count = (key: string) =>
    !counts
      ? undefined
      : key === "playora"
        ? counts.playora
        : key === "consignment"
          ? counts.seller
          : counts.playora + counts.seller;
  const current = owners.find(([key]) => key === owner) ?? owners[0];
  const shown = count(owner);
  const search = params.toString();
  return (
    <section className="account-inventory">
      <p className="account-inventory-intro">
        PLAYORA-owned accounts are sold for PLAYORA. Seller consignment accounts
        are sold for their seller.
      </p>
      <div className="account-inventory-actions">
        <button
          ref={addButton}
          type="button"
          className="button"
          disabled={creating}
          onClick={() => {
            setCreating(true);
          }}
        >
          Add a PLAYORA account
        </button>
        <Link className="button secondary compact" to="/admin/submissions">
          Seller submissions
        </Link>
      </div>
      {creating && (
        <CreatePlayoraListing
          search={search}
          close={() => {
            setCreating(false);
            requestAnimationFrame(() => addButton.current?.focus());
          }}
        />
      )}
      <div className="account-inventory-filters">
        <div className="ownership-filter" role="group" aria-label="Ownership">
          {owners.map(([key, label]) => (
            <Link
              key={key}
              to={`?${query({ owner: key, after: "" }).toString()}`}
              className="ownership-pill"
              aria-current={owner === key ? "true" : undefined}
              preventScrollReset
            >
              {label}
              {count(key) !== undefined && (
                <span className="count">{count(key)}</span>
              )}
            </Link>
          ))}
        </div>
        <div className="account-inventory-tools">
          <div className="account-inventory-status">
            <Select
              label="Status"
              value={state}
              change={setState}
              options={statusOptions}
            />
          </div>
          <Action variant="secondary" onClick={resource.reload}>
            Refresh inventory
          </Action>
        </div>
      </div>
      <p role="status" className="sr-only">
        {resource.loading
          ? ""
          : shown !== undefined
            ? `Showing ${String(shown)} ${shown === 1 ? current[2].replace(/s$/, "") : current[2]}.`
            : "Inventory updated."}
      </p>
      {resource.loading && !resource.data && (
        <p role="status">Loading inventory…</p>
      )}
      <ErrorNotice error={resource.error} />
      {!!resource.error && (
        <Action onClick={resource.reload}>Retry inventory</Action>
      )}
      {!!resource.data?.items.length && (
        <ul className="account-inventory-list">
          {resource.data.items.map((row) => (
            <li key={row.id} className="account-inventory-row">
              <div className="account-inventory-row-heading">
                <Link
                  to={`/admin/accounts/${row.id}?section=details`}
                  state={{ inventorySearch: search }}
                >
                  {row.draft.title || "Untitled reviewed account"}
                </Link>
                <StatusBadge tone={statusTone(row.state)}>
                  {statusLabel(row.state)}
                </StatusBadge>
              </div>
              <p className="account-inventory-meta">
                <span>{row.game}</span>
                <OwnershipChip row={row} />
                <span>{sourceLabel(row.origin)}</span>
              </p>
              <p className="account-inventory-outcome">
                On sale:{" "}
                {saleOutcome(row.origin).charAt(0).toLowerCase() +
                  saleOutcome(row.origin).slice(1)}
                {row.origin === "buy_first" &&
                  row.seller_payout_confirmed === false &&
                  " Seller payout not confirmed yet."}
              </p>
              <p className="account-inventory-price">
                {/^[1-9][0-9]{0,11}$/.test(row.draft.amount_minor)
                  ? `Buyer pays ${row.draft.currency} ${minorDisplay(row.draft.amount_minor)}`
                  : "Price not set"}
              </p>
            </li>
          ))}
        </ul>
      )}
      {resource.data?.items.length === 0 && !after && (
        <div className="account-inventory-empty">
          <p>
            {state
              ? `No ${owner ? current[2] : "listings"} are ${statusLabel(state).toLowerCase()}.`
              : owner === "playora"
                ? "No PLAYORA-owned listings yet. Add one, or accept a buy-before-resale seller offer."
                : owner === "consignment"
                  ? "No seller consignment listings yet. They appear when a seller accepts a consignment offer."
                  : "No account listings yet."}
          </p>
          {state ? (
            <Action
              onClick={() => {
                setState("");
              }}
            >
              Show all statuses
            </Action>
          ) : (
            !owner && (
              <Link to="/admin/submissions">Review seller submissions</Link>
            )
          )}
        </div>
      )}
      {resource.data?.items.length === 0 && after && (
        <p>No more inventory in this view.</p>
      )}
      {(!!resource.data?.next || after) && (
        <div className="catalog-actions">
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
        </div>
      )}
    </section>
  );
}
