import { useEffect, useRef, useState } from "react";
import { Action, ErrorNotice, Select, Text } from "../catalog/controls";
import { listingSchema } from "../catalog/model";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import { denied } from "../support/chat-state";
import { ActionFields, rejectInvalidFields } from "../ui/action-fields";
import { Feedback } from "../ui/feedback";
import { clearPriceIssues, SupplierErrorNotice } from "./feedback";
import { useRecordDraft } from "../ui/record-drafts";
import {
  centsText,
  connections,
  decimalCents,
  deliveryLabels,
  issueLabel,
  markupBPS,
  previewPrice,
  pricingSchema,
  type Connection,
  type Offer,
  type Product,
} from "./model";

export function OfferEditor({
  connection,
  importID,
  product,
  offer,
  close,
  accessLost,
}: {
  connection: Connection;
  importID: string;
  product: Product;
  offer: Offer;
  close: (saved: boolean) => void;
  accessLost: () => void;
}) {
  const original = offer.pricing;
  const initialMode = original.override_minor
    ? "fixed"
    : original.markup_bps === null
      ? "default"
      : "markup";
  const [mode, setMode] = useState(initialMode),
    [markup, setMarkup] = useState(
      centsText(String(original.effective_markup_bps)),
    ),
    [amount, setAmount] = useState(centsText(original.override_minor)),
    [game, setGame] = useState(original.game_id),
    [region, setRegion] = useState(original.region),
    [delivery, setDelivery] = useState(original.delivery_method),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [discard, setDiscard] = useState(false);
  const [gameAfter, setGameAfter] = useState("");
  const games = useResource(
    `/admin/catalog/games?after=${encodeURIComponent(gameAfter)}`,
    listingSchema,
  );
  const [knownGames, setKnownGames] = useState<[string, string][]>([]);
  const gamePage = games.data;
  const [knownPage, setKnownPage] = useState<typeof gamePage>(null);
  if (gamePage && knownPage !== gamePage) {
    setKnownPage(gamePage);
    setKnownGames((previous) => [
      ...new Map([
        ...previous,
        ...gamePage.games
          .filter((item) => !item.archived)
          .map((item): [string, string] => [item.id, item.name]),
      ]).entries(),
    ]);
  }
  useEffect(() => {
    if (denied(games.error)) accessLost();
  }, [games.error, accessLost]);
  const changed =
    mode !== initialMode ||
    markup !== centsText(String(original.effective_markup_bps)) ||
    amount !== centsText(original.override_minor) ||
    game !== original.game_id ||
    region !== original.region ||
    delivery !== original.delivery_method;
  useRecordDraft(changed, busy);
  const heading = useRef<HTMLHeadingElement>(null),
    prompt = useRef<HTMLElement>(null),
    lock = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    heading.current?.focus();
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (discard) prompt.current?.focus();
  }, [discard]);
  const bps = mode === "markup" ? markupBPS(markup) : connection.markup_bps;
  const fixed = mode === "fixed" ? decimalCents(amount) : null;
  const preview =
    mode === "fixed" && (fixed === null || fixed === "0")
      ? null
      : previewPrice(original.cost_usd, original.preview_quantity, bps, fixed);
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      rejectInvalidFields([
        ...(mode === "markup" && bps === null
          ? [
              {
                path: "markup",
                message: "Enter 0–1,000%, with at most two decimal places.",
              },
            ]
          : []),
        ...(mode === "fixed" && (fixed === null || fixed === "0")
          ? [
              {
                path: "amount",
                message:
                  "Enter a positive USD price with at most two decimal places.",
              },
            ]
          : []),
        ...(region.length > 80 || /[\r\n\u0000]/.test(region)
          ? [
              {
                path: "region",
                message: "Use a short region label, up to 80 characters.",
              },
            ]
          : []),
      ]);
      await post(
        `/admin/shop/suppliers/${connection.id}/prices`,
        {
          product_id: product.id,
          offer_id: offer.id,
          settings: {
            import_id: importID,
            version: original.version,
            markup_bps: mode === "markup" ? bps : null,
            override_minor: mode === "fixed" ? fixed : "",
            game_id: game,
            region: region.trim(),
            delivery_method: delivery,
          },
        },
        pricingSchema,
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
    <section className="supplier-offer-editor">
      <p className="eyebrow">
        {connections.find(([id]) => id === connection.id)?.[1] ?? connection.id}
        {" · Private offer"}
      </p>
      <h2 ref={heading} tabIndex={-1}>
        {product.name}
      </h2>
      <p>
        {offer.name} ·{" "}
        {deliveryLabels.get(offer.suggested_delivery) ?? "Needs method review"}
      </p>
      {discard && (
        <section
          role="alert"
          tabIndex={-1}
          ref={prompt}
          className="supplier-notice"
        >
          <h3>Discard these offer changes?</h3>
          <p>
            Your saved settings will stay unchanged. Return to the latest saved
            catalog for{" "}
            {connections.find(([id]) => id === connection.id)?.[1] ??
              connection.id}
            .
          </p>
          <div className="supplier-actions">
            <Action
              onClick={() => {
                setDiscard(false);
              }}
            >
              Keep editing
            </Action>
            <Action
              onClick={() => {
                close(false);
              }}
            >
              Discard changes
            </Action>
          </div>
        </section>
      )}
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
            <legend>Customer price</legend>
            <div className="supplier-price-facts">
              <div>
                <span>Supplier unit cost</span>
                <strong>
                  {original.cost_usd
                    ? `USD ${original.cost_usd}`
                    : "Unavailable"}
                </strong>
              </div>
              <div>
                <span>Preview quantity</span>
                <strong>{original.preview_quantity || "Needs review"}</strong>
              </div>
              <div className="supplier-price-result">
                <span>Customer total · preview</span>
                <strong>
                  {preview === null ? "Check the price" : `USD ${preview}`}
                </strong>
              </div>
            </div>
            <Select
              name="mode"
              label="Price rule"
              value={mode}
              change={(value) => {
                setMode(value);
                setError(clearPriceIssues);
              }}
              options={[
                [
                  "default",
                  `Use default markup (${centsText(String(connection.markup_bps))}%)`,
                ],
                ["markup", "Set offer markup"],
                ["fixed", "Set fixed selling price"],
              ]}
            />
            {mode === "markup" && (
              <Text
                name="markup"
                label="Offer markup (%)"
                value={markup}
                change={setMarkup}
                inputMode="decimal"
                help="Added to supplier cost; this is not profit margin."
              />
            )}
            {mode === "fixed" && (
              <Text
                name="amount"
                label="Fixed unit selling price (USD)"
                value={amount}
                change={setAmount}
                inputMode="decimal"
                help="Replaces the markup rule. Catalog refreshes keep this override."
              />
            )}
            <p className="quiet">
              Prices use this catalog snapshot. Quantities are multiplied before
              rounding the final total. Saving changes neither published
              products nor accepted orders.
            </p>
          </fieldset>
          <fieldset disabled={busy}>
            <legend>Storefront mapping</legend>
            <Select
              name="game"
              label="PLAYORA game"
              value={game}
              change={setGame}
              options={[
                ["", "Not mapped yet"],
                ...(game && !knownGames.some(([id]) => id === game)
                  ? [[game, "Currently assigned game"] as [string, string]]
                  : []),
                ...knownGames,
              ]}
            />
            {!!games.error && <ErrorNotice error={games.error} />}
            {!!games.error && (
              <Action disabled={games.loading} onClick={games.reload}>
                Retry games
              </Action>
            )}
            {!!games.data?.next && (
              <Action
                disabled={games.loading}
                onClick={() => {
                  setGameAfter(games.data?.next ?? "");
                }}
              >
                Load more games
              </Action>
            )}
            <Text
              name="region"
              label="Reviewed account region"
              value={region}
              change={setRegion}
              maxLength={80}
              help="For example Global or Türkiye, only when supported by this exact offer."
            />
            <Select
              name="delivery"
              label="Reviewed delivery method"
              value={delivery}
              change={setDelivery}
              options={[
                ["", "Not reviewed yet"],
                ["id", "Player ID · automatic delivery"],
                ["account", "Account sign-in · 24–72 hours"],
                ["code", "Digital code"],
              ]}
            />
            <p className="quiet">
              This label does not change supplier eligibility or promise instant
              completion. Unfinished mappings can be saved privately.
            </p>
          </fieldset>
          <details>
            <summary>Supplier requirements and review notes</summary>
            {!offer.available && (
              <p>Currently unavailable from the supplier.</p>
            )}
            <ul>
              {[...new Set([...product.review_issues, ...original.issues])].map(
                (issue) => (
                  <li key={issue}>{issueLabel(issue)}</li>
                ),
              )}
            </ul>
            <dl>
              <dt>Quantity</dt>
              <dd>
                {offer.quantity.kind === "one"
                  ? "One per order"
                  : `Minimum ${offer.quantity.min}; ${offer.quantity.max === "0" ? "no supplier maximum provided" : `maximum ${offer.quantity.max}`}; step ${offer.quantity.step}`}
              </dd>
              <dt>Region information</dt>
              <dd>
                {product.region.global
                  ? "Global according to supplier"
                  : product.region.regions?.join(", ") ||
                    "Requires supplier review"}
              </dd>
              <dt>Country policy</dt>
              <dd>
                {product.region.policy_kind || "Not provided"}
                {product.region.policy_countries?.length
                  ? `: ${product.region.policy_countries.join(", ")}`
                  : ""}
              </dd>
              <dt>Excluded countries</dt>
              <dd>
                {product.region.excluded_countries?.join(", ") || "None listed"}
              </dd>
            </dl>
            <h3>Required delivery information</h3>
            {offer.fields.length ? (
              <ul>
                {offer.fields.map((field) => (
                  <li key={field.id}>
                    {field.label} · {field.required ? "Required" : "Optional"}
                    {field.secret ? " · Protected input" : ""}
                    {field.transient ? " · Supplier verification page" : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No input fields supplied.</p>
            )}
            {(offer.code_request || offer.google_prompt || offer.game_exit) && (
              <p>
                Customer participation may be requested during delivery:{" "}
                {[
                  offer.code_request && "verification code",
                  offer.google_prompt && "Google prompt",
                  offer.game_exit && "leave the game",
                ]
                  .filter(Boolean)
                  .join(", ")}
                .
              </p>
            )}
            {offer.instruction && (
              <p className="supplier-source-text">{offer.instruction}</p>
            )}
          </details>
          <div className="supplier-actions">
            <button type="submit" className="button" disabled={busy}>
              {busy ? "Saving…" : "Save private offer"}
            </button>
            <Action
              disabled={busy}
              onClick={() => {
                if (changed) setDiscard(true);
                else close(false);
              }}
            >
              Back to products
            </Action>
          </div>
        </form>
      </ActionFields>
      <Feedback>
        Private review only. This offer is not published or available for
        purchase.
      </Feedback>
    </section>
  );
}
