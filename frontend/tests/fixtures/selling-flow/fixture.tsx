import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router";
import SubmissionWorkspace from "../../../app/submissions/workspace";
import { SubmissionList, NewSubmission } from "../../../app/submissions/pages";
import { InventoryDetail } from "../../../app/resale/inventory";
import SellerPayoutQueue from "../../../app/resale/payout-queue";
import { AuthorizedIdentity } from "../../../app/identity/frame";
import {
  fixtureSession,
  fixtureDefaults,
  fixturePolicy,
} from "../seller-offer/data";
import { emptyConfiguration, emptyField } from "../../../app/catalog/model";
import type { Submission } from "../../../app/submissions/model";
import type { SellingProgress } from "../../../app/submissions/selling-progress";
import type { Listing, Offer, Product } from "../../../app/resale/model";
import type { Transfer } from "../../../app/payments/cases-model";
import type { Session } from "../../../app/identity/api";
import "../../../app/styles.css";
import "../../../app/admin/admin.css";
import "../../../app/home/home.css";
import "../../../app/experience/experience.css";
import "../../../app/ui/design-system.css";
import "../../../app/ui/workspace.css";
const params = new URLSearchParams(location.search),
  stage = params.get("stage") ?? "accepted",
  admin = location.pathname.startsWith("/admin"),
  owner = params.get("role") !== "staff";
document.body.dataset.portal = admin ? "admin" : "customer";
document.body.className = admin ? "admin-app" : "storefront-app";
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  listingID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  offerID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const config = emptyConfiguration("Mobile Legends");
config.intake = {
  name: "Account details",
  description:
    "Mention your rank, server and notable items. Your review remains private.",
  fields: [
    {
      ...emptyField("region"),
      key: "region",
      label: "Region",
      type: "short_text",
      stage: "order",
      required: true,
      max_length: 80,
    },
  ],
  rules: [],
};
const initialState: Submission["submission"]["state"] =
  stage === "draft"
    ? "draft"
    : stage === "needs_information"
      ? "needs_information"
      : stage === "submitted"
        ? "submitted"
        : stage === "approved" || stage === "offered" || stage === "expired"
          ? "approved_pending_terms"
          : stage === "rejected"
            ? "rejected"
            : "accepted";
