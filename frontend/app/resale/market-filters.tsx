import { useId, useRef, useState } from "react";
import { Action, Select } from "../catalog/controls";
import MarketGames from "./market-games";
import MarketFilterPanel from "./filter-panel";
import { maximumDisplay, maximumMinor } from "./market-price";
import { focusValidationTarget } from "../ui/form-validation";

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
  const [errors, setErrors] = useState({ price: "", currency: "" });
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
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const text = (name: string) => {
            const value = data.get(name);
            return typeof value === "string" ? value.trim() : "";
          };
          const amount = maximumMinor(maximum.current?.value ?? "");
          const nextErrors = {
            price:
              amount === null
                ? "Enter a positive price with at most two decimal places."
                : "",
            currency:
              currency && !/^[A-Z]{3}$/.test(currency)
                ? "Enter a three-letter listing currency, such as USD."
                : !currency && (amount || sort !== "newest")
                  ? "Enter a listing currency to compare prices."
                  : "",
          };
          setErrors(nextErrors);
          if (nextErrors.price || nextErrors.currency || amount === null) {
            focusValidationTarget(
              nextErrors.currency ? currencyInput.current : maximum.current,
            );
            return;
          }
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
              aria-invalid={!!errors.currency || undefined}
              aria-describedby={`${id}-currency-help${errors.currency ? ` ${id}-currency-error` : ""}`}
              onChange={(event) => {
                setErrors((old) => ({ ...old, currency: "" }));
                setCurrency(event.target.value.toUpperCase());
              }}
            />
            <span className="quiet" id={`${id}-currency-help`}>
              e.g. USD — needed for price filters.
            </span>
            {errors.currency && (
              <p
                className="field-error"
                id={`${id}-currency-error`}
                role="alert"
              >
                {errors.currency}
              </p>
            )}
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
              aria-invalid={!!errors.price || undefined}
              aria-describedby={
                errors.price ? `${id}-maximum-error` : undefined
              }
              onChange={(event) => {
                setErrors({ price: "", currency: "" });
                setPrice(event.target.value);
              }}
            />
            {errors.price && (
              <p
                className="field-error"
                id={`${id}-maximum-error`}
                role="alert"
              >
                {errors.price}
              </p>
            )}
          </div>
          <Select
            label="Sort accounts"
            value={sort}
            change={(value) => {
              setSort(value);
              setErrors((old) => ({ ...old, currency: "" }));
            }}
            options={[
              ["newest", "Newest first"],
              ["price_asc", "Price: low to high"],
              ["price_desc", "Price: high to low"],
            ]}
          />
          <div className="form-actions market-filter-actions">
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
