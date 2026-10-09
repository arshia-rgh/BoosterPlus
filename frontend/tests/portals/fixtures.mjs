// Synthetic browser-only records. These fixtures exercise deployed SSR/router
// bundles, not database permissions, MFA verification or real payment behavior.
export const orderID = "00000000-0000-4000-8000-000000000137";
const timestamp = "2026-10-08T00:00:00Z";
export const order = {
  id: orderID,
  version: 2,
  kind: "custom",
  state: "submitted",
  slug: "synthetic-game",
  service: "boost",
  package: "",
  variant: "",
  game_name: "Synthetic game",
  created_at: timestamp,
  updated_at: timestamp,
};
export const detail = {
  order,
  offer: {
    id: "synthetic-release",
    game_id: "synthetic-game",
    slug: "synthetic-game",
    version: 1,
    paused: false,
    created_at: timestamp,
    configuration: {
      schema_version: 1,
      name: "Synthetic game",
      description: "Isolated browser routing fixture",
      asset: "/catalog-assets/game-placeholder.svg",
      asset_alt: "Game controller",
      reviewed: false,
      references: [],
      services: [],
      packages: [],
      faqs: [],
    },
  },
  answers: {},
  coupon_code: "",
  estimate: {
    release_id: "synthetic-release",
    version: 1,
    evaluator: "manual-review-v1",
    expires_at: "2099-01-01T00:00:00Z",
    outcome: "manual_review",
    currency: "",
    amount_minor: "0",
    answers: {},
    lines: [],
    issues: [],
  },
};
export const work = {
  coordination_id: "",
  coordination_shared: false,
  order_id: orderID,
  order_version: 2,
  access_version: 1,
  version: 1,
  game: "Synthetic game",
  service: "Boost",
  state: "in_progress",
  mode: "account",
  secret_hours: 1,
  alias: "Synthetic booster",
  progress: 20,
  completion_pending: false,
  note: "Synthetic progress for portal qualification",
  estimated_start: null,
  estimated_finish: null,
  forecast_review: false,
  shared: [],
  updated_at: timestamp,
};

export const cookieName = (portal) =>
  portal === "customer" ? "bp-session" : `bp-${portal}-session`;

export function session(portal, authenticated) {
  return {
    portal,
    user: authenticated
      ? {
          id: `synthetic-${portal}`,
          portal,
          email: `${portal}@example.invalid`,
          email_verified: true,
          deleted: false,
          display_name: `Synthetic ${portal}`,
          role: portal === "admin" ? "owner" : portal,
          staff_alias: `Synthetic ${portal}`,
          suspended: false,
          mfa_enabled: portal !== "customer",
          notify_updates: false,
        }
      : null,
    csrf_token: "s".repeat(64),
    google_enabled: true,
    google_linked: false,
    mfa_required: false,
    capabilities: authenticated
      ? portal === "admin"
        ? ["admin", "owner"]
        : portal === "booster"
          ? ["booster"]
          : ["account"]
      : [],
    terms_version: "synthetic-portal-v1",
    terms_url: "/terms",
  };
}

export function publicRecord(path) {
  if (path === "/api/v1/site/legal")
    return {
      kind: "legal",
      version: 0,
      release_id: "",
      label: "",
      data: {},
      updated_at: timestamp,
    };
  if (path === "/api/v1/catalog/games") return { games: [], next: "" };
  return undefined;
}

export function privateRecord(path, portal) {
  if (portal === "admin") {
    if (path === "/api/v1/admin/operations")
      return {
        observed_at: timestamp,
        cards: [],
        requests: [],
        sessions: [],
        jobs: [],
        oldest_runnable_at: null,
      };
    if (path === "/api/v1/admin/orders") return { orders: [order], next: "" };
    if (path === `/api/v1/admin/orders/${orderID}`) return detail;
    if (path === `/api/v1/admin/orders/${orderID}/events`)
      return { events: [] };
    if (path === `/api/v1/admin/orders/${orderID}/quotes`)
      return { quotes: [] };
  }
  if (portal === "booster") {
    if (path === "/api/v1/booster/fulfillment")
      return { items: [work], next: "" };
    if (path === `/api/v1/booster/fulfillment/${orderID}`) return work;
    if (path === `/api/v1/booster/fulfillment/${orderID}/readiness`)
      return { ready: true, requirement: "ready", checked_at: timestamp };
    if (path === "/api/v1/booster/calendar")
      return {
        profile: {
          version: 1,
          timezone: "UTC",
          enabled: true,
          game_tags: [],
          region_tags: [],
        },
        windows: [],
        next: "",
      };
    if (path === "/api/v1/booster/calendar/sessions")
      return { items: [], next: "" };
  }
  return undefined;
}
