import { expect, it } from "vitest";
import { maximumDisplay, maximumMinor } from "./market-price";

it("converts exact decimal maxima without rounding or exponent notation", () => {
  expect(maximumMinor(" 12.34 ")).toBe("1234");
  expect(maximumMinor("0.01")).toBe("1");
  expect(maximumMinor("001.2")).toBe("120");
  expect(maximumMinor("9999999999.99")).toBe("999999999999");
  expect(maximumMinor("")).toBe("");
  for (const value of [
    "0",
    "-1",
    "12.345",
    "1e2",
    "1,000",
    ".25",
    "10000000000",
    "NaN",
  ])
    expect(maximumMinor(value)).toBeNull();
  expect(maximumDisplay("1")).toBe("0.01");
  expect(maximumDisplay("1234")).toBe("12.34");
  expect(maximumDisplay("999999999999")).toBe("9999999999.99");
  for (const value of ["", "0", "1e2", "1000000000000"])
    expect(maximumDisplay(value)).toBe("");
});
