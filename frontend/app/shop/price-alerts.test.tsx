import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EditorPriceNotice, PriceBadges, PriceChecks } from "./price-alerts";
import {
  belowCost,
  bySeverity,
  intervalLabel,
  shortTime,
  usdCents,
  usdDecimal,
} from "./price-format";
import type { PriceReview, PriceSync } from "./model";
import { useResource } from "../orders/resource";
import { APIError, post } from "../identity/api";
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
const review = (
  status: PriceReview["status"],
  title: string,
  more: Partial<PriceReview> = {},
): PriceReview => ({
  product_id: title.toLowerCase().replaceAll(" ", "-"),
  title,
  game: "Mobile Legends",
  state: "published",
  supplier_product_id: "mlbb:diamonds:86",
  status,
  attention: "open",
  version: 2,
  quantity: "1",
  baseline_total: "1.005",
  supplier_total: "1.2",
  selling_minor: "1234",
  failures: 2,
  checked_at: "2026-10-22T08:00:00Z",
  detected_at: "2026-10-22T00:00:00Z",
  repriced_at: null,
  repriced_from_minor: "",
  repriced_to_minor: "",
  repriced_from_total: "",
  repriced_to_total: "",
  ...more,
});
let sync: PriceSync;
const reload = vi.fn();
beforeEach(() => {
  sync = {
    interval_minutes: 480,
    configured: true,
    last_run: {
      state: "complete",
      started_at: "2026-10-22T08:00:00Z",
      finished_at: "2026-10-22T08:05:00Z",
      checked: 224,
      repriced: 0,
      flagged: 2,
      deferred: 0,
      failed: 0,
      issue: "",
    },
    next_check_at: "2026-10-22T16:00:00Z",
    attention_count: 2,
    attention: [
      review("override_changed", "Cheap pass", {
        quantity: "5",
        supplier_total: "5.25",
        selling_minor: "499",
      }),
      review("requirements_changed", "Blocked pass"),
    ],
    repriced: [],
  };
  vi.mocked(useResource).mockImplementation(() => ({
    data: sync,
    error: null,
    loading: false,
    reload,
  }));
});
afterEach(() => vi.clearAllMocks());
function mount(element: React.ReactNode) {
  const router = createMemoryRouter([{ path: "/", element }], {
    initialEntries: ["/"],
  });
  return render(<RouterProvider router={router} />);
}
it("formats exact amounts, intervals and cost comparisons without rounding", () => {
  expect(usdCents("1234")).toBe("USD 12.34");
  expect(usdCents("x")).toBe("Not available");
  expect(usdDecimal("1.005")).toBe("USD 1.005");
  expect(usdDecimal("3")).toBe("USD 3.00");
  expect(usdDecimal("01.2")).toBe("Not available");
  expect(usdDecimal("")).toBe("Not available");
  expect(belowCost("499", "5.25")).toBe(true);
  expect(belowCost("525", "5.25")).toBe(false);
  expect(belowCost("100", "1.001")).toBe(true);
  expect(belowCost("101", "1.001")).toBe(false);
  expect(belowCost("100", "bad")).toBe(false);
  expect(intervalLabel(480)).toBe("8 hours");
  expect(intervalLabel(60)).toBe("1 hour");
  expect(intervalLabel(90)).toBe("90 minutes");
  expect(intervalLabel(150)).toBe("2 hours 30 minutes");
  expect(shortTime("not a date")).toBe("");
  expect(
    bySeverity([
      review("check_failed", "A"),
      review("override_changed", "B"),
      review("requirements_changed", "C"),
    ]).map((item) => item.title),
  ).toEqual(["C", "B", "A"]);
});
it("leads with blocking alerts and keeps a fixed price after review", async () => {
  vi.mocked(post).mockResolvedValue({
    ...review("override_changed", "Cheap pass"),
    attention: "acknowledged",
  });
  const changed = vi.fn();
  mount(<PriceChecks search="q=pass" onChanged={changed} />);
  expect(
    screen.getByRole("heading", { level: 2, name: "2 price alerts" }),
  ).toBeTruthy();
  const titles = screen
    .getAllByRole("heading", { level: 3 })
    .map((node) => node.textContent);
  expect(titles).toEqual(["Blocked pass", "Cheap pass"]);
  expect(screen.getByText("Supplier cost for 5 units")).toBeTruthy();
  expect(
    screen.getByText("Your price is below the new supplier cost."),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Keep my price/ }));
  await waitFor(() => {
    expect(screen.getByText("Kept your price for Cheap pass.")).toBeTruthy();
  });
  expect(post).toHaveBeenCalledWith(
    "/admin/shop/price-sync/cheap-pass/acknowledge",
    { version: 2 },
    expect.anything(),
  );
  expect(reload).toHaveBeenCalled();
  expect(changed).toHaveBeenCalled();
  expect(
    screen.getByRole("heading", { level: 2, name: "1 price alert" }),
  ).toBeTruthy();
});
it("explains a stale acknowledgement and offers a reload", async () => {
  const stale = new APIError("conflict");
  stale.status = 409;
  stale.code = "shop_conflict";
  vi.mocked(post).mockRejectedValue(stale);
  mount(<PriceChecks search="" />);
  fireEvent.click(screen.getByRole("button", { name: /Keep my price/ }));
  await waitFor(() => {
    expect(
      screen.getByText("This alert changed since you loaded it."),
    ).toBeTruthy();
  });
  fireEvent.click(screen.getByRole("button", { name: "Reload alerts" }));
  await waitFor(() => {
    expect(screen.getByText("Alerts reloaded.")).toBeTruthy();
  });
});
it("shows quiet and failed schedule states", () => {
  sync = {
    ...sync,
    attention: [],
    attention_count: 0,
    last_run: sync.last_run && {
      ...sync.last_run,
      state: "failed",
      issue: "supplier_unavailable",
    },
  };
  mount(<PriceChecks search="" />);
  expect(
    screen.getByRole("heading", { level: 2, name: "Supplier price checks" }),
  ).toBeTruthy();
  expect(screen.getByText(/couldn't reach the supplier/)).toBeTruthy();
});
it("renders row badges and the editor notice", async () => {
  vi.mocked(post).mockResolvedValue({
    ...review("unavailable", "Pass"),
    attention: "acknowledged",
  });
  const { unmount } = mount(
    <PriceBadges
      status="override_changed"
      attention="open"
      repricedAt="2026-10-21T08:00:00Z"
    />,
  );
  expect(screen.getByText("Supplier price changed")).toBeTruthy();
  expect(screen.getByText(/Price updated/)).toBeTruthy();
  unmount();
  const changed = vi.fn();
  mount(
    <EditorPriceNotice
      review={review("unavailable", "Pass")}
      onChanged={changed}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "Supplier offer unavailable" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Dismiss/ }));
  await waitFor(() => {
    expect(screen.getByText("Alert dismissed.")).toBeTruthy();
  });
  expect(changed).toHaveBeenCalled();
});
