import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { useResource } from "../orders/resource";
import SellerOffers from "./offers";
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
afterEach(() => vi.clearAllMocks());
it.each(["buy_first", "consignment"])(
  "prevents accepting expired %s terms and distinguishes the payout trigger",
  (model) => {
    // Match the real hook: a resolved response retains its identity until refresh.
    const responses = new Map<string, ReturnType<typeof useResource>>();
    vi.mocked(useResource).mockImplementation((path) => {
      const cached = responses.get(path);
      if (cached) return cached;
      const response = {
        data: path.endsWith("/offers")
          ? {
              offers: [
                {
                  id: "offer",
                  version: 2,
                  state: "offered",
                  expires_at: "2020-01-01T00:00:00Z",
                  control_verified_at: null,
                  terms: {
                    model,
                    amount: "10.00000001",
                    currency: "usdttrc20",
                    network: "trx",
                    proceeds_basis: "Exact net amount",
                    fees: "No additional deductions",
                    transfer_requirements: "Protected ownership checklist",
                    dispute_terms: "Published dispute terms",
                    withdrawal_terms: "Agreed withdrawal terms",
                    payout_delay_hours: 24,
                    payout_deadline_hours: 48,
                  },
                },
              ],
            }
          : path === "/auth/session"
            ? { user: { role: "customer" } }
            : { transfers: [] },
        error: null,
        loading: false,
        reload: vi.fn(),
      };
      responses.set(path, response);
      return response;
    });
    render(
      <MemoryRouter>
        <SellerOffers
          id="submission"
          version={2}
          state="approved_pending_terms"
          admin={false}
          changed={vi.fn()}
        />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText("Seller agreement decision note"), {
      target: { value: "I reviewed these exact seller terms." },
    });
    fireEvent.click(
      screen.getByLabelText("I confirm these exact terms and this decision"),
    );
    expect(
      screen.getByRole("button", { name: "Accept seller agreement" }),
    ).toBeDisabled();
    expect(screen.getByText(/This offer has expired/)).toBeVisible();
    expect(
      screen.getByText(
        model === "buy_first"
          ? /after verified ownership control/
          : /after buyer acknowledgement/,
      ),
    ).toBeVisible();
  },
);
