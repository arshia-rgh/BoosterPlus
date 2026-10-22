// Synthetic ACCOUNTS175 admin review. All API calls stay in this in-memory fixture.
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import AdminShell from "../../../app/admin/shell";
import { PageHeader } from "../../../app/ui/page-header";
import { AuthorizedIdentity } from "../../../app/identity/frame";
import type { Session } from "../../../app/identity/api";
import {
  AccountInventory,
  InventoryDetail,
} from "../../../app/resale/inventory";
import { emptyConfiguration } from "../../../app/catalog/model";
import type { Listing, Product } from "../../../app/resale/model";
import type { Submission } from "../../../app/submissions/model";
import type { SellingProgress } from "../../../app/submissions/selling-progress";
import { fixtureDefaults, fixtureSession } from "../seller-offer/data";
import "../../../app/styles.css";
import "../../../app/ui/design-system.css";
import "../../../app/ui/champagne.css";
import "../../../app/ui/workspace.css";
import "../../../app/admin/admin.css";

const session = {
  ...fixtureSession,
  capabilities: ["admin", "owner"],
} as Session;
document.body.dataset.portal = "admin";
const params = new URLSearchParams(location.search),
  stage = params.get("stage") ?? "mixed";
const mlbb = "11111111-1111-4111-8111-111111111111";
const games = [
  [mlbb, "mobile-legends", "Mobile Legends", false],
  [
    "22222222-2222-4222-8222-222222222222",
    "honor-of-kings",
    "Honor of Kings",
    true,
  ],
].map(([id, slug, name, paused]) => ({
  id: String(id),
  slug: String(slug),
  name: String(name),
  description: "",
  asset: "",
  asset_alt: "",
  paused: !!paused,
  published: true,
  archived: false,
  revision: 1,
}));
const terms = {
  sale_terms:
    "You are buying the account and access described in this listing, including the price breakdown.",
  transfer_requirements:
    "After verified payment, PLAYORA coordinates private handover of the included access.",
  dispute_terms:
    "If the account is reclaimed or materially misdescribed, PLAYORA refunds the purchase payment.",
  acknowledgement_terms:
    "Confirm delivery only after checking that the account matches the accepted listing.",
};
const empty: Product = {
  ...fixtureDefaults.buyer,
  ...terms,
  attributes: [],
  media_ids: [],
  currency: "USD",
  amount_minor: "",
  dispute_hours: 168,
  delivery_min_hours: 0,
  delivery_max_hours: 0,
};
const complete = (title: string, base: string): Product => {
  const fee = String(Math.round(Number(base) * 0.05));
  const total = String(Number(base) + Number(fee));
  return {
    ...empty,
    title,
    description:
      "Reviewed synthetic account with every hero unlocked, two Collector skins and a clean match history.",
    region: "Europe",
    rank: "Mythical Glory",
    amount_minor: total,
    commission: {
      version: "account_commission_v1",
      base_minor: base,
      fee_minor: fee,
      total_minor: total,
    },
    delivery_min_hours: 1,
    delivery_max_hours: 24,
  };
};
const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const row = (
  n: number,
  origin: Listing["origin"],
  state: string,
  draft: Product,
  extra: Partial<Listing> = {},
): Listing => ({
  id: uuid(n),
  submission_id: origin === "playora" ? "" : uuid(900 + n),
  offer_id: origin === "playora" ? "" : uuid(800 + n),
  origin,
  ownership: origin === "consignment" ? "seller" : "playora",
  ...(origin === "buy_first" ? { seller_payout_confirmed: true } : {}),
  version: 3,
  state,
  game: "Mobile Legends",
  slug: "mobile-legends",
  release_id: ["published", "reserved", "sold", "withdrawn"].includes(state)
    ? uuid(700 + n)
    : "",
  draft,
  ...extra,
});
let listings: Listing[] =
  stage === "empty"
    ? []
    : [
        row(
          1,
          "playora",
          "draft",
          { ...empty, title: "Mythic account with Ling Collector" },
          {
            blockers: [
              "listing_details",
              "listing_price",
              "listing_terms",
              "publication",
            ],
          },
        ),
        row(
          2,
          "buy_first",
          "published",
          complete("Legend account, 110 heroes", "10000"),
        ),
        row(
          3,
          "consignment",
          "reserved",
          complete("Epic account with Starlight skins", "5000"),
        ),
        row(
          4,
          "playora",
          "sold",
          complete("Mythical Glory main account", "18000"),
        ),
        row(
          5,
          "consignment",
          "withdrawn",
          complete("Grandmaster starter account", "2500"),
        ),
        row(
          6,
          "buy_first",
          "draft",
          { ...empty, title: "" },
          { seller_payout_confirmed: false },
        ),
        row(
          7,
          "playora",
          "draft",
          complete(`Account${"X".repeat(73)}`, "40000"),
          {
            blockers: ["publication"],
          },
        ),
      ];
