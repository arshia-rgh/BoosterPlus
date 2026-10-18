import { useCallback, useContext, useId, useState } from "react";
import { FieldValidation, fieldError } from "../ui/form-validation";
import { skinTotal } from "./account-summary";
import { Action, Text } from "../catalog/controls";
import CosmeticsInput from "../catalog/cosmetics-input";
import {
  cosmeticsSchema,
  emptyField,
  emptyConfiguration,
  optionsFor,
} from "../catalog/model";
import type { Submission } from "../submissions/model";
import type { Product } from "./model";

/** Explicitly mapped, ordinary seller claims. Staff choose whether to copy and publish. */
export function sellerSummary(submission: Submission): Partial<Product> {
  const config = submission.offer.configuration;
  const form = config.intake,
    map = form?.summary;
  if (!form || !map) return {};
  const result: Partial<Product> = {};
  const hero = submission.answers[map.hero_count];
  if (
    typeof hero === "string" &&
    /^(0|[1-9]\d{0,4})$/.test(hero) &&
    Number(hero) <= 10000
  )
    result.hero_count = Number(hero);
  const point = submission.answers[map.selling_point];
  if (typeof point === "string") result.selling_point = point;
  const skins = cosmeticsSchema.safeParse(
    submission.answers[map.skin_collection],
  ).data;
  const field = form.fields.find(
    (f) => f.key === map.skin_collection && f.type === "cosmetics",
  );
  if (field && skins) {
    result.skin_collection = {
      groups: skins.groups.map((g) => ({
        ...g,
        names: [...g.names],
        category:
          optionsFor(field, config).find((o) => o.key === g.category)?.label ??
          g.category,
      })),
    };
  } else if (map.has_skins && submission.answers[map.has_skins] === false)
    result.skin_collection = { groups: [] };
  return result;
}

export default function SummaryFields({
  product,
  submission,
  change,
}: {
  product: Product;
  submission: Submission | undefined;
  change: (value: Product) => void;
}) {
  const claimed = submission ? sellerSummary(submission) : {};
  const config = submission?.offer.configuration ?? emptyConfiguration("");
  const [heroDraft, setHeroDraft] = useState({
    value: product.hero_count,
    text: product.hero_count === undefined ? "" : String(product.hero_count),
  });
  if (!Object.is(heroDraft.value, product.hero_count))
    setHeroDraft({
      value: product.hero_count,
      text: product.hero_count === undefined ? "" : String(product.hero_count),
    });
  const validation = useContext(FieldValidation),
    register = validation?.register;
  const skinsID = useId();
  const skinsRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && register)
        return register({
          name: "product.skin_collection",
          id: skinsID,
          label: "Public skin collection",
        });
    },
    [register, skinsID],
  );
  const skinsError = fieldError(validation, "product.skin_collection");
  return (
    <section className="catalog-section">
      <h3>Account card summary</h3>
      <p>
        Customers see these facts before opening the listing. Check the seller’s
        claims before publication.
      </p>
      {Object.keys(claimed).length > 0 && (
        <Action
          onClick={() => {
            change({ ...product, ...claimed });
          }}
        >
          Use seller’s summary for review
        </Action>
      )}
      <Text
        name="product.hero_count"
        label="Hero count"
        inputMode="numeric"
        value={heroDraft.text}
        error={
          product.hero_count !== undefined &&
          (!Number.isInteger(product.hero_count) ||
            product.hero_count < 0 ||
            product.hero_count > 10000)
            ? "Enter a whole number from 0 to 10,000."
            : undefined
        }
        change={(value) => {
          const next = { ...product };
          if (value === "") delete next.hero_count;
          else
            next.hero_count = /^(0|[1-9]\d*)$/.test(value)
              ? Number(value)
              : Number.NaN;
          setHeroDraft({ value: next.hero_count, text: value });
          change(next);
        }}
        help="0–10,000. Leave blank only when not known."
      />
      <Text
        name="product.selling_point"
        label="Why choose this account?"
        value={product.selling_point ?? ""}
        change={(selling_point) => {
          change({ ...product, selling_point });
        }}
        help="One specific reason, up to 180 characters. Keep credentials and contact details private."
      />
      <div>
        <div
          ref={skinsRef}
          id={skinsID}
          role="group"
          aria-label="Skin collection feedback"
          hidden={!skinsError}
          tabIndex={-1}
          aria-describedby={skinsError ? skinsID + "-error" : undefined}
        >
          {skinsError && (
            <p className="field-error" id={skinsID + "-error"}>
              {skinsError}
            </p>
          )}
        </div>
        {product.skin_collection ? (
          <>
            <p>
              Skin total:{" "}
              {skinTotal(product.skin_collection) ?? "Check quantities below"}
            </p>
            <CosmeticsInput
              name="product.skin_collection"
              label="Public skin collection"
              field={{ ...emptyField("skins"), type: "cosmetics" }}
              config={config}
              value={product.skin_collection}
              change={(value) => {
                const parsed = cosmeticsSchema.safeParse(value);
                if (parsed.success)
                  change({ ...product, skin_collection: parsed.data });
                validation?.correct("product.skin_collection");
              }}
              invalid={!!skinsError}
              describedBy={skinsError ? skinsID + "-error" : undefined}
              publicReview
            />
            <Action
              onClick={() => {
                const next = { ...product };
                delete next.skin_collection;
                change(next);
              }}
            >
              Mark skin details as not known
            </Action>
          </>
        ) : (
          <div className="actions">
            <Action
              onClick={() => {
                change({
                  ...product,
                  skin_collection: {
                    groups: [{ category: "", count: "", names: [] }],
                  },
                });
              }}
            >
              Add skin details
            </Action>
            <Action
              onClick={() => {
                change({ ...product, skin_collection: { groups: [] } });
              }}
            >
              Confirm this account has no skins
            </Action>
          </div>
        )}
      </div>
    </section>
  );
}
