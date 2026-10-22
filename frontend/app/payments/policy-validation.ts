import { paymentRoutes, maximumRoutes } from "./routes";
import type { FieldIssue } from "../ui/form-validation";
import { remedyLabels, remedyText, type Policy } from "./model";

function text(value: string, min: number, max: number) {
  return (
    !value.includes("\0") &&
    Array.from(value.trim()).length >= min &&
    Array.from(value).length <= max
  );
}
function integer(value: number, min: number, max: number) {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}
/** Mirrors payment policy/remedy validation; the server remains authoritative. */
export function policyIssues(value: Policy): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const add = (path: string, message: string) => {
    issues.push({ path, message });
  };
  if (!text(value.label, 1, 120))
    add("label", "Enter a policy title of 1–120 characters.");
  if (!text(value.text, 20, 8000))
    add("text", "Enter the customer payment terms using 20–8,000 characters.");
  for (const [key] of remedyLabels) {
    const entry = value.remedies ? remedyText(value.remedies, key) : "";
    if (!text(entry, 20, 2000))
      add(
        "remedies." + key,
        "Enter the approved terms using 20–2,000 characters.",
      );
  }
  const remedies = value.remedies;
  if (!remedies || !integer(remedies.dispute_hours, 1, 8760))
    add(
      "remedies.dispute_hours",
      "Enter a whole number from 1 to 8,760 hours.",
    );
  if (
    !remedies ||
    !integer(remedies.appeal_hours, 0, 720) ||
    (remedies.max_appeals > 0 && remedies.appeal_hours === 0)
  )
    add(
      "remedies.appeal_hours",
      "Enter 0–720 whole hours. Allow at least 1 hour when appeals are available.",
    );
  if (!remedies || !integer(remedies.max_appeals, 0, 3))
    add("remedies.max_appeals", "Enter a whole number from 0 to 3 appeals.");
  if (!["merchant", "customer"].includes(value.fee_mode))
    add("fee_mode", "Choose who pays the processing fees.");
  if (!["fixed", "floating"].includes(value.rate_mode))
    add("rate_mode", "Choose a fixed or floating exchange rate.");
  if (!integer(value.window_minutes, 15, 1440))
    add("window_minutes", "Enter a whole number from 15 to 1,440 minutes.");
  if (
    value.currencies.length < 1 ||
    value.currencies.length > 3 ||
    new Set(value.currencies).size !== value.currencies.length ||
    value.currencies.some(
      (currency) => !["USD", "EUR", "GBP"].includes(currency),
    )
  )
    add(
      "currencies",
      "Choose at least one supported pricing currency, without duplicates.",
    );
  if (value.routes.length < 1 || value.routes.length > maximumRoutes)
    add(
      "routes",
      "Choose between 1 and 40 approved coin and network combinations.",
    );
  const seen = new Set<string>();
  value.routes.forEach((route, index) => {
    const path = "routes." + String(index);
    const known = paymentRoutes.find((value) => value.code === route.code);
    if (known && known.network !== route.network)
      add("routes", "Choose the matching coin and network from the list.");
    if (!/^[a-z0-9]{1,32}$/.test(route.code) || seen.has(route.code))
      add(
        path + ".code",
        "Remove the invalid or duplicate saved option and choose its replacement from the list.",
      );
    seen.add(route.code);
    if (!text(route.label, 1, 80))
      add(
        path + ".label",
        "Remove the saved option with an invalid label and choose its replacement from the list.",
      );
    if (!/^[a-z0-9][a-z0-9_-]{0,31}$/.test(route.network))
      add(
        path + ".network",
        "Remove the saved option with an invalid network and choose its replacement from the list.",
      );
  });
  return issues;
}
