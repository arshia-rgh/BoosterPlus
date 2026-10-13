import { expect, it } from "vitest";
import { buyerCommission, sellerCommission } from "./commissions";

it("uses independent half-up cent rounding and includes only the buyer fee in checkout", () => {
  expect(buyerCommission("10000")).toMatchObject({
    fee_minor: "500",
    total_minor: "10500",
  });
  expect(buyerCommission("4999")).toMatchObject({
    fee_minor: "250",
    total_minor: "5249",
  });
  expect(buyerCommission("10")).toMatchObject({
    fee_minor: "1",
    total_minor: "11",
  });
  expect(buyerCommission("1")).toMatchObject({
    fee_minor: "0",
    total_minor: "1",
  });
  expect(
    sellerCommission(
      "4999",
      "1.000000001",
      "synthetic quote",
      "2026-10-13T10:00:00Z",
    ),
  ).toMatchObject({
    fee_minor: "500",
    net_minor: "4499",
    net_amount: "44.990001",
  });
});
it("rejects malformed, unbounded and zero prices and conversion rates", () => {
  for (const base of ["0", "-1", "1.1", "01", "1e3", "999999999999"])
    expect(buyerCommission(base)).toBeNull();
  for (const rate of ["0", "-1", "Infinity", "1e3", "1/2", "1000000000000"])
    expect(
      sellerCommission("100", rate, "synthetic", "2026-10-13T10:00:00Z"),
    ).toBeNull();
});
