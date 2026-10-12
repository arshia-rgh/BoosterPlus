import { useState } from "react";
import { Text } from "./controls";

function decimalParts(
  value: string,
  wholeLimit: number,
  fractionLimit: number,
) {
  if (value.length > wholeLimit + fractionLimit + 1) return null;
  const parts = value.split(".");
  const whole = parts[0] ?? "",
    fraction = parts[1] ?? "";
  if (
    parts.length > 2 ||
    whole.length > wholeLimit ||
    !/^(0|[1-9][0-9]*)$/.test(whole) ||
    fraction.length > fractionLimit ||
    (parts.length === 2 && !/^[0-9]+$/.test(fraction))
  )
    return null;
  return { whole, fraction };
}

/** USD/EUR/GBP use two decimal places. Never round intermediate rule amounts. */
export function majorToMinor(value: string, precision = 8): string | null {
  const parts = decimalParts(value, 10, precision);
  if (!parts) return null;
  const { whole, fraction } = parts;
  const cents = (
    BigInt(whole) * 100n +
    BigInt(fraction.padEnd(2, "0").slice(0, 2))
  ).toString();
  const remainder = fraction.slice(2).replace(/0+$/, "");
  return cents + (remainder ? "." + remainder : "");
}

export function minorToMajor(value: string): string {
  const parts = decimalParts(value, 12, 6);
  if (!parts) return value;
  const { whole, fraction } = parts;
  const padded = whole.padStart(3, "0");
  const decimals = (padded.slice(-2) + fraction)
    .replace(/0+$/, "")
    .padEnd(2, "0");
  return padded.slice(0, -2) + "." + decimals;
}

export default function MoneyInput({
  name,
  label,
  currency,
  value,
  change,
  precision = 8,
}: {
  name: string;
  label: string;
  currency: string;
  value: string;
  change: (value: string) => void;
  precision?: number;
}) {
  const [draft, setDraft] = useState({ value, text: minorToMajor(value) });
  if (value !== draft.value) setDraft({ value, text: minorToMajor(value) });
  const invalid =
    draft.text !== "" && majorToMinor(draft.text, precision) === null;
  return (
    <Text
      name={name}
      label={`${label} (${currency || "choose currency"})`}
      value={draft.text}
      inputMode="decimal"
      help={
        precision === 2
          ? "Enter an amount such as 12.50."
          : "Enter an amount such as 12.50. Extra decimal places are preserved for exact pricing calculations."
      }
      error={
        invalid
          ? `Enter a nonnegative amount with up to ${String(precision)} decimal places, without a currency symbol or commas.`
          : undefined
      }
      change={(text) => {
        const minor = majorToMinor(text, precision) ?? "";
        setDraft({ value: minor, text });
        change(minor);
      }}
    />
  );
}
