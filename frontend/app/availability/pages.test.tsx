import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { post, APIError } from "../identity/api";
import { useResource } from "../orders/resource";
import { Subscribe, Subscriptions } from "./pages";
import Unsubscribe from "./unsubscribe";
import { parseLink } from "./model";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
afterEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/");
});
it("requires explicit consent and sends only the selected variant", async () => {
  vi.mocked(post).mockResolvedValue({});
  render(
    <MemoryRouter>
      <Subscribe slug="game" pack="pack" variant="basic" />
    </MemoryRouter>,
  );
  const button = screen.getByRole("button", {
    name: "Enable availability emails",
  });
  expect(button).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(button);
  await screen.findByText("Availability alerts enabled.");
  expect(post).toHaveBeenCalledWith(
    "/availability",
    {
      slug: "game",
      package: "pack",
      variant: "basic",
      accept: true,
      consent_version: "availability-v1",
    },
    expect.anything(),
  );
});
it("fences unsubscribe with the observed version and retains current state on conflict", async () => {
  const reload = vi.fn();
  vi.mocked(useResource).mockReturnValue({
    data: {
      subscriptions: [
        {
          id: "subscription",
          version: 4,
          state: "active",
          slug: "game",
          package: "pack",
          variant: "basic",
          label: "Synthetic package",
          available: false,
          updated_at: "2026-09-10T00:00:00Z",
        },
      ],
      next: "",
    },
    loading: false,
    error: null,
    reload,
  });
  vi.mocked(post).mockRejectedValue(new APIError("Consent changed. Refresh."));
  render(
    <MemoryRouter>
      <Subscriptions />
    </MemoryRouter>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Stop emails for Synthetic package" }),
  );
  await screen.findByRole("alert");
  expect(post).toHaveBeenCalledWith(
    "/availability/subscription",
    {
      version: 4,
      active: false,
      accept: false,
      consent_version: "availability-v1",
    },
    expect.anything(),
  );
  expect(reload).not.toHaveBeenCalled();
  expect(screen.getByText("Email alerts on")).toBeVisible();
});
it("rejects malformed unsubscribe capabilities and never accepts query-string tokens", () => {
  expect(parseLink("?id=x&token=y")).toBeNull();
  expect(parseLink("#bad/1/" + "a".repeat(64))).toBeNull();
  expect(
    parseLink(
      "#550e8400-e29b-41d4-a716-446655440000/1/" + "a".repeat(64) + "/extra",
    ),
  ).toBeNull();
  expect(
    parseLink("#550e8400-e29b-41d4-a716-446655440000/0/" + "a".repeat(64)),
  ).toBeNull();
});
it("inspects without unsubscribing and requires a deliberate confirmation", async () => {
  const id = "550e8400-e29b-41d4-a716-446655440000",
    token = "a".repeat(64);
  window.history.replaceState(
    null,
    "",
    `/availability/unsubscribe#${id}/2/${token}`,
  );
  vi.mocked(post).mockResolvedValue({ current: true });
  render(
    <MemoryRouter>
      <Unsubscribe />
    </MemoryRouter>,
  );
  const button = await screen.findByRole("button", {
    name: "Stop these availability emails",
  });
  expect(post).toHaveBeenCalledTimes(1);
  expect(post).toHaveBeenCalledWith(
    "/availability-link/inspect",
    { id, version: 2, token },
    expect.anything(),
  );
  fireEvent.click(button);
  await waitFor(() => {
    expect(screen.getByRole("status")).toHaveTextContent("emails are stopped");
  });
  expect(post).toHaveBeenLastCalledWith(
    "/availability-link/confirm",
    { id, version: 2, token },
    expect.anything(),
  );
  expect(screen.getByRole("status")).toHaveTextContent("emails are stopped");
});
it("retries a failed unsubscribe inspection without exposing or replacing the fragment capability", async () => {
  const id = "00000000-0000-4000-8000-000000000001",
    token = "a".repeat(64);
  window.history.replaceState(
    null,
    "",
    `/availability/unsubscribe#${id}/2/${token}`,
  );
  vi.mocked(post)
    .mockRejectedValueOnce(new APIError("Connection interrupted"))
    .mockResolvedValueOnce({ current: true });
  render(
    <MemoryRouter>
      <Unsubscribe />
    </MemoryRouter>,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Retry link check" }),
  );
  await screen.findByRole("button", { name: "Stop these availability emails" });
  expect(post).toHaveBeenLastCalledWith(
    "/availability-link/inspect",
    { id, version: 2, token },
    expect.anything(),
  );
  expect(window.location.search).toBe("");
});
