import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import Favorites from "../orders/favorites";
import Notifications from "../support/notifications";
import { Subscriptions } from "../availability/pages";
import { APIError, get } from "../identity/api";
vi.mock("../identity/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../identity/api")>()),
  get: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());
for (const [Component, label, response] of [
  [Favorites, "favorites", { favorites: [], next: "" }],
  [Notifications, "activity", { notifications: [], next: "" }],
  [Subscriptions, "alerts", { subscriptions: [], next: "" }],
] as const) {
  it(`offers a real retry for failed ${label} instead of endless loading`, async () => {
    vi.mocked(get)
      .mockRejectedValueOnce(new APIError("Temporarily unavailable"))
      .mockResolvedValueOnce(response);
    render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    );
    await screen.findByText("Temporarily unavailable");
    expect(screen.getByRole("status")).toHaveTextContent("Could not load");
    fireEvent.click(screen.getByRole("button", { name: `Refresh ${label}` }));
    await screen.findByText(/No .*yet/);
    expect(get).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
}