const submission: Submission = {
  submission: {
    id,
    version: 1,
    title: "My Mythic account",
    game: "Mobile Legends",
    state: initialState,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  offer: {
    id: "release",
    game_id: "game",
    slug: "mobile-legends",
    version: 1,
    configuration: config,
    paused: false,
    created_at: new Date().toISOString(),
  },
  answers: { region: "Europe" },
  ownership_notes: "",
  ownership_declared: false,
  note:
    stage === "needs_information"
      ? "Please add your current rank and a screenshot of the skins."
      : "",
  conversation_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
};
const accepted = initialState === "accepted";
const received = [
  "received",
  "listing",
  "buy_first",
  "buy_first_destination",
  "published",
  "reserved",
  "sold",
  "withdrawn",
  "unavailable",
  "incomplete",
  "ready",
].includes(stage);
const hasListing = received || stage === "listing_missing_handover";
const progress: SellingProgress = {
  submission_state: initialState,
  offer_state: accepted
    ? "accepted"
    : stage === "offered"
      ? "offered"
      : stage === "expired"
        ? "expired"
        : "",
  offer_id: accepted || ["offered", "expired"].includes(stage) ? offerID : "",
  arrangement: stage.startsWith("buy_first") ? "buy_first" : "consignment",
  handover: {
    state:
      stage === "expired_handover"
        ? "expired"
        : stage === "returned"
          ? "refresh_required"
          : received
            ? "received"
            : "missing",
    locked: ["published", "reserved", "sold"].includes(stage),
    received_at: received ? new Date().toISOString() : null,
  },
  listing_id: hasListing ? listingID : "",
  listing_state: [
    "published",
    "reserved",
    "sold",
    "withdrawn",
    "unavailable",
  ].includes(stage)
    ? stage
    : hasListing
      ? "draft"
      : "",
  payout_state: stage === "buy_first" ? "verified" : "recipient_pending",
  blockers: accepted
    ? [
        ...(stage.startsWith("buy_first") ? ["seller_payment"] : []),
        ...(hasListing
          ? ["listing_details", "listing_terms", "publication"]
          : ["listing"]),
      ]
    : [],
};
if (["published", "reserved", "sold"].includes(stage)) progress.blockers = [];
if (stage === "unavailable") progress.blockers = ["game_unavailable"];
if (stage === "ready") {
  progress.blockers = ["publication"];
  progress.handover = { state: "missing", locked: false, received_at: null };
}
const offer: Offer = {
  id: offerID,
  submission_id: id,
  version: 2,
  terms: {
    ...fixtureDefaults.seller_consignment,
    model: progress.arrangement as "consignment" | "buy_first",
    amount: "90.000000",
    commission: {
      version: "account_commission_v1",
      base_minor: "10000",
      fee_minor: "1000",
      net_minor: "9000",
      rate: "1",
      rate_source: "Synthetic quote",
      quoted_at: new Date().toISOString(),
      net_amount: "90.000000",
    },
  },
  state: accepted ? "accepted" : "offered",
  accepted_at: accepted ? new Date().toISOString() : null,
  control_verified_at: null,
  created_at: new Date().toISOString(),
  expires_at: new Date(
    Date.now() + (stage === "expired" ? -1 : 1) * 86400000,
  ).toISOString(),
};
const listing: Listing = {
  id: listingID,
  submission_id: id,
  offer_id: offerID,
  origin: stage.startsWith("buy_first") ? "buy_first" : "consignment",
  ownership: stage.startsWith("buy_first") ? "playora" : "seller",
  ...(stage.startsWith("buy_first")
    ? { seller_payout_confirmed: stage !== "buy_first" }
    : {}),
  version: 1,
  state: progress.listing_state || "draft",
  game: "Mobile Legends",
  slug: "mobile-legends",
  release_id: stage === "published" ? "release" : "",
  draft: {
    ...fixtureDefaults.buyer,
    title: stage === "incomplete" ? "" : "Mythic account with rare skins",
    description:
      "Reviewed synthetic account description with its included game assets.",
    region: "Europe",
    rank: "Mythic",
    sale_terms: "Synthetic buyer sale terms for this exact account.",
    transfer_requirements: "Synthetic secure account delivery requirements.",
    dispute_terms: "Synthetic buyer protection and dispute terms.",
    acknowledgement_terms: "Check access before acknowledging receipt.",
    delivery_min_hours: 1,
    delivery_max_hours: 24,
    amount_minor: "10500",
    commission: {
      version: "account_commission_v1",
      base_minor: "10000",
      fee_minor: "500",
      total_minor: "10500",
    },
  },
};
const session = {
  ...fixtureSession,
  portal: admin ? "admin" : "customer",
  capabilities: admin ? ["admin", ...(owner ? ["owner"] : [])] : ["account"],
  user: {
    ...fixtureSession.user,
    portal: admin ? "admin" : "customer",
    role: admin ? (owner ? "owner" : "administrator") : "customer",
  },
} as Session;
const payout: Transfer = {
  id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  order_id: "",
  case_id: "",
  receipt_id: "",
  kind: "seller_payout",
  currency: "usdtbsc",
  network: "bsc",
  amount: "90.000000",
  terms: "Synthetic agreed seller payout.",
  state: progress.payout_state,
  issue: "",
  version: 1,
  recipient: { address: "", memo: "" },
  recipient_at: null,
  approved_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
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
  if (url.origin !== location.origin || !url.pathname.startsWith("/api/v1/"))
    return originalFetch(input, init);
  const path = url.pathname,
    method = init?.method ?? "GET",
    body = (
      typeof init?.body === "string" ? JSON.parse(init.body) : {}
    ) as Partial<Submission> & { product?: Product; title?: string };
  const send = (data: unknown, status = 200) =>
    Promise.resolve(
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  if (path.endsWith("/session")) return send(session);
  if (path.endsWith("/selling-progress"))
    return stage === "error"
      ? send({ code: "internal_error" }, 503)
      : send(progress);
  if (path.endsWith("/finance/policy")) return send(fixturePolicy);
  if (path.endsWith("/finance/payouts"))
    return send({ enabled: false, items: [], next: "" });
  if (path.endsWith("/account-agreement-defaults"))
    return send(fixtureDefaults);
  if (path.endsWith("/offers"))
    return send({ offers: progress.offer_id ? [offer] : [] });
  if (path.endsWith("/payouts"))
    return send({ transfers: stage.startsWith("buy_first") ? [payout] : [] });
  if (path === `/api/v1/payouts/${payout.id}/recipient` && method === "POST") {
    payout.state = "verified";
    payout.version++;
    payout.recipient = { address: "synthetic-confirmed-address", memo: "" };
    payout.recipient_at = new Date().toISOString();
    progress.payout_state = "verified";
    return send(payout);
  }
  if (path.endsWith("/history") || path.endsWith("/events"))
    return send({ events: [] });
  if (path.endsWith("/messages")) return send({ messages: [], next: 0 });
  if (path.endsWith("/secret")) {
    if (method === "POST") {
      progress.handover = {
        state: "received",
        locked: false,
        received_at: new Date().toISOString(),
      };
      progress.blockers = progress.blockers.filter((c) => c !== "handover");
    }
    return send({
      version: progress.handover.state === "received" ? 1 : 0,
      state: progress.handover.state === "received" ? "active" : "missing",
      expires_at: null,
    });
  }
  if (path.endsWith("/secret/reveal"))
    return send({ value: btoa("Synthetic isolated account access") });
  if (path.endsWith("/listing")) {
    progress.listing_id = listingID;
    progress.listing_state = "draft";
    progress.blockers = progress.blockers.filter((c) => c !== "listing");
    return send(listing);
  }
  if (path.includes("/account-listings/")) {
    if (method === "POST") {
      listing.version++;
      if (body.product) listing.draft = body.product;
      if (path.endsWith("/publish")) {
        listing.state = "published";
        progress.listing_state = "published";
        progress.blockers = [];
      } else
        progress.blockers = progress.blockers.filter(
          (c) => !c.startsWith("listing_"),
        );
    }
    return send(listing);
  }
  if (path.endsWith("/edit")) {
    Object.assign(submission, body);
    if (body.title !== undefined) submission.submission.title = body.title;
    submission.submission.version++;
    return send(submission);
  }
  if (path.endsWith("/submit")) {
    submission.submission.version++;
    submission.submission.state = "submitted";
    progress.submission_state = "submitted";
    return send(submission);
  }
  if (path.endsWith("/submissions")) {
    if (method === "POST") {
      submission.submission.state = "draft";
      submission.submission.title = body.title ?? "New account";
      Object.assign(progress, {
        submission_state: "draft",
        offer_state: "",
        offer_id: "",
        arrangement: "",
        listing_id: "",
        listing_state: "",
        payout_state: "",
        blockers: [],
        handover: { state: "missing", locked: false, received_at: null },
      });
      return send(submission);
    }
    return send({ items: [submission.submission], next: "" });
  }
  if (path.includes("/submissions/")) return send(submission);
  if (path.endsWith("/catalog/games"))
    return send({
      games: [
        {
          id: "game",
          name: "Mobile Legends",
          slug: "mobile-legends",
          intake_enabled: true,
          paused: false,
          description: "Ranked accounts for review",
          asset: "",
          asset_alt: "",
          published: true,
          archived: false,
          revision: 1,
        },
      ],
      next: "",
    });
  if (path.includes("/catalog/games/")) return send(submission.offer);
  return send({ code: "not_found" }, 404);
};
function Frame() {
  return (
    <AuthorizedIdentity.Provider value={{ session, refresh: async () => {} }}>
      <div className={admin ? undefined : "experience workspace-experience"}>
        <main
          className={
            admin
              ? "admin-body catalog-page"
              : "workspace-experience catalog-page"
          }
          style={{ maxWidth: 1080, margin: "auto", padding: "1rem" }}
        >
          <h1>{admin ? "Admin · Account sales" : "Your account sales"}</h1>
          <p className="quiet">Isolated design review · synthetic data only</p>
          <Outlet />
        </main>
      </div>
    </AuthorizedIdentity.Provider>
  );
}
const router = createBrowserRouter([
  {
    element: <Frame />,
    children: [
      {
        path: "/admin/submissions/:id",
        element: <SubmissionWorkspace admin />,
      },
      { path: "/sell/:id", element: <SubmissionWorkspace /> },
      { path: "/admin/accounts/:id", element: <InventoryDetail /> },
      { path: "/admin/submissions", element: <SubmissionList admin /> },
      { path: "/admin/payout-review", element: <SellerPayoutQueue /> },
      { path: "/sell", element: <SubmissionList /> },
      { path: "/sell/new", element: <NewSubmission /> },
      { path: "*", element: <p>Review destination</p> },
    ],
  },
]);
const root = document.getElementById("root");
if (!root) throw new Error("Missing fixture root");
createRoot(root).render(<RouterProvider router={router} />);
