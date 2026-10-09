/** Exact strings keep a request separate from measured results or a guarantee. */
export type WinRatePreference =
  | { kind: "any" | "invalid" }
  | { kind: "range"; lower: string; upper: string }
  | { kind: "below" | "above" | "exact" | "legacy"; percent: string };

export function isWinRateField(field: {
  type: string;
  key: string;
  unit: string;
  min: string;
  max: string;
}): boolean {
  return (
    field.type === "win_rate" ||
    (field.type === "decimal" &&
      field.key === "requested_win_rate" &&
      field.unit === "%" &&
      field.min === "0" &&
      field.max === "100")
  );
}

function percent(value: string | undefined): value is string {
  return (
    value !== undefined &&
    /^(?:0|[1-9]\d?|100)(?:\.[1-9])?$/.test(value) &&
    Number(value) <= 100
  );
}

export function parseWinRate(value: string | undefined): WinRatePreference {
  if (value === "any") return { kind: "any" };
  if (value === "exact:100") return { kind: "exact", percent: "100" };
  // Old accepted requests remain readable; the new widget does not offer them.
  if (
    value !== undefined &&
    value.length <= 10 &&
    value.split(".").length <= 2 &&
    /^(?:0|[1-9]\d?|100)$/.test(value.split(".")[0] ?? "") &&
    (value.split(".").length === 1 ||
      /^\d{1,6}$/.test(value.split(".")[1] ?? "")) &&
    Number(value) <= 100
  )
    return { kind: "legacy", percent: value };
  const parts = (value ?? "").split(":");
  const [kind, first, second] = parts;
  if (
    kind === "range" &&
    parts.length === 3 &&
    percent(first) &&
    percent(second) &&
    Number(first) < Number(second)
  ) {
    return { kind, lower: first, upper: second };
  }
  if (
    kind === "below" &&
    parts.length === 2 &&
    percent(first) &&
    Number(first) > 0
  ) {
    return { kind, percent: first };
  }
  if (
    kind === "above" &&
    parts.length === 2 &&
    percent(first) &&
    Number(first) < 100
  ) {
    return { kind, percent: first };
  }
  return { kind: "invalid" };
}

export function formatWinRate(value: string): string {
  const preference = parseWinRate(value);
  switch (preference.kind) {
    case "any":
      return "No win-rate preference";
    case "range":
      return `Between ${preference.lower}–${preference.upper}%`;
    case "below":
      return `Below ${preference.percent}%`;
    case "above":
      return `Above ${preference.percent}%`;
    case "exact":
      return "Exactly 100%";
    case "legacy":
      return `${preference.percent}% (previous request)`;
    case "invalid":
      return "Choose a win-rate preference";
  }
}
