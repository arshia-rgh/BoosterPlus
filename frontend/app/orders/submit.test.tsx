import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import SubmitOrder from "./submit";
import { get, post, APIError, type Session } from "../identity/api";
import { emptyVariant } from "../catalog/model";
vi.mock("../identity/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../identity/api")>()),
  get: vi.fn(),
  post: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());
const session: Session = {
  csrf_token: "x".repeat(48),
  user: {
    id: "buyer",
    email: "buyer@example.test",
    display_name: "Buyer",
    role: "customer",
    staff_alias: "",
    suspended: false,
    mfa_enabled: false,
    notify_updates: true,
  },
  google_enabled: false,
  google_linked: false,
  mfa_required: false,
  capabilities: ["account"],
  terms_version: "terms-v2",
  terms_url: "/terms",
};
it("requires explicit price acceptance and reuses the idempotency key after an uncertain failure", async () => {
  vi.mocked(get).mockResolvedValue(session);
  vi.mocked(post).mockRejectedValue(
    new APIError("A connection failed. Retry this request."),
  );
  const busy = vi.fn();
  render(
    <MemoryRouter>
      <SubmitOrder
        slug="game"
        service="boost"
        releaseID="release"
        pack="pack"
        variant={{
          ...emptyVariant("basic"),
          amount_minor: "1234",
          currency: "USD",
        }}
        answers={{ mode: "solo" }}
        coupon=""
        estimate={null}
        setBusy={busy}
      />
    </MemoryRouter>,
  );
  const submit = await screen.findByRole("button", {
    name: "Create package order",
  });
  expect(submit).toBeDisabled();
  expect(post).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByLabelText("I accept the terms and fixed package price"),
  );
  fireEvent.click(submit);
  await screen.findByRole("alert");
  await waitFor(() => {
    expect(submit).toBeEnabled();
  });
  fireEvent.click(submit);
  await waitFor(() => {
    expect(post).toHaveBeenCalledTimes(2);
  });
  const first = vi.mocked(post).mock.calls[0]?.[1],
    second = vi.mocked(post).mock.calls[1]?.[1];
  expect(first).toEqual(second);
  expect(first).toMatchObject({
    kind: "package",
    expected_amount: "1234",
    expected_coupon_version: 0,
    terms_version: "terms-v2",
    accept_terms: true,
  });
  expect(typeof (first as { request_key: unknown }).request_key).toBe("string");
  expect(busy).toHaveBeenCalledWith(true);
});
it("requires completion of the staff second factor before an order can be submitted", async () => {
  vi.mocked(get).mockResolvedValue({
    ...session,
    mfa_required: true,
    capabilities: [],
  });
  render(
    <MemoryRouter>
      <SubmitOrder
        slug="game"
        service="boost"
        releaseID="release"
        pack=""
        answers={{}}
        coupon=""
        estimate={null}
        setBusy={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole("link", {
      name: "Sign in and complete verification",
    }),
  ).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Submit quote request" }),
  ).not.toBeInTheDocument();
  expect(post).not.toHaveBeenCalled();
});
