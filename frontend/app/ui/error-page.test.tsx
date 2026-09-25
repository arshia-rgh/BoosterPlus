import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import ErrorPage from "./error-page";
import { retryTime } from "./retry-time";
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
function show(
  status: number,
  data: unknown = "private database detail",
  path = "/missing",
  admin = false,
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ErrorPage
        admin={admin}
        error={{ status, statusText: "private trace", internal: false, data }}
      />
    </MemoryRouter>,
  );
}
it.each([401, 403, 404, 429, 503, 500])(
  "keeps HTTP %s recovery bounded and hides raw private error detail",
  (status) => {
    show(status);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.queryByText(/private database|private trace/),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /My account/ })).toHaveAttribute(
      "href",
      "/account",
    );
    expect(screen.queryByRole("button", { name: "Reload page" }) !== null).toBe(
      ![401, 403, 404].includes(status),
    );
  },
);
it.each([
  ["/admin/missing", true, "/admin"],
  ["/booster/missing", false, "/booster"],
] as const)(
  "preserves the %s workspace in fallback actions",
  (path, admin, destination) => {
    show(403, null, path, admin);
    expect(screen.getByRole("link")).toHaveAttribute("href", destination);
    expect(
      screen.queryByRole("link", { name: "Explore games" }),
    ).not.toBeInTheDocument();
  },
);
it("updates offline recovery without inventing success or automatically repeating the action", () => {
  const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  show(503);
  expect(
    screen.getByRole("heading", { name: "Check your connection." }),
  ).toBeVisible();
  online.mockReturnValue(true);
  fireEvent(window, new Event("online"));
  expect(
    screen.getByRole("heading", { name: "Temporarily unavailable." }),
  ).toBeVisible();
});
it("honors an actual retry deadline and re-enables only after it passes", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-25T12:00:00Z"));
  show(429, { retry_at: Date.now() + 2000 });
  expect(screen.getByRole("button", { name: "Reload page" })).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent(
    "2026-09-25 12:00:02 UTC",
  );
  act(() => {
    vi.advanceTimersByTime(2000);
  });
  expect(screen.getByRole("button", { name: "Reload page" })).toBeEnabled();
});
it("parses bounded real Retry-After values without accepting malformed cooldowns", () => {
  const now = Date.parse("2026-09-25T12:00:00Z");
  expect(retryTime("60", now)).toBe(now + 60000);
  expect(retryTime("Fri, 25 Sep 2026 12:01:00 GMT", now)).toBe(now + 60000);
  expect(retryTime("Fri, 25 Sep 2026 11:59:00 GMT", now)).toBe(now);
  for (const invalid of [null, "-1", "1.5", "junk", "99999999999999999999"])
    expect(retryTime(invalid, now)).toBeUndefined();
});
