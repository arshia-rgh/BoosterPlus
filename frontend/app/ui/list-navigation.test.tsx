import { expect, it } from "vitest";
import { filterQuery } from "./list-navigation";
it("resets stale cursors while preserving independent filter intent", () => {
  const original = new URLSearchParams(
    "after=private-cursor&path=custom&q=game",
  );
  const next = filterQuery(original, { path: "packages" });
  expect(next.toString()).toBe("path=packages&q=game");
  expect(original.get("after")).toBe("private-cursor");
  expect(filterQuery(next, { path: null }).toString()).toBe("q=game");
});
