import { describe, expect, it } from "vitest";
import { formatWinRate, isWinRateField, parseWinRate } from "./win-rate";

describe("win-rate requests", () => {
  it("keeps preferences distinct and readable", () => {
    expect(formatWinRate("any")).toBe("No win-rate preference");
    expect(formatWinRate("range:65.5:80")).toBe("Between 65.5–80%");
    expect(formatWinRate("above:80")).toBe("Above 80%");
    expect(formatWinRate("below:75")).toBe("Below 75%");
    expect(formatWinRate("exact:100")).toBe("Exactly 100%");
    expect(formatWinRate("75.10")).toBe("75.10% (previous request)");
  });
  it.each([
    "exact:99",
    "range:80:80",
    "range:90:70",
    "range:0:101",
    "above:100",
    "below:0",
    "above:7e1",
    "below:09",
    "range:50:70:90",
    "any:50",
  ])("rejects invalid constraint %s", (value) => {
    expect(parseWinRate(value).kind).toBe("invalid");
  });
  it("adapts only the exact original seeded field", () => {
    const field = {
      type: "decimal",
      key: "requested_win_rate",
      unit: "%",
      min: "0",
      max: "100",
    };
    expect(isWinRateField(field)).toBe(true);
    expect(isWinRateField({ ...field, key: "discount" })).toBe(false);
    expect(isWinRateField({ ...field, max: "200" })).toBe(false);
    expect(
      isWinRateField({ ...field, key: "my_win_rate", type: "win_rate" }),
    ).toBe(true);
  });
});
