import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, it, vi } from "vitest";
import {
  SaleProgress,
  ListingReadiness,
  saleNextStep,
  publicationBlocker,
  type SellingProgress,
} from "./selling-progress";
const base: SellingProgress = {
  submission_state: "accepted",
  offer_state: "accepted",
  offer_id: "offer",
  arrangement: "consignment",
  handover: { state: "missing", locked: false, received_at: null },
  listing_id: "listing",
  listing_state: "draft",
  payout_state: "recipient_pending",
  blockers: ["handover", "listing_terms", "publication"],
};
const resource = (
  data: SellingProgress | null = base,
  error: unknown = null,
) => ({ data, error, loading: false, reload: vi.fn() });
it("directs administrators to propose seller terms without waiting for an owner", () => {
  expect(
    saleNextStep({ ...base, offer_state: "missing" }, true, false),
  ).toMatchObject({
    title: "Prepare a sale proposal",
    label: "Prepare sale proposal",
    actor: "You",
    section: "agreement",
  });
});
it("never equates accepted terms with publication and identifies the responsible next actor", () => {
  expect(saleNextStep(base, false, false)).toMatchObject({
    title: "PLAYORA is preparing your listing",
    actor: "PLAYORA",
    section: "messages",
  });
  expect(saleNextStep(base, true, false)).toMatchObject({
    title: "Finish and publish the listing",
    actor: "You",
    section: "listing",
  });
  expect(
    saleNextStep(
      {
        ...base,
        handover: { ...base.handover, state: "received" },
        blockers: ["publication"],
      },
      false,
      false,
    ).title,
  ).toBe("PLAYORA is preparing your listing");
  expect(
    saleNextStep(
      { ...base, listing_state: "published", blockers: [] },
      false,
      false,
    ).title,
  ).toBe("Live in Accounts");
});
it("does not block publication on missing or expired credentials, and does not label a disabled game live", () => {
  expect(
    saleNextStep(
      { ...base, handover: { ...base.handover, state: "expired" } },
      false,
      false,
    ).title,
  ).toBe("PLAYORA is preparing your listing");
  expect(
    saleNextStep(
      { ...base, handover: { ...base.handover, state: "refresh_required" } },
      false,
      false,
    ).title,
  ).toBe("PLAYORA is preparing your listing");
  expect(
    saleNextStep({ ...base, listing_state: "unavailable" }, false, false).title,
  ).toBe("Listing paused with this game");
});
it("preserves return context for an existing listing and keeps customer blockers read-only", () => {
  const router = createMemoryRouter(
    [
      {
        path: "*",
        element: (
          <SaleProgress id="submission" admin owner resource={resource()} />
        ),
      },
    ],
    { initialEntries: ["/admin/submissions/submission"] },
  );
  const view = render(<RouterProvider router={router} />);
  const link = screen.getByRole("link", {
    name: "Complete buyer terms and delivery timing",
  });
  expect(link).toHaveAttribute("href", "/admin/accounts/listing?section=terms");
  fireEvent.click(link);
  expect(router.state.location.state).toMatchObject({
    submissionID: "submission",
    submissionSection: "overview",
  });
  view.unmount();
  render(
    <RouterProvider
      router={createMemoryRouter([
        {
          path: "*",
          element: (
            <SaleProgress
              id="submission"
              admin={false}
              owner={false}
              resource={resource()}
            />
          ),
        },
      ])}
    />,
  );
  expect(
    screen.queryByRole("link", {
      name: "Complete buyer terms and delivery timing",
    }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Message the team" }),
  ).toHaveAttribute("href", "/?section=messages");
});
it("shows an actionable retry and no cached next step when progress fails", () => {
  const r = resource(base, new Error("offline"));
  render(
    <RouterProvider
      router={createMemoryRouter([
        {
          path: "*",
          element: <SaleProgress id="submission" admin owner resource={r} />,
        },
      ])}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "Sale progress unavailable" }),
  ).toBeVisible();
  expect(
    screen.queryByText("Waiting for secure account access"),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry sale progress" }));
  expect(r.reload).toHaveBeenCalledOnce();
});
it("reports incomplete saved listing fields even after preview and confirmation", () => {
  render(
    <RouterProvider
      router={createMemoryRouter([
        {
          path: "*",
          element: (
            <ListingReadiness
              resource={resource({
                ...base,
                blockers: ["listing_terms", "publication"],
              })}
              submissionID="submission"
              dirty={false}
              reviewed
              preview
            />
          ),
        },
      ])}
    />,
  );
  expect(
    screen.getByRole("link", {
      name: "Complete buyer terms and delivery timing",
    }),
  ).toHaveAttribute("href", "/?section=terms");
  expect(
    screen.queryByText("Ready for your final publication check."),
  ).not.toBeInTheDocument();
});

it("directs the seller to confirm a buy-first destination before asking the owner to pay", () => {
  const pending: SellingProgress = {
    ...base,
    arrangement: "buy_first",
    handover: { ...base.handover, state: "received" },
    blockers: ["seller_payment", "publication"],
  };
  expect(saleNextStep(pending, false, false)).toMatchObject({
    title: "Confirm your payout destination",
    section: "payout",
    actor: "You",
  });
  expect(saleNextStep(pending, true, true)).toMatchObject({
    title: "Waiting for the seller's payout destination",
    section: "payout",
    actor: "Seller",
  });
  expect(
    publicationBlocker("seller_payment", true, "recipient_pending"),
  ).toMatchObject({
    label: "Seller to confirm payout destination",
    actor: "Seller",
  });
  expect(
    saleNextStep({ ...pending, payout_state: "verified" }, true, true),
  ).toMatchObject({
    title: "Seller payout is needed before publication",
    actor: "You",
  });
  expect(
    saleNextStep({ ...pending, handover: base.handover }, false, false).section,
  ).toBe("payout");
  expect(
    saleNextStep(
      { ...pending, arrangement: "consignment", blockers: ["publication"] },
      false,
      false,
    ).title,
  ).toBe("PLAYORA is preparing your listing");
});
