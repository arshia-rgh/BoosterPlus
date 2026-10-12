import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import { useResource } from "../orders/resource";
import PurchaseReview from "./form";
import type { OrderReview } from "./model";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
function setup() {
  const value: OrderReview = {
    order_id: "order",
    eligible: true,
    review: null,
    policy: {
      release_id: "release-v2",
      policy: { content: "Synthetic publication rules", fields: [], rules: [] },
      references: [],
    },
  };
  const reload = vi.fn();
  vi.mocked(useResource).mockReturnValue({
    data: value,
    loading: false,
    error: null,
    reload,
  });
  render(
    <MemoryRouter>
      <PurchaseReview orderID="order" completed />
    </MemoryRouter>,
  );
  return reload;
}
it("requires an explicit rating and policy acceptance and submits the bound release", async () => {
  const reload = setup();
  vi.mocked(post).mockResolvedValue({});
  const submit = screen.getByRole("button", {
    name: "Submit review for moderation",
  });
  expect(screen.getByLabelText("Purchase rating")).toHaveValue("");
  fireEvent.click(submit);
  await waitFor(() =>
    expect(screen.getByLabelText("Purchase rating")).toHaveFocus(),
  );
  expect(screen.getByLabelText("Purchase rating")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(post).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Purchase rating"), {
    target: { value: "1" },
  });
  fireEvent.change(screen.getByLabelText("Purchase feedback"), {
    target: { value: "Honest constructive criticism" },
  });
  fireEvent.click(submit);
  expect(post).not.toHaveBeenCalled();
  expect(
    screen.getByLabelText("I accept this review publication policy"),
  ).toHaveAttribute("aria-invalid", "true");
  fireEvent.click(
    screen.getByLabelText("I accept this review publication policy"),
  );
  fireEvent.click(submit);
  await waitFor(() => {
    expect(reload).toHaveBeenCalledOnce();
  });
  expect(post).toHaveBeenCalledWith(
    "/orders/order/review",
    expect.objectContaining({
      rating: 1,
      body: "Honest constructive criticism",
      version: 0,
      policy_release_id: "release-v2",
      accept_policy: true,
    }),
    expect.anything(),
  );
});
it("retains customer wording and focuses the local notice after a stale-version failure", async () => {
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  const reload = setup();
  vi.mocked(post).mockRejectedValue(
    new APIError("The review changed. Refresh before saving."),
  );
  fireEvent.change(screen.getByLabelText("Purchase rating"), {
    target: { value: "2" },
  });
  fireEvent.change(screen.getByLabelText("Purchase feedback"), {
    target: { value: "Keep my unsaved feedback" },
  });
  fireEvent.click(
    screen.getByLabelText("I accept this review publication policy"),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Submit review for moderation" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("The review changed."),
  );
  expect(screen.getByLabelText("Purchase feedback")).toHaveValue(
    "Keep my unsaved feedback",
  );
  // The notice renders before React's focus effect; await the user-visible
  // outcome rather than depending on this machine's effect scheduling.
  await waitFor(() =>
    expect(
      screen.getByRole("group", { name: "Review could not be submitted" }),
    ).toHaveFocus(),
  );
  expect(reload).not.toHaveBeenCalled();
  expect(post).toHaveBeenCalledTimes(1);
});
it("does not solicit feedback when the accepted purchase is not eligible", () => {
  vi.mocked(useResource).mockReturnValue({
    data: { order_id: "shop", eligible: false, policy: null, review: null },
    loading: false,
    error: null,
    reload: vi.fn(),
  });
  render(
    <MemoryRouter>
      <PurchaseReview orderID="shop" completed />
    </MemoryRouter>,
  );
  expect(screen.queryByRole("region", { name: "Purchase review" })).toBeNull();
});
it("keeps focus in the last corrected field after a server validation error", async () => {
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  setup();
  const rejection = new APIError("Correct the highlighted field.");
  rejection.status = 422;
  rejection.issues = [
    { path: "body", message: "Please explain your experience." },
  ];
  vi.mocked(post).mockRejectedValue(rejection);
  fireEvent.change(screen.getByLabelText("Purchase rating"), {
    target: { value: "4" },
  });
  const body = screen.getByLabelText("Purchase feedback");
  fireEvent.change(body, { target: { value: "Initial feedback" } });
  fireEvent.click(
    screen.getByLabelText("I accept this review publication policy"),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Submit review for moderation" }),
  );
  await waitFor(() => {
    expect(body).toHaveAttribute("aria-invalid", "true");
  });
  await waitFor(() => {
    expect(body).toHaveFocus();
  });
  fireEvent.change(body, { target: { value: "My detailed experience." } });
  await waitFor(() => {
    expect(body).not.toHaveAttribute("aria-invalid", "true");
  });
  expect(body).toHaveFocus();
  expect(
    screen.queryByText("Correct the highlighted field."),
  ).not.toBeInTheDocument();
});
