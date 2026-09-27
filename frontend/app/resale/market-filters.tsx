import { useId, useRef, useState } from "react";
import { Action, Select } from "../catalog/controls";
import MarketGames from "./market-games";
import MarketFilterPanel from "./filter-panel";
import { maximumDisplay, maximumMinor } from "./market-price";

export default function MarketFilters({
  params,
  gameSlug,
  apply,
  clear,
}: {
  params: URLSearchParams;
  gameSlug?: string | undefined;
  apply: (values: Record<string, string>) => void;
  clear: () => void;
}) {
  const id = useId();
  const [slug, setSlug] = useState(gameSlug ?? params.get("slug") ?? "");
  const [sort, setSort] = useState(params.get("sort") || "newest");
  const [currency, setCurrency] = useState(params.get("currency") ?? "");
  const [fields, setFields] = useState(
    () =>
      new Map(
        ["search", "region", "rank"].map((key) => [key, params.get(key) ?? ""]),
      ),
  );
  const [price, setPrice] = useState(
    maximumDisplay(params.get("max_minor") ?? ""),
  );
  const maximum = useRef<HTMLInputElement>(null);
  const currencyInput = useRef<HTMLInputElement>(null);
  const active =
    [
      "search",
      "region",
      "rank",
      "currency",
      "max_minor",
      "after",
      ...(gameSlug ? [] : ["slug"]),
    ].some((key) => params.get(key)) ||
    (params.get("sort") && params.get("sort") !== "newest");
  return (
    <MarketFilterPanel>
      <form
        className="market-filters"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const text = (name: string) => {
            const value = data.get(name);
            return typeof value === "string" ? value.trim() : "";
          };
          const amount = maximumMinor(maximum.current?.value ?? "");
          maximum.current?.setCustomValidity(
            amount === null
              ? "Enter a positive price with at most two decimal places."
              : "",
          );
          currencyInput.current?.setCustomValidity(
            !currency && (amount || sort !== "newest")
              ? "Enter a listing currency to compare prices."
              : "",
          );
          if (!form.reportValidity() || amount === null) return;
          form.closest("dialog")?.close();
          apply({
            slug,
            sort,
            currency,
            max_minor: amount,
            search: text("search"),
            region: text("region"),
            rank: text("rank"),
          });
        }}
      >
        <fieldset>
          <legend>Find an account</legend>
          {!gameSlug && <MarketGames value={slug} change={setSlug} />}
          {(
            [
              ["search", "Search accounts", 120],
              ["region", "Account region", 80],
              ["rank", "Account rank", 80],
            ] as const
          ).map(([key, label, length]) => (
            <div className="catalog-label" key={key}>
              <label htmlFor={`${id}-${key}`}>{label}</label>
              <input
                id={`${id}-${key}`}
                name={key}
                value={fields.get(key) ?? ""}
                onChange={(event) => {
                  setFields(new Map(fields).set(key, event.target.value));
                }}
                maxLength={length}
              />
            </div>
          ))}
          <div className="catalog-label">
            <label htmlFor={`${id}-currency`}>Listing currency</label>
            <input
              ref={currencyInput}
              id={`${id}-currency`}
              value={currency}
              maxLength={3}
              pattern="[A-Z]{3}"
              title="A three-letter listing currency, such as USD"
              aria-describedby={`${id}-currency-help`}
              onChange={(event) => {
                event.currentTarget.setCustomValidity("");
                setCurrency(event.target.value.toUpperCase());
              }}
            />
            <span className="quiet" id={`${id}-currency-help`}>
              Optional unless filtering or sorting by price. Use the currency
              shown on listings; no currency conversion.
            </span>
          </div>
          <div className="catalog-label">
            <label htmlFor={`${id}-maximum`}>
              Maximum price{currency ? ` (${currency})` : ""}
            </label>
            <input
              ref={maximum}
              id={`${id}-maximum`}
              inputMode="decimal"
              maxLength={13}
              value={price}
              aria-describedby={`${id}-maximum-help`}
              onChange={(event) => {
                event.currentTarget.setCustomValidity("");
                currencyInput.current?.setCustomValidity("");
                setPrice(event.target.value);
              }}
            />
            <span className="quiet" id={`${id}-maximum-help`}>
              Optional · up to two decimal places.
            </span>
          </div>
          <Select
            label="Sort accounts"
            value={sort}
            change={(value) => {
              setSort(value);
              currencyInput.current?.setCustomValidity("");
            }}
            options={[
              ["newest", "Newest first"],
              ["price_asc", "Price: low to high"],
              ["price_desc", "Price: high to low"],
            ]}
          />
          <div className="catalog-actions market-filter-actions">
            <button className="button compact" type="submit">
              Apply account filters
            </button>
            {!!active && <Action onClick={clear}>Clear account filters</Action>}
          </div>
        </fieldset>
      </form>
    </MarketFilterPanel>
  );
}
