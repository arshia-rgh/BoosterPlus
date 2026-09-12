import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  Action,
  Check,
  ErrorNotice,
  NumberInput,
  Select,
  Text,
} from "../catalog/controls";
import { post } from "../identity/api";
import { DownloadImage } from "../media/attachment";
import { useResource } from "../orders/resource";
import { submissionSchema } from "../submissions/model";
import { messagesSchema } from "../support/model";
import {
  inventorySchema,
  listingSchema,
  type Listing,
  type Product,
} from "./model";
import { ProductTerms } from "./market";

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
                <DownloadImage id={id} admin />
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
  ["currency", "Price currency"],
  ["amount_minor", "Exact price in minor units"],
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
    case "currency":
      return product.currency;
    case "amount_minor":
      return product.amount_minor;
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
function Editor({ row, changed }: { row: Listing; changed: () => void }) {
  const [product, setProduct] = useState(row.draft),
    [reviewed, setReviewed] = useState(false),
    [preview, setPreview] = useState(false),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    submission = useResource(
      `/admin/submissions/${row.submission_id}`,
      submissionSchema,
    );
  function edit<K extends keyof Product>(key: K, value: Product[K]) {
    setProduct((p) => ({ ...p, [key]: value }));
    setReviewed(false);
  }
  async function act(action: string) {
    setBusy(true);
    setError(null);
    try {
      await post(
        `/admin/account-listings/${row.id}/${action}`,
        { version: row.version, product, public_reviewed: reviewed },
        listingSchema,
      );
      changed();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p>Inventory state: {row.state}</p>
      <Link to={`/admin/submissions/${row.submission_id}`}>
        Private seller agreement and ownership review
      </Link>
      <ErrorNotice error={error} />
      <fieldset disabled={busy || ["reserved", "sold"].includes(row.state)}>
        <legend>Account listing editor</legend>
        {textFields.map(([key, label]) => (
          <Text
            key={key}
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
            help={
              key === "amount_minor"
                ? "For a two-decimal currency, 1234 means 12.34."
                : ""
            }
          />
        ))}
        <NumberInput
          label="Buyer dispute window hours"
          value={product.dispute_hours}
          change={(v) => {
            edit("dispute_hours", v);
          }}
        />
        <NumberInput
          label="Earliest delivery hours"
          value={product.delivery_min_hours}
          change={(v) => {
            edit("delivery_min_hours", v);
          }}
        />
        <NumberInput
          label="Latest delivery hours"
          value={product.delivery_max_hours}
          change={(v) => {
            edit("delivery_max_hours", v);
          }}
        />
        <h3>Public account characteristics</h3>
        {product.attributes.map((item, index) => (
          <fieldset key={index}>
            <legend>Characteristic {index + 1}</legend>
            <Text
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
        {submission.data && (
          <Images
            conversation={submission.data.conversation_id}
            selected={product.media_ids}
            change={(ids) => {
              if (ids.length <= 8) edit("media_ids", ids);
            }}
          />
        )}
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
        <Action onClick={() => void act("save")}>Save account listing</Action>
        <Action disabled={!reviewed} onClick={() => void act("publish")}>
          Publish account listing
        </Action>
        <Action onClick={() => void act("withdraw")}>
          Withdraw account listing
        </Action>
      </fieldset>
      {preview && (
        <ProductTerms
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
          Reserved or paid inventory is locked. Handle payment or delivery
          issues through the buyer order and its service case.
        </p>
      )}
    </>
  );
}
export function InventoryDetail() {
  const { id = "" } = useParams(),
    resource = useResource(
      `/admin/account-listings/${encodeURIComponent(id)}`,
      listingSchema,
    );
  return (
    <section>
      <Link to="/admin/accounts">← Account inventory</Link>
      <h2>Account listing</h2>
      <Action onClick={resource.reload}>Refresh inventory item</Action>
      <ErrorNotice error={resource.error} />
      {resource.data && !resource.error && (
        <fieldset disabled={resource.loading}>
          <Editor
            key={resource.data.version}
            row={resource.data}
            changed={resource.reload}
          />
        </fieldset>
      )}
    </section>
  );
}
export function AccountInventory() {
  const [state, setState] = useState(""),
    [after, setAfter] = useState(""),
    resource = useResource(
      `/admin/account-listings?state=${encodeURIComponent(state)}&after=${encodeURIComponent(after)}`,
      inventorySchema,
    );
  return (
    <section>
      <h2>Account inventory</h2>
      <Link to="/admin/submissions">
        Review seller submissions and create offers
      </Link>
      <Select
        label="Inventory status"
        value={state}
        change={(v) => {
          setState(v);
          setAfter("");
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
            <Link to={`/admin/accounts/${row.id}`}>
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