// Editor stages adjust the PLAYORA draft directly.
const editable = listings.find((value) => value.id === uuid(1));
if (editable && stage === "unavailable") {
  editable.draft = complete("Mythic account with Ling Collector", "12000");
  editable.blockers = ["game_unavailable", "publication"];
}
if (editable && stage === "ready") {
  editable.draft = complete("Mythic account with Ling Collector", "12000");
  editable.blockers = ["publication"];
}
if (editable && stage === "full") {
  editable.draft = {
    ...complete("Mythic account with Ling Collector", "12000"),
    media_ids: Array.from({ length: 8 }, (_, i) => uuid(600 + i)),
    cover_media_id: uuid(600),
  };
  editable.blockers = ["publication"];
}
let created = 0,
  uncertainPending = stage === "uncertain",
  conflictPending = stage === "conflict";
const config = emptyConfiguration("Mobile Legends");
const submission = (listing: Listing): Submission => ({
  submission: {
    id: listing.submission_id,
    version: 4,
    title: listing.draft.title || "Seller account",
    game: "Mobile Legends",
    state: "accepted",
    created_at: "2026-10-20T09:00:00Z",
    updated_at: "2026-10-21T09:00:00Z",
  },
  offer: {
    id: "release",
    game_id: mlbb,
    slug: "mobile-legends",
    version: 1,
    configuration: config,
    paused: false,
    created_at: "2026-10-20T09:00:00Z",
  },
  answers: {},
  ownership_notes: "",
  ownership_declared: true,
  note: "",
  conversation_id: uuid(500),
});
const progress = (listing: Listing): SellingProgress => ({
  submission_state: "accepted",
  offer_state: "accepted",
  offer_id: listing.offer_id,
  arrangement: listing.origin === "buy_first" ? "buy_first" : "consignment",
  handover: {
    state: "received",
    locked: false,
    received_at: "2026-10-21T09:00:00Z",
  },
  listing_id: listing.id,
  listing_state: listing.state,
  payout_state:
    listing.origin === "buy_first"
      ? listing.seller_payout_confirmed
        ? "confirmed"
        : "verified"
      : "",
  blockers: ["reserved", "sold", "published"].includes(listing.state)
    ? []
    : [
        ...(listing.origin === "buy_first" && !listing.seller_payout_confirmed
          ? ["seller_payment"]
          : []),
        "listing_details",
        "publication",
      ],
});
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
    location.href,
  );
  if (!url.pathname.startsWith("/api/v1/")) return originalFetch(input, init);
  const method = init?.method ?? "GET";
  const send = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  await new Promise((resolve) =>
    setTimeout(resolve, stage === "slow" ? 1200 : 150),
  );
  const path = url.pathname.slice("/api/v1".length);
  if (path.endsWith("/session")) return send(session);
  if (path === "/admin/catalog/games") return send({ games, next: "" });
  if (path === "/admin/account-agreement-defaults")
    return send(fixtureDefaults);
  if (path.startsWith("/admin/artwork/") && method === "PUT") {
    const id = path.split("/")[3] ?? uuid(650);
    const variant = (width: number) => ({
      width,
      height: Math.round(width * 0.56),
      size: 1000,
      content_type: "image/png",
      checksum: "0".repeat(64),
    });
    return send({
      id,
      asset: `/api/v1/artwork/${id}/wide`,
      purpose: "account",
      width: 1600,
      height: 900,
      focus_x: 50,
      focus_y: 50,
      variants: {
        wide: variant(1600),
        "wide-small": variant(800),
        card: variant(640),
        thumb: variant(320),
      },
    });
  }
  if (path === "/admin/account-listings" && method === "GET") {
    if (stage === "error") return send({ code: "fixture_failure" }, 503);
    const state = url.searchParams.get("state") ?? "",
      ownership = url.searchParams.get("ownership") ?? "";
    const matches = (value: Listing) => !state || value.state === state;
    return send({
      items: listings.filter(
        (value) =>
          matches(value) && (!ownership || value.ownership === ownership),
      ),
      next: "",
      counts: {
        playora: listings.filter(
          (value) => matches(value) && value.ownership === "playora",
        ).length,
        seller: listings.filter(
          (value) => matches(value) && value.ownership === "seller",
        ).length,
      },
    });
  }
  const body = JSON.parse(
    typeof init?.body === "string" ? init.body : "{}",
  ) as {
    request_key?: string;
    game_id?: string;
    title?: string;
    version?: number;
    product?: Product;
  };
  if (path === "/admin/account-listings" && method === "POST") {
    // Exposed only so the review harness can count create requests.
    document.body.dataset.creates = String(
      Number(document.body.dataset.creates ?? "0") + 1,
    );
    if (uncertainPending) {
      uncertainPending = false;
      throw new TypeError("Failed to fetch");
    }
    const existing = listings.find((value) => value.id === body.request_key);
    if (existing) return send(existing);
    created++;
    const game = games.find((value) => value.id === body.game_id);
    const next = row(
      100 + created,
      "playora",
      "draft",
      { ...empty, title: body.title ?? "" },
      {
        id: body.request_key ?? uuid(100 + created),
        version: 1,
        game: game?.name ?? "",
        slug: game?.slug ?? "",
        blockers: [
          "listing_details",
          "listing_price",
          "listing_terms",
          "publication",
        ],
      },
    );
    listings = [...listings, next];
    return send(next);
  }
  const match =
    /^\/admin\/account-listings\/([^/]+)(?:\/(save|publish|withdraw))?$/.exec(
      path,
    );
  if (match) {
    const current = listings.find((value) => value.id === match[1]);
    if (!current) return send({ code: "not_found" }, 404);
    if (!match[2]) return send(current);
    if (conflictPending) {
      conflictPending = false;
      current.version++;
      return send({ code: "resale_conflict" }, 409);
    }
    if (body.version !== current.version)
      return send({ code: "resale_conflict" }, 409);
    if (match[2] === "publish" && stage === "unavailable")
      return send({ code: "resale_game_unavailable" }, 409);
    if (body.product) current.draft = body.product;
    current.version++;
    if (match[2] === "publish") {
      current.state = "published";
      current.release_id = uuid(777);
      current.blockers = [];
    }
    if (match[2] === "withdraw") current.state = "withdrawn";
    return send(current);
  }
  const listingFor = (id: string) =>
    listings.find((value) => value.submission_id === id) ?? listings[1];
  const seller = /^\/admin\/submissions\/([^/]+)(\/selling-progress)?$/.exec(
    path,
  );
  if (seller) {
    const current = listingFor(seller[1] ?? "");
    if (!current) return send({ code: "not_found" }, 404);
    return send(seller[2] ? progress(current) : submission(current));
  }
  if (path.includes("/messages")) return send({ messages: [], next: 0 });
  return send({ code: "not_found" }, 404);
};
function Frame({ title }: { title: string }) {
  return (
    <AuthorizedIdentity value={{ session, refresh: async () => {} }}>
      <AdminShell session={session} title={title}>
        <main id="main" className="page identity-page" data-portal="admin">
          <PageHeader title={title} eyebrow="Admin workspace" />
          <Outlet />
        </main>
      </AdminShell>
    </AuthorizedIdentity>
  );
}
const root = document.getElementById("root");
if (!root) throw new Error("Missing fixture root");
createRoot(root).render(
  <RouterProvider
    router={createBrowserRouter([
      {
        element: <Frame title="Account inventory" />,
        children: [{ path: "/admin/accounts", element: <AccountInventory /> }],
      },
      {
        element: <Frame title="Account listing" />,
        children: [
          { path: "/admin/accounts/:id", element: <InventoryDetail /> },
        ],
      },
    ])}
  />,
);
