import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, get, post } from "../identity/api";
import {
  agreedDeliveryClock,
  withDeliveryHours,
} from "../catalog/delivery-hours";
import { Agreement } from "./parts";
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
  fireEvent.change(screen.getByLabelText("Pre-discount price"), {
    target: { value: "20.00" },
  });
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

it("converts decimal prices and reductions to exact cents without changing the reviewed contract", async () => {
  vi.mocked(post).mockResolvedValue(preview);
  mount();
  for (const [label, amount] of [
    ["Climb", "22.51"],
    ["Adjustment", "-2.51"],
  ]) {
    fireEvent.click(screen.getByRole("button", { name: "Add quote line" }));
    const labelField = screen.getAllByLabelText("Line label").at(-1);
    const priceField = screen.getAllByLabelText("Line price").at(-1);
    if (!labelField || !priceField) throw new Error("Quote line was not added");
    fireEvent.change(labelField, {
      target: { value: label },
    });
    fireEvent.change(priceField, {
      target: { value: amount },
    });
  }
  await review();
  expect(post).toHaveBeenCalledWith(
    "/admin/orders/order/quote/preview",
    expect.objectContaining({
      amount_minor: "2000",
      lines: [
        expect.objectContaining({ label: "Climb", amount_minor: "2251" }),
        expect.objectContaining({ label: "Adjustment", amount_minor: "-251" }),
      ],
    }),
    expect.anything(),
  );
  const firstPrice = screen.getAllByLabelText("Line price").at(0);
  if (!firstPrice) throw new Error("Reviewed quote line is missing");
  fireEvent.change(firstPrice, {
    target: { value: "22.511" },
  });
  expect(
    screen.queryByRole("region", { name: "Customer quote preview" }),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Preview quote" }));
  await waitFor(() =>
    expect(screen.getAllByLabelText("Line price")[0]).toHaveFocus(),
  );
  expect(screen.getAllByLabelText("Line price")[0]).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(post).toHaveBeenCalledTimes(1);
});

it.each(["0", "-1.00", "12.345", "1e2", "1,000", "10000000000.00"])(
  "keeps invalid price %s visible and refuses to silently round or submit it",
  async (value) => {
    mount();
    const input = screen.getByLabelText("Pre-discount price");
    fireEvent.change(input, { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Preview quote" }));
    await waitFor(() => expect(input).toHaveFocus());
    expect(input).toHaveValue(value);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(post).not.toHaveBeenCalled();
  },
);

it("puts quote errors next to their fields and focuses the first without discarding input", async () => {
  mount();
  fireEvent.change(screen.getByLabelText("Agreed scope"), {
    target: { value: "Preserve this draft scope" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Preview quote" }));
  const amount = screen.getByLabelText("Pre-discount price");
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

it("shows the requested hours and preserves old agreement clock wording", () => {
  const copy = structuredClone(detail);
  const service = {
    key: "boost",
    name: "Boost",
    description: "",
    evaluator: "manual-review-v1",
    fields: [],
    rules: [],
  };
  copy.offer.configuration.services = [
    { ...service, ...withDeliveryHours(service) },
  ];
  copy.answers = { delivery_min_hours: "12", delivery_max_hours: "18" };
  const view = render(
    <MemoryRouter>
      <QuoteEditor detail={copy} done={vi.fn()} />
    </MemoryRouter>,
  );
  expect(screen.getByText(/12–18 hours requested/)).toBeVisible();
  expect(screen.getByText(agreedDeliveryClock, { exact: false })).toBeVisible();
  view.rerender(
    <MemoryRouter>
      <Agreement data={preview.data} />
    </MemoryRouter>,
  );
  expect(screen.getByText(/hours after fulfillment can start/)).toBeVisible();
  expect(screen.queryByText(/Elapsed calendar hours/)).toBeNull();
  view.rerender(
    <MemoryRouter>
      <Agreement
        data={{ ...preview.data, delivery_basis: "payment_and_access_v1" }}
      />
    </MemoryRouter>,
  );
  expect(screen.getByText(/Elapsed calendar hours/)).toBeVisible();
});
