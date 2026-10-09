import { z } from "../validation";
import type { FieldIssue } from "../ui/form-validation";
import type { couponDefinitionSchema } from "./coupons";
export function couponIssues(
  c: z.infer<typeof couponDefinitionSchema>,
): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const add = (path: string, message: string) => {
    issues.push({ path, message });
  };
  const decimal = (v: string) => {
    const [integer = "", fraction, ...extra] = v.split(".");
    return (
      extra.length === 0 &&
      /^-?(0|[1-9][0-9]{0,11})$/.test(integer) &&
      (fraction === undefined || /^[0-9]{1,6}$/.test(fraction))
    );
  };
  const whole = (v: string) =>
    decimal(v) && (!v.includes(".") || /^0+$/.test(v.split(".")[1] ?? ""));
  if (!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(c.code))
    add(
      "code",
      "Use 3–40 uppercase letters, digits, underscores or hyphens, starting with a letter or digit.",
    );
  if (
    !c.name.trim() ||
    Array.from(c.name).length > 120 ||
    c.name.includes("\0")
  )
    add("name", "Enter a coupon name of 1–120 characters.");
  if (!["fixed", "percentage"].includes(c.kind))
    add("kind", "Choose the discount kind.");
  if (
    !decimal(c.value) ||
    Number(c.value) <= 0 ||
    (c.kind === "fixed" && !whole(c.value)) ||
    (c.kind === "percentage" && Number(c.value) > 100)
  )
    add(
      "value",
      "Enter a positive whole amount, or a percentage above 0 and no more than 100.",
    );
  if (!["USD", "EUR", "GBP"].includes(c.currency))
    add("currency", "Choose the pricing currency.");
  if (!whole(c.minimum_subtotal) || Number(c.minimum_subtotal) < 0)
    add("minimum_subtotal", "Enter a nonnegative whole amount in minor units.");
  if (
    c.maximum_discount &&
    (!whole(c.maximum_discount) || Number(c.maximum_discount) <= 0)
  )
    add(
      "maximum_discount",
      "Enter a positive whole amount in minor units, or leave this blank.",
    );
  const timestamp = z.iso.datetime({ offset: true });
  if (
    !timestamp.safeParse(c.starts_at).success ||
    new Date(c.starts_at).getUTCFullYear() < 2020
  )
    add(
      "starts_at",
      "Enter a valid start date from 2020 onward, including its timezone.",
    );
  if (
    !timestamp.safeParse(c.ends_at).success ||
    Date.parse(c.ends_at) <= Date.parse(c.starts_at)
  )
    add(
      "ends_at",
      "Enter an end date after the start date, including its timezone.",
    );
  for (const [path, value] of [
    ["global_limit", c.global_limit],
    ["customer_limit", c.customer_limit],
  ] as const)
    if (!Number.isSafeInteger(value) || value < 0 || value > 1e6)
      add(path, "Enter a whole number from 0 (unlimited) to 1,000,000.");
  for (const [path, values] of [
    ["games", c.games],
    ["services", c.services],
    ["packages", c.packages],
    ["categories", c.categories],
  ] as const) {
    const valid = (value: string) =>
      path === "games"
        ? /^[a-z][a-z0-9-]{0,79}$/.test(value)
        : path === "categories"
          ? ["boosting", "account_resale"].includes(value)
          : /^[a-z][a-z0-9_]{0,47}$/.test(value);
    if (
      values.length > 40 ||
      new Set(values).size !== values.length ||
      values.some((value) => !valid(value))
    )
      add(path, "Use up to 40 unique supported eligibility keys.");
  }
  if (!c.categories.length) add("categories", "Choose at least one category.");
  if ((c.services.length || c.packages.length) && !c.games.length)
    add("games", "Choose game slugs when limiting services or packages.");
  return issues;
}
