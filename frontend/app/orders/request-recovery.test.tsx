import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import RequestJourney, {
  RequestSubmission,
  requestReference,
} from "./request-recovery";
import { get } from "../identity/api";
import { useContext } from "react";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
}));
const reference = "58b15562-a8bb-46a0-b8d5-0926b6166bb6";
function renderJourney() {
  return render(
    <MemoryRouter
      initialEntries={[`/games/game/services/boost?request=${reference}`]}
    >
      <RequestJourney>
        <input aria-label="Private instructions" defaultValue="Local only" />
      </RequestJourney>
    </MemoryRouter>,
  );
}
beforeEach(() => vi.resetAllMocks());
it("recovery hides creation until checked and a saved order requires an explicit new request", async () => {
  vi.mocked(get)
    .mockResolvedValueOnce({ user: { id: "buyer" }, mfa_required: false })
    .mockResolvedValueOnce({ order_id: "owned-order" });
  renderJourney();
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(
    await screen.findByRole("link", { name: "View your saved order" }),
  ).toHaveAttribute("href", "/orders/owned-order");
  expect(screen.queryByRole("textbox")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Start a separate new request" }),
  );
  expect(
    await screen.findByRole("textbox", { name: "Private instructions" }),
  ).toBeVisible();
  expect(
    screen.queryByRole("link", { name: "View your saved order" }),
  ).toBeNull();
});
it("anonymous recovery offers sign-in without querying private orders", async () => {
  vi.mocked(get).mockResolvedValueOnce({ user: null, mfa_required: false });
  renderJourney();
  const link = await screen.findByRole("link", {
    name: "Sign in to recover your request",
  });
  expect(link.getAttribute("href")).toContain(
    encodeURIComponent(`request=${reference}`),
  );
  expect(get).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("textbox")).toBeNull();
});
it("active submission never displays an interrupted-request card", async () => {
  function Trigger() {
    const pending = useContext(RequestSubmission);
    return (
      <button
        onClick={() => {
          pending(true);
        }}
      >
        Submit test
      </button>
    );
  }
  vi.mocked(get)
    .mockResolvedValueOnce({ user: { id: "buyer" }, mfa_required: false })
    .mockResolvedValueOnce({ order_id: "" });
  render(
    <MemoryRouter initialEntries={[`/?request=${reference}`]}>
      <RequestJourney>
        <Trigger />
      </RequestJourney>
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Submit test" })).toBeVisible(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Submit test" }));
  expect(
    screen.queryByRole("region", { name: "Interrupted request" }),
  ).toBeNull();
});
it("malformed references cannot enter recovery endpoints", () => {
  expect(requestReference(new URLSearchParams("request=../../secret"))).toBe(
    "",
  );
});

it("retry success focuses the saved heading rather than reusing the reset button", async () => {
  vi.mocked(get)
    .mockResolvedValueOnce({ user: { id: "buyer" }, mfa_required: false })
    .mockRejectedValueOnce(new Error("offline"));
  renderJourney();
  await screen.findByRole("alert");
  vi.mocked(get)
    .mockResolvedValueOnce({ user: { id: "buyer" }, mfa_required: false })
    .mockResolvedValueOnce({ order_id: "owned-order" });
  const retry = screen.getByRole("button", { name: "Check saved request" });
  retry.focus();
  fireEvent.click(retry);
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "Your request was saved" }),
    ).toHaveFocus(),
  );
  expect(
    screen.getByRole("button", { name: "Start a separate new request" }),
  ).not.toHaveFocus();
});
