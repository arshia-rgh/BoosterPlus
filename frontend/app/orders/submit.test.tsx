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
  portal: "customer",
  csrf_token: "x".repeat(48),
  user: {
    portal: "customer",
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
  vi.mocked(get).mockImplementation((path) =>
    Promise.resolve(
      path.includes("/me/order-requests/") ? { order_id: "" } : session,
    ),
  );
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

it("uses local sign-in return and ignores stale session responses", async () => {
  let older: ((value: Session) => void) | undefined;
  vi.mocked(get).mockResolvedValueOnce({
    ...session,
    user: null,
    capabilities: [],
  });
  render(
    <MemoryRouter>
      <SubmitOrder
        slug="game"
        service="boost"
        releaseID="release"
        pack=""
        answers={{ mode: "duo" }}
        coupon=""
        estimate={null}
        setBusy={vi.fn()}
      />
    </MemoryRouter>,
  );
  const link = await screen.findByRole("link", {
    name: "Sign in and complete verification",
  });
  expect(link).toHaveAttribute("href", "/login?returnTo=%2F%3Fstep%3Dreview");
  expect(link).not.toHaveAttribute("target");
  vi.mocked(get)
    .mockImplementationOnce(
      () =>
        new Promise<Session>((resolve) => {
          older = resolve;
        }),
    )
    .mockResolvedValueOnce(session);
  fireEvent(window, new Event("focus"));
  fireEvent(
    window,
    new CustomEvent("boosterplus:session-changed", {
      detail: { portal: "customer" },
    }),
  );
  expect(
    await screen.findByRole("button", { name: "Submit quote request" }),
  ).toBeDisabled();
  older?.({ ...session, user: null, capabilities: [] });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Submit quote request" }),
    ).toBeInTheDocument(),
  );
  expect(post).not.toHaveBeenCalled();
  vi.mocked(get).mockRejectedValueOnce(new APIError("Session unavailable"));
  fireEvent(window, new Event("focus"));
  await screen.findByText("Session unavailable");
  expect(
    screen.queryByRole("button", { name: "Submit quote request" }),
  ).not.toBeInTheDocument();
});
