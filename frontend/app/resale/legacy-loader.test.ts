import { afterEach, expect, it, vi } from "vitest";
import type { PublicListing } from "./model";
import { legacyAccountLoader } from "./legacy-loader.server";
const listing: PublicListing = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  release_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  game: "Game",
  slug: "game",
  state: "published",
  images: [],
  product: {
    title: "Reviewed account",
    description: "Published attributes only",
    region: "Europe",
    rank: "Advanced",
    attributes: [],
    media_ids: [],
    currency: "USD",
    amount_minor: "5000",
    sale_terms: "Exact sale terms",
    transfer_requirements: "Secure transfer",
    dispute_terms: "Dispute terms",
    acknowledgement_terms: "Confirm receipt",
    dispute_hours: 48,
    delivery_min_hours: 1,
    delivery_max_hours: 24,
  },
};
const fetcher = vi.fn<typeof fetch>();
afterEach(() => {
  vi.unstubAllGlobals();
  fetcher.mockReset();
});
function load(query = "", id = listing.id) {
  vi.stubGlobal("fetch", fetcher);
  return legacyAccountLoader({
    request: new Request("https://playora.invalid/accounts/" + id + query),
    params: { id },
  });
}
it("resolves only public data and retains bounded review recovery", async () => {
  fetcher.mockResolvedValue(Response.json(listing));
  const reference = "11111111-1111-4111-8111-111111111111";
  const result = await load(
    "?step=review&request=" +
      reference +
      "&returnTo=https://attacker.invalid&token=private",
  );
  expect(result.status).toBe(302);
  expect(result.headers.get("Location")).toBe(
    `/games/game/accounts/${listing.id}?step=review&request=${reference}`,
  );
  expect(result.headers.get("Cache-Control")).toBe("no-store");
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
    cache: "no-store",
    redirect: "error",
  });
  expect(fetcher.mock.calls[0]?.[1]).toHaveProperty("headers", {});
});
it("drops unknown or malformed state and handles unavailable public listings", async () => {
  fetcher.mockResolvedValueOnce(Response.json(listing));
  expect((await load("?step=pay&request=bad")).headers.get("Location")).toBe(
    `/games/game/accounts/${listing.id}`,
  );
  await expect(load("", "../private")).rejects.toMatchObject({ status: 404 });
  fetcher.mockResolvedValueOnce(new Response(null, { status: 404 }));
  await expect(load()).rejects.toMatchObject({ status: 404 });
  fetcher.mockResolvedValueOnce(new Response(null, { status: 403 }));
  await expect(load()).rejects.toMatchObject({ status: 503 });
  fetcher.mockRejectedValueOnce(new Error("offline"));
  await expect(load()).rejects.toMatchObject({ status: 503 });
  fetcher.mockResolvedValueOnce(
    Response.json({ ...listing, slug: "../private" }),
  );
  await expect(load()).rejects.toMatchObject({ status: 503 });
  fetcher.mockResolvedValueOnce(Response.json({ ...listing, id: "different" }));
  await expect(load()).rejects.toMatchObject({ status: 503 });
});
