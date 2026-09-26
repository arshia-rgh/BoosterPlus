import { useState } from "react";
import {
  Action,
  Check,
  ErrorNotice,
  NumberInput,
  Select,
  Text,
} from "./controls";
import { price, type Configuration } from "./model";
import type { Promotion } from "./discovery-model";
import { useResource } from "../orders/resource";
import { publicListingsSchema } from "../resale/model";

function AccountTarget({
  slug,
  value,
  change,
}: {
  slug: string;
  value: Promotion;
  change: (patch: Partial<Promotion>) => void;
}) {
  const [after, setAfter] = useState("");
  const resource = useResource(
    `/accounts?slug=${encodeURIComponent(slug)}&after=${encodeURIComponent(after)}`,
    publicListingsSchema,
  );
  const items =
    resource.data?.items.filter(
      (item) => item.slug === slug && item.state === "published",
    ) ?? [];
  const selected = items.some(
    (item) =>
      item.id === value.listing_id && item.release_id === value.release_id,
  );
  return (
    <>
      <p>
        Choose a current published listing. Its exact release and price are
        checked again at publication and purchase.
      </p>
      <ErrorNotice error={resource.error} />
      {!resource.data && !resource.error && (
        <p role="status">Loading published accounts…</p>
      )}
      <Select
        label="Published account"
        value={selected ? value.listing_id : ""}
        options={[
          [
            "",
            value.listing_id
              ? "Saved selection — choose again to replace"
              : "Choose an account",
          ],
          ...items.map(
            (item) =>
              [
                item.id,
                `${item.product.title} · ${price(item.product)}`,
              ] as const,
          ),
        ]}
        change={(id) => {
          const item = items.find((candidate) => candidate.id === id);
          if (item)
            change({ listing_id: item.id, release_id: item.release_id });
        }}
      />
      {value.listing_id && (
        <p className="quiet">
          Saved listing: <span className="record-id">{value.listing_id}</span>.
          Saved revision: <span className="record-id">{value.release_id}</span>.
        </p>
      )}
      {resource.data != null && items.length === 0 && (
        <p>No published accounts on this page.</p>
      )}
      <div className="catalog-actions">
        {after && (
          <Action
            onClick={() => {
              setAfter("");
            }}
          >
            First accounts
          </Action>
        )}
        {resource.data?.next && (
          <Action
            onClick={() => {
              setAfter(resource.data?.next ?? "");
            }}
          >
            More accounts
          </Action>
        )}
        {resource.error != null && (
          <Action onClick={resource.reload}>Retry accounts</Action>
        )}
      </div>
    </>
  );
}

export default function PromotionEditor({
  config,
  slug,
  value,
  change,
}: {
  config: Configuration;
  slug: string;
  value: Promotion[];
  change: (value: Promotion[]) => void;
}) {
  const patch = (key: string, fields: Partial<Promotion>) => {
    change(value.map((p) => (p.key === key ? { ...p, ...fields } : p)));
  };
  return (
    <section aria-label="Featured offers">
      <h3>Featured offers</h3>
      <p>
        Pin reviewed packages or accounts. Prices come from the selected
        offering; this editor cannot invent a sale price. Dates use UTC and the
        end is exclusive. Offers disappear when they expire, run out or no
        longer match their reviewed revision.
      </p>
      {value.length === 0 && <p>No featured offers configured.</p>}
      {value.map((p, i) => (
        <fieldset key={p.key} className="catalog-item">
          <legend>
            Offer {i + 1}
            {p.title ? ` · ${p.title}` : ""}
          </legend>
          <Text
            label="Offer title"
            value={p.title}
            change={(title) => {
              patch(p.key, { title });
            }}
          />
          <Text
            label="Offer description"
            multiline
            value={p.description}
            change={(description) => {
              patch(p.key, { description });
            }}
          />
          <Select
            label="Offer type"
            value={p.target}
            options={[
              ["package", "Boost package"],
              ["account", "Account listing"],
            ]}
            change={(target) => {
              patch(p.key, {
                target: target === "account" ? "account" : "package",
                package: "",
                variant: "",
                listing_id: "",
                release_id: "",
                coupon_code: "",
                coupon_version: 0,
                show_quantity: false,
              });
            }}
          />
          {p.target === "package" ? (
            <>
              <Select
                label="Package"
                value={p.package}
                options={[
                  ["", "Choose a package"],
                  ...config.packages.map(
                    (pack) => [pack.key, pack.name] as const,
                  ),
                ]}
                change={(pack) => {
                  patch(p.key, {
                    package: pack,
                    variant: "",
                    show_quantity: false,
                  });
                }}
              />
              <Select
                label="Package variant"
                value={p.variant}
                options={[
                  ["", "Choose a variant"],
                  ...(
                    config.packages.find((pack) => pack.key === p.package)
                      ?.variants ?? []
                  ).map((v) => [v.key, v.name] as const),
                ]}
                change={(variant) => {
                  patch(p.key, { variant, show_quantity: false });
                }}
              />
              <details>
                <summary>Optional reviewed coupon</summary>
                <p>
                  Enter the exact code and current version from Coupon
                  management. The coupon must cover the complete offer interval
                  and this package. Leave empty for the standard price.
                </p>
                <Text
                  label="Coupon code"
                  value={p.coupon_code}
                  change={(coupon_code) => {
                    patch(p.key, {
                      coupon_code,
                      coupon_version: coupon_code ? p.coupon_version : 0,
                    });
                  }}
                />
                {p.coupon_code && (
                  <NumberInput
                    label="Reviewed coupon version"
                    value={p.coupon_version}
                    change={(coupon_version) => {
                      patch(p.key, { coupon_version });
                    }}
                  />
                )}
              </details>
            </>
          ) : (
            <AccountTarget
              slug={slug}
              value={p}
              change={(fields) => {
                patch(p.key, fields);
              }}
            />
          )}
          <div className="catalog-grid">
            <Text
              label="Starts at (UTC)"
              value={p.starts_at}
              help="Example: 2026-10-01T12:00:00Z"
              change={(starts_at) => {
                patch(p.key, { starts_at });
              }}
            />
            <Text
              label="Ends at (UTC)"
              value={p.ends_at}
              help="Use an explicit Z or timezone offset."
              change={(ends_at) => {
                patch(p.key, { ends_at });
              }}
            />
            <NumberInput
              label="Priority (0–100, highest first)"
              value={p.priority}
              change={(priority) => {
                patch(p.key, { priority });
              }}
            />
          </div>
          <Check
            label="Show remaining quantity from real inventory"
            value={p.show_quantity}
            change={(show_quantity) => {
              patch(p.key, { show_quantity });
            }}
          />
          <Check
            label="Include this offer when the catalog is published"
            value={p.enabled}
            change={(enabled) => {
              patch(p.key, { enabled });
            }}
          />
          <Action
            onClick={() => {
              change(value.filter((item) => item.key !== p.key));
            }}
          >
            Remove offer {i + 1}
          </Action>
        </fieldset>
      ))}
      <Action
        disabled={value.length >= 12}
        onClick={() => {
          change([
            ...value,
            {
              key: `offer_${crypto.randomUUID().replaceAll("-", "")}`,
              title: "",
              description: "",
              enabled: false,
              target: "package",
              package: "",
              variant: "",
              listing_id: "",
              release_id: "",
              coupon_code: "",
              coupon_version: 0,
              starts_at: "",
              ends_at: "",
              priority: 0,
              show_quantity: false,
            },
          ]);
        }}
      >
        Add featured offer
      </Action>
    </section>
  );
}
