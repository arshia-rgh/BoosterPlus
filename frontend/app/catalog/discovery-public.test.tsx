import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import PublicMetrics from "./public-metrics";
import GameCards from "./game-cards";
import { GameDiscovery } from "./game-discovery";
import {
  capabilitiesFor,
  selectedService,
  type PublicMetric,
} from "./public-discovery";
import { emptyConfiguration, type Release, type Listing } from "./model";
import { AccountProduct } from "../resale/market";
const state = vi.hoisted(
  (): {
    data: unknown;
    error: unknown;
    loading: boolean;
    reload: ReturnType<typeof vi.fn>;
  } => ({
    data: null,
    loading: false,
    error: null,
    reload: vi.fn(),
  }),
);
vi.mock("../orders/resource", () => ({ useResource: () => state }));
vi.mock("../ui/motion", () => ({ useMotionPreference: () => "reduced" }));
afterEach(() => {
  state.data = null;
  state.error = null;
  state.loading = false;
  vi.useRealTimers();
});
const release: Release = {
  id: "release",
  game_id: "game",
  slug: "example",
  version: 1,
  paused: false,
  created_at: "2026-09-25T00:00:00Z",
  configuration: emptyConfiguration("Example"),
};
const metric: PublicMetric = {
  key: "active",
  label: "Active orders",
  definition: "Eligible paid orders",
  state: "available",
  value: 6,
  sample_size: 6,
  period_end: "2026-09-26T12:00:00Z",
  refreshed_at: "2026-09-26T12:00:00Z",
  stale_at: "2026-09-26T12:00:30Z",
};
it("keeps reporting dates without calculation disclosures and handles invalid dates", () => {
  const value = {
    ...metric,
    stale_at: "2099-01-01T00:00:00Z",
    period_start: "2026-09-01T00:00:00Z",
  };
  const view = render(<PublicMetrics metrics={[value]} />);
  expect(screen.getByText("01/09/2026 – 26/09/2026 UTC")).toBeVisible();
  expect(screen.queryByText(metric.definition)).not.toBeInTheDocument();
  expect(view.container.querySelector("details")).toBeNull();
  view.rerender(
    <PublicMetrics metrics={[{ ...value, period_end: "invalid" }]} />,
  );
  expect(screen.getByText("Reporting period unavailable")).toBeVisible();
});
it("withdraws expired numeric claims and offers an explicit refresh", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-26T12:00:00Z"));
  const retry = vi.fn();
  render(<PublicMetrics metrics={[metric]} retry={retry} />);
  expect(screen.getByText("6")).toBeVisible();
  act(() => {
    vi.advanceTimersByTime(31_000);
  });
  expect(screen.queryByText("6")).not.toBeInTheDocument();
  expect(screen.getByText("Update needed")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Refresh activity" }));
  expect(retry).toHaveBeenCalledOnce();
});
it.each([
  "unconfigured",
  "insufficient_sample",
  "unavailable",
  "stale",
] as const)("never renders a value for %s metrics", (status) => {
  render(
    <PublicMetrics
      metrics={[{ ...metric, state: status, stale_at: "2099-01-01T00:00:00Z" }]}
    />,
  );
  expect(screen.queryByText("6")).not.toBeInTheDocument();
  expect(screen.getByText("—")).toBeVisible();
});
it("suppresses cached counts after an error and distinguishes a measured zero", () => {
  const { rerender } = render(
    <PublicMetrics
      metrics={[{ ...metric, value: 0, stale_at: "2099-01-01T00:00:00Z" }]}
    />,
  );
  expect(screen.getByText("0")).toBeVisible();
  rerender(<PublicMetrics metrics={[metric]} failed />);
  expect(screen.getByText("Temporarily unavailable")).toBeVisible();
  expect(screen.queryByText("6")).not.toBeInTheDocument();
});
it("keeps off services hidden and paused games non-interactive without losing identity", () => {
  const game: Listing["games"][number] = {
    id: "g",
    slug: "game",
    name: "Example",
    description: "",
    asset: "",
    asset_alt: "",
    paused: true,
    published: true,
    archived: false,
    revision: 1,
    capabilities: [
      { service: "boost", state: "active", description: "", reason: "" },
      { service: "shop", state: "off", description: "", reason: "" },
    ],
  };
  const { rerender } = render(
    <MemoryRouter>
      <GameCards games={[game]} />
    </MemoryRouter>,
  );
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Example" })).toBeVisible();
  expect(screen.queryByText("Shop")).not.toBeInTheDocument();
  rerender(
    <MemoryRouter>
      <GameCards games={[{ ...game, paused: false }]} intent="?path=custom" />
    </MemoryRouter>,
  );
  expect(screen.getByRole("link")).toHaveAttribute(
    "href",
    "/games/game?path=custom",
  );
});
it("applies service capabilities and bounded legacy intent", () => {
  expect(
    capabilitiesFor({ ...release, paused: true }).find(
      (item) => item.service === "accounts",
    )?.state,
  ).toBe("paused");
  expect(
    capabilitiesFor(release).find((item) => item.service === "news")?.state,
  ).toBe("off");
  expect(
    selectedService("/games/example/accounts/listing", new URLSearchParams()),
  ).toBe("accounts");
  expect(
    selectedService("/games/example", new URLSearchParams("path=custom")),
  ).toBe("boost");
  expect(
    selectedService(
      "/games/example",
      new URLSearchParams("service=constructor"),
    ),
  ).toBeNull();
});
it("filters featured offers by selected service, expiry and exact release", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-26T12:00:00Z"));
  state.data = {
    release_id: release.id,
    game_id: release.game_id,
    capabilities: [],
    metrics: [],
    promotions: [
      {
        key: "deal",
        title: "Scoped offer",
        description: "Reviewed terms",
        service: "boost",
        target: "package",
        package: "pack",
        variant: "basic",
        release_id: release.id,
        currency: "USD",
        amount_minor: "1000",
        original_minor: "2000",
        starts_at: "2026-09-26T11:00:00Z",
        ends_at: "2026-09-26T12:00:30Z",
        priority: 1,
        indicative: true,
        coupon_code: "SAVE",
      },
    ],
  };
  const { rerender } = render(
    <MemoryRouter>
      <GameDiscovery release={release} selected={null} />
    </MemoryRouter>,
  );
  expect(screen.getByRole("link", { name: "Review package" })).toHaveAttribute(
    "href",
    "/games/example/packages/pack?variant=basic&coupon=SAVE",
  );
  rerender(
    <MemoryRouter>
      <GameDiscovery release={release} selected="accounts" />
    </MemoryRouter>,
  );
  expect(screen.queryByText("Scoped offer")).not.toBeInTheDocument();
  rerender(
    <MemoryRouter>
      <GameDiscovery
        release={{ ...release, id: "new-release" }}
        selected={null}
      />
    </MemoryRouter>,
  );
  expect(screen.queryByText("Scoped offer")).not.toBeInTheDocument();
  rerender(
    <MemoryRouter>
      <GameDiscovery release={release} selected="boost" />
    </MemoryRouter>,
  );
  act(() => {
    vi.advanceTimersByTime(31_000);
  });
  expect(screen.queryByText("Scoped offer")).not.toBeInTheDocument();
});
it("does not render another game's account or its purchase controls inside a game", () => {
  state.data = { slug: "another-game", product: { title: "Foreign account" } };
  render(
    <MemoryRouter>
      <AccountProduct gameSlug="example" />
    </MemoryRouter>,
  );
  expect(
    screen.getByText(/This account is not available for this game/),
  ).toBeVisible();
  expect(screen.queryByText("Foreign account")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Reserve/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "← Account marketplace" }),
  ).toHaveAttribute("href", "/games/example/accounts");
});
