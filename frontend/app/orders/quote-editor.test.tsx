import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, get, post } from "../identity/api";
import { emptyConfiguration } from "../catalog/model";
import { detailSchema } from "./model";
import QuoteEditor from "./quote-editor";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
  post: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());
const detail = detailSchema.parse({
  order: {
    id: "order",
    version: 2,
    kind: "custom",
    state: "submitted",
    slug: "game",
    service: "boost",
    package: "",
    variant: "",
    game_name: "Game",
    created_at: "2026-09-27T00:00:00Z",
    updated_at: "2026-09-27T00:00:00Z",
  },
  offer: {
    id: "release",
    game_id: "game",
    slug: "game",
    version: 1,
    paused: false,
    created_at: "2026-09-27T00:00:00Z",
    configuration: emptyConfiguration("Game"),
  },
  answers: {},
  coupon_code: "",
  estimate: {
    release_id: "release",
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
});
const preview = {
  preview_hash: "private-fixture-binding",
  order_version: 2,
  data: {
    quote_id: "",
    revision: 1,
    currency: "USD",
    subtotal_minor: "2000",
    amount_minor: "2000",
    lines: [],
    scope: "Reviewed scope",
    reason: "Reviewed reason",
    delivery_min_hours: 1,
    delivery_max_hours: 24,
    expires_at: "2099-01-01T00:00:00Z",
    terms_version: "terms-v1",
  },
};
function mount() {
  return render(
    <MemoryRouter>
      <QuoteEditor detail={detail} done={vi.fn()} />
    </MemoryRouter>,
  );
}
async function review() {
  fireEvent.change(
    screen.getByLabelText("Pre-discount amount in minor units"),
    { target: { value: "2000" } },
  );
  fireEvent.change(screen.getByLabelText("Quote currency"), {
    target: { value: "USD" },
  });
  fireEvent.change(screen.getByLabelText("Agreed scope"), {
    target: { value: "Reviewed scope" },
  });
  fireEvent.change(screen.getByLabelText("Quote explanation"), {
    target: { value: "Reviewed reason" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Preview quote" }));
  await screen.findByRole("region", { name: "Customer quote preview" });
  await waitFor(() =>
    expect(
      screen.getByRole("heading", {
        name: "Customer quote preview · not issued",
      }),
    ).toHaveFocus(),
  );
}
it("requires preview and explicit review, binds issue to the reviewed payload and clears preview after edits", async () => {
  vi.mocked(post).mockImplementation((path) =>
    Promise.resolve(path.endsWith("/preview") ? preview : detail),
  );
  mount();
  await review();
  expect(post).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Issue quote" })).toBeDisabled();
  fireEvent.click(
    screen.getByLabelText(
      "I reviewed the customer-visible price, scope, deadline and terms",
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Issue quote" }));
  await screen.findByText("Quote issued for customer acceptance.");
  expect(post).toHaveBeenLastCalledWith(
    "/admin/orders/order/quote",
    expect.objectContaining({
      preview_hash: preview.preview_hash,
      version: 2,
      amount_minor: "2000",
    }),
    expect.anything(),
  );
  await review();
  fireEvent.change(screen.getByLabelText("Agreed scope"), {
    target: { value: "Changed scope" },
  });
  expect(
    screen.queryByRole("button", { name: "Issue quote" }),
  ).not.toBeInTheDocument();
});
it("freezes unknown issuance until authoritative read-back, retaining edited scope", async () => {
  const unavailable = new APIError("Connection lost");
  unavailable.status = 503;
  vi.mocked(post).mockImplementation((path) =>
    path.endsWith("/preview")
      ? Promise.resolve(preview)
      : Promise.reject(unavailable),
  );
  vi.mocked(get).mockResolvedValue(detail);
  mount();
  await review();
  fireEvent.click(
    screen.getByLabelText(
      "I reviewed the customer-visible price, scope, deadline and terms",
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Issue quote" }));
  await screen.findByRole("button", { name: "Check latest quote" });
  expect(screen.getByLabelText("Agreed scope")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Issue quote" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Check latest quote" }));
  await waitFor(() => {
    expect(get).toHaveBeenCalledWith("/admin/orders/order", expect.anything());
  });
  await screen.findByText(
    "No new quote was found. Preview again before issuing.",
  );
  expect(screen.getByLabelText("Agreed scope")).toHaveValue("Reviewed scope");
  expect(post).toHaveBeenCalledTimes(2);
});

it("puts quote errors next to their fields and focuses the first without discarding input", async () => {
  mount();
  fireEvent.change(screen.getByLabelText("Agreed scope"), {
    target: { value: "Preserve this draft scope" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Preview quote" }));
  const amount = screen.getByLabelText("Pre-discount amount in minor units");
  await waitFor(() => {
    expect(amount).toHaveFocus();
  });
  expect(amount).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText("Quote explanation")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(screen.getByLabelText("Agreed scope")).toHaveValue(
    "Preserve this draft scope",
  );
  expect(post).not.toHaveBeenCalled();
});
