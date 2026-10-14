import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, it, vi } from "vitest";
import {
  SaleProgress,
  ListingReadiness,
  saleNextStep,
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
it("never equates accepted terms with publication and identifies the responsible next actor", () => {
  expect(saleNextStep(base, false, false)).toMatchObject({
    title: "Share account access securely",
    actor: "You",
    section: "handover",
  });
  expect(saleNextStep(base, true, false)).toMatchObject({
    title: "Waiting for secure account access",
    actor: "Seller",
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
it("keeps expired and returned handovers actionable, and does not label a disabled game live", () => {
  expect(
    saleNextStep(
      { ...base, handover: { ...base.handover, state: "expired" } },
      false,
      false,
    ).title,
  ).toBe("Update expired account details");
  expect(
    saleNextStep(
      { ...base, handover: { ...base.handover, state: "refresh_required" } },
      false,
      false,
    ).title,
  ).toBe("Update access before relisting");
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
    screen.getByRole("link", { name: "Share account access" }),
  ).toHaveAttribute("href", "/?section=handover");
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
