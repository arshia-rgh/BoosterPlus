import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// Keep every shipped rendition within its loading budget, including inactive tabs.
const artwork = [
  {
    label: "boost-480",
    data: readFileSync("public/artwork/service-scenes/boost-v1-480.webp"),
    limit: 60000,
  },
  {
    label: "boost-800",
    data: readFileSync("public/artwork/service-scenes/boost-v1-800.webp"),
    limit: 140000,
  },
  {
    label: "boost-1200",
    data: readFileSync("public/artwork/service-scenes/boost-v1-1200.webp"),
    limit: 260000,
  },
  {
    label: "accounts-480",
    data: readFileSync("public/artwork/service-scenes/accounts-v1-480.webp"),
    limit: 60000,
  },
  {
    label: "accounts-800",
    data: readFileSync("public/artwork/service-scenes/accounts-v1-800.webp"),
    limit: 140000,
  },
  {
    label: "accounts-1200",
    data: readFileSync("public/artwork/service-scenes/accounts-v1-1200.webp"),
    limit: 260000,
  },
  {
    label: "shop-480",
    data: readFileSync("public/artwork/service-scenes/shop-v1-480.webp"),
    limit: 60000,
  },
  {
    label: "shop-800",
    data: readFileSync("public/artwork/service-scenes/shop-v1-800.webp"),
    limit: 140000,
  },
  {
    label: "shop-1200",
    data: readFileSync("public/artwork/service-scenes/shop-v1-1200.webp"),
    limit: 260000,
  },
  {
    label: "news-480",
    data: readFileSync("public/artwork/service-scenes/news-v1-480.webp"),
    limit: 60000,
  },
  {
    label: "news-800",
    data: readFileSync("public/artwork/service-scenes/news-v1-800.webp"),
    limit: 140000,
  },
  {
    label: "news-1200",
    data: readFileSync("public/artwork/service-scenes/news-v1-1200.webp"),
    limit: 260000,
  },
  {
    label: "payment-480",
    data: readFileSync("public/artwork/service-scenes/payment-v1-480.webp"),
    limit: 60000,
  },
  {
    label: "payment-800",
    data: readFileSync("public/artwork/service-scenes/payment-v1-800.webp"),
    limit: 140000,
  },
  {
    label: "payment-1200",
    data: readFileSync("public/artwork/service-scenes/payment-v1-1200.webp"),
    limit: 260000,
  },
];

it.each(artwork)(
  "ships valid WebP within the byte budget: $label",
  ({ data, limit }) => {
    expect(data.byteLength).toBeGreaterThan(0);
    expect(data.byteLength).toBeLessThanOrEqual(limit);
    expect(data.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(data.subarray(8, 12).toString("ascii")).toBe("WEBP");
  },
);
