import { ListFilters, type FilterValues } from "../ui/list-filters";
import MarketGames from "./market-games";
import { maximumDisplay, maximumMinor } from "./market-price";
export default function MarketFilters({
  params,
  gameSlug,
  apply,
}: {
  params: URLSearchParams;
  gameSlug?: string | undefined;
  apply: (values: Record<string, string>) => void;
  clear: () => void;
}) {
  const values = Object.fromEntries(
    [
      "search",
      "region",
      "rank",
      "currency",
      "sort",
      ...(!gameSlug ? ["slug"] : []),
    ].map((key) => [key, params.get(key) ?? (key === "sort" ? "newest" : "")]),
  );
  values.max_price = maximumDisplay(params.get("max_minor") ?? "");
  return (
    <ListFilters
      title="Account filters"
      values={values}
      defaults={{ sort: "newest" }}
      search={{ key: "search", label: "Search accounts" }}
      fields={[
        ...(!gameSlug
          ? [
              {
                key: "slug",
                label: "Game",
                render: (value: string, change: (value: string) => void) => (
                  <MarketGames value={value} change={change} />
                ),
              },
            ]
          : []),
        { key: "region", label: "Account region", maxLength: 80 },
        { key: "rank", label: "Account rank", maxLength: 80 },
        {
          key: "currency",
          label: "Listing currency",
          maxLength: 3,
          help: "e.g. USD — needed for price filters.",
        },
        {
          key: "max_price",
          label: "Maximum price",
          inputMode: "decimal",
          maxLength: 13,
        },
        {
          key: "sort",
          label: "Sort accounts",
          options: [
            ["newest", "Newest first"],
            ["price_asc", "Price: low to high"],
            ["price_desc", "Price: high to low"],
          ],
        },
      ]}
      normalize={(next, changed) => {
        if (changed === "currency") {
          next.currency = next.currency?.toUpperCase() ?? "";
          if (!next.currency) {
            next.max_price = "";
            next.sort = "newest";
          }
        }
        return next;
      }}
      validate={(next) => {
        const errors: FilterValues = {};
        if (maximumMinor(next.max_price ?? "") === null)
          errors.max_price =
            "Enter a positive price with at most two decimal places.";
        if (next.currency && !/^[A-Z]{3}$/.test(next.currency))
          errors.currency =
            "Enter a three-letter listing currency, such as USD.";
        else if (
          !next.currency &&
          (next.max_price || (next.sort && next.sort !== "newest"))
        )
          errors.currency = "Enter a listing currency to compare prices.";
        return errors;
      }}
      apply={(next) => {
        const { max_price, ...rest } = next;
        apply(
          Object.fromEntries(
            Object.entries({
              ...rest,
              max_minor: maximumMinor(max_price ?? "") ?? "",
              ...(gameSlug ? { slug: gameSlug } : {}),
            }).filter(([, value]) => !!value),
          ),
        );
      }}
    />
  );
}
