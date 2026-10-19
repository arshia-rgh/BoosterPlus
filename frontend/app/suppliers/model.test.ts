import { expect, it } from "vitest";
import { centsText, decimalCents, markupBPS, previewPrice } from "./model";
it("previews precise final totals without float conversion or per-unit rounding", () => {
  expect(previewPrice("100", "1", 1500, null)).toBe("115.00");
  expect(previewPrice("0.335", "3", 0, null)).toBe("1.01");
  expect(previewPrice("0.123456789123456789", "1", 1500, null)).toBe("0.14");
  expect(previewPrice("1e-2", "2", 1500, null)).toBe("0.02");
  expect(previewPrice("10", "1.5", 1500, "1205")).toBe("18.08");
  expect(previewPrice("10", "1", 1500, "1000")).toBe("10.00");
});
it("rejects unavailable, unsafe and unrepresentable previews", () => {
  for (const value of [
    "0",
    "-1",
    "Infinity",
    "0.1234567891234567891",
    "1e19",
    "1e999999",
    "1e",
    "1e2e2",
    "9999999999999",
    "01",
    "0.0000001",
  ])
    expect(previewPrice(value, "1", 1500, null)).toBeNull();
  expect(previewPrice("100000000000", "1", 1500, null)).toBeNull();
  expect(previewPrice("2", "0", 1500, null)).toBeNull();
  expect(previewPrice("2", "1", null, null)).toBeNull();
  expect(previewPrice("2", "1", 1500, "0")).toBeNull();
});
it("accepts ordinary decimal currency and bounded percentages only", () => {
  expect(decimalCents(" 12.05 ")).toBe("1205");
  expect(decimalCents("0.5")).toBe("50");
  expect(markupBPS("15")).toBe(1500);
  expect(markupBPS("0")).toBe(0);
  expect(markupBPS("1000.01")).toBeNull();
  expect(centsText("12345678901")).toBe("123456789.01");
  for (const value of ["", "12.005", "1e2", "01", "-1", "1.", "1.2.3", "NaN"])
    expect(decimalCents(value)).toBeNull();
});
