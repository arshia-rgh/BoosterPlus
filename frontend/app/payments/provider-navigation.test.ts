import { describe, expect, it, vi } from "vitest";
import { continueToProvider } from "./provider-navigation";

describe("provider navigation", () => {
  it("uses the allowlisted provider only", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });
    try {
      for (const value of [
        "",
        "javascript:alert(1)",
        "https://nowpayments.io.evil.test/payment/?iid=1",
        "https://nowpayments.io/payment/?iid=1&redirect=https://evil.test",
        "https://nowpayments.io/payment/?iid=1&iid=2",
      ])
        continueToProvider(value);
      expect(assign).not.toHaveBeenCalled();
      continueToProvider("https://nowpayments.io/payment/?iid=123");
      expect(assign).toHaveBeenCalledExactlyOnceWith(
        "https://nowpayments.io/payment/?iid=123",
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
