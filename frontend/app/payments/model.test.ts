import { expect, it } from "vitest";
import { safeCheckout, paymentMessage } from "./model";
it("permits only exact provider checkout destinations", () => {
  for (const value of ["", "https://nowpayments.io/payment/?iid=123"])
    expect(safeCheckout(value)).toBe(true);
  for (const value of [
    "https://sandbox.nowpayments.io/payment/?iid=123",
    "javascript:alert(1)",
    "http://nowpayments.io/payment/?iid=1",
    "https://nowpayments.io.evil.test/payment/?iid=1",
    "https://u:p@nowpayments.io/payment/?iid=1",
    "https://nowpayments.io/payment/?iid=1&iid=2",
    "https://nowpayments.io/payment/?iid=1&next=evil",
    "https://nowpayments.io/payment/?iid=0",
    "https://nowpayments.io/payment/?iid=1#evil",
    "https://nowpayments.io:444/payment/?iid=1",
    "https://nowpayments.io/other?iid=1",
  ])
    expect(safeCheckout(value)).toBe(false);
});
it("explains financial exceptions without declaring every receipt settled", () => {
  expect(paymentMessage("settled", "overpaid")).toContain("extra amount");
  expect(paymentMessage("exception", "duplicate_payment")).toContain(
    "Another payment",
  );
  expect(paymentMessage("unknown-state")).toContain("reconciled");
});
