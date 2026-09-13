import { expect, it } from "vitest";
import { publicOrigin, shareMetadata } from "./share";
it("uses only a configured HTTPS origin and never request-host metadata", () => {
  for (const value of [
    undefined,
    "",
    "http://example.com",
    "https://user:secret@example.com",
    "https://example.com/private",
    "https://example.com/?token=private",
    "https://example.com/#private",
    "//example.com",
    "bad",
  ])
    expect(publicOrigin(value)).toBeNull();
  expect(publicOrigin("https://playora.example/")).toBe(
    "https://playora.example",
  );
  expect(shareMetadata(null)).toEqual([]);
  expect(shareMetadata("https://playora.example")).toContainEqual({
    property: "og:image",
    content: "https://playora.example/brand/playora-share.jpg",
  });
});
