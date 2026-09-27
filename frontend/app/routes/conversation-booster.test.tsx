import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { get } from "../identity/api";
import Page from "./conversation-booster";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
}));
vi.mock("../identity/identity", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
afterEach(() => vi.clearAllMocks());
function Destination() {
  const location = useLocation();
  return (
    <p>
      Assignment destination {location.pathname}
      {location.search}
    </p>
  );
}
const order = "11111111-1111-4111-8111-111111111111";
function view() {
  render(
    <MemoryRouter initialEntries={["/booster/support/thread"]}>
      <Routes>
        <Route path="/booster/support/:id" element={<Page />} />
        <Route path="/booster/orders/:id" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
}
it("resolves an authorized shared conversation into its persistent assignment", async () => {
  vi.mocked(get).mockResolvedValue({
    kind: "fulfillment",
    booster_shared: true,
    order_id: order,
  });
  view();
  expect(
    await screen.findByText(
      `Assignment destination /booster/orders/${order}?section=messages`,
    ),
  ).toBeVisible();
  expect(vi.mocked(get).mock.calls[0]?.[0]).toBe("/conversations/thread");
});
it.each([
  { kind: "presales", booster_shared: true, order_id: order },
  { kind: "fulfillment", booster_shared: false, order_id: order },
  { kind: "fulfillment", booster_shared: true, order_id: "//external.test" },
])(
  "keeps unsupported or revoked conversation results out of assignment navigation",
  async (result) => {
    vi.mocked(get).mockResolvedValue(result);
    view();
    expect(
      await screen.findByText(
        "This conversation is unavailable to your current booster session.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByText(/Assignment destination/),
    ).not.toBeInTheDocument();
  },
);
