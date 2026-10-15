import type { SellerTerms } from "../../../app/resale/model";

export const fixtureRoute = {
  code: "usdtbsc",
  network: "bsc",
  label: "USDT · BNB Smart Chain (BEP-20)",
};
export const fixtureOtherRoute = {
  code: "usdttrc20",
  network: "trx",
  label: "USDT · TRON (TRC-20)",
};
export const fixturePolicy = {
  published: { id: "synthetic-policy", data: { routes: [fixtureRoute] } },
  draft: { routes: [fixtureOtherRoute] },
  enabled: false,
  outgoing_enabled: false,
};
const terms: SellerTerms = {
  model: "consignment",
  currency: "usdtbsc",
  network: "bsc",
  amount: "",
  proceeds_basis: "Synthetic consignment proceeds after buyer inspection.",
  fees: "Synthetic seller commission is ten percent of the account base.",
  transfer_requirements:
    "Synthetic account access requested through protected chat fields when needed.",
  dispute_terms: "Synthetic evidence review for account and delivery disputes.",
  withdrawal_terms:
    "Synthetic withdrawal through a separately agreed resolution.",
  payout_delay_hours: 0,
  payout_deadline_hours: 48,
};
export const fixtureDefaults = {
  seller_consignment: terms,
  seller_buy_first: { ...terms, model: "buy_first" },
  buyer: {
    title: "",
    description: "",
    region: "",
    rank: "",
    attributes: [],
    media_ids: [],
    currency: "USD",
    amount_minor: "",
    sale_terms: "",
    transfer_requirements: "",
    dispute_terms: "",
    acknowledgement_terms: "",
    dispute_hours: 168,
    delivery_min_hours: 1,
    delivery_max_hours: 24,
  },
  shop: {},
  review_policy: "",
  boost_terms: "",
};
export const fixtureSession = {
  portal: "admin",
  user: {
    id: "synthetic-owner",
    portal: "admin",
    email: "owner@example.invalid",
    display_name: "Synthetic owner",
    role: "owner",
    staff_alias: "",
    suspended: false,
    mfa_enabled: true,
    notify_updates: false,
  },
  csrf_token: "x".repeat(64),
  google_enabled: false,
  google_linked: false,
  mfa_required: false,
  capabilities: ["owner"],
  terms_version: "fixture",
  terms_url: "/terms",
};
