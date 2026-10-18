import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import { AccountCard, ProductTerms } from "./account-presentation";
import type { PublicListing } from "./model";

const listing: PublicListing = {
  id: "account",
  release_id: "release",
  game: "Mobile Legends",
  slug: "mobile-legends",
  state: "published",
  images: [],
  product: {
    title: "Collector account",
    description: "Exact published description",
    region: "Europe",
    rank: "Mythic",
    attributes: [
      { label: "Heroes", value: "120" },
      { label: "Skins", value: "240" },
      { label: "Collection", value: "Exact third attribute" },
    ],
    media_ids: [],
    currency: "USD",
    amount_minor: "10500",
    commission: {
      version: "account_commission_v1",
      base_minor: "10000",
      fee_minor: "500",
      total_minor: "10500",
    },
    sale_terms: "Exact sale agreement",
    transfer_requirements: "Exact transfer requirements",
    dispute_terms: "Exact dispute terms",
    acknowledgement_terms: "Exact acknowledgement terms",
    dispute_hours: 168,
    delivery_min_hours: 24,
    delivery_max_hours: 72,
  },
};

it("makes rank, region, selected facts and inclusive total scannable without inventing screenshots", () => {
  render(
    <MemoryRouter>
      <AccountCard listing={listing} />
    </MemoryRouter>,
  );
  const card = screen.getByRole("article", { name: "Collector account" });
  expect(within(card).getByRole("heading", { level: 3 })).toHaveTextContent(
    "Collector account",
  );
  expect(within(card).getByText("Rank").nextElementSibling).toHaveTextContent(
    "Mythic",
  );
  expect(within(card).getByText("Region").nextElementSibling).toHaveTextContent(
    "Europe",
  );
  expect(within(card).getByText("Heroes").nextElementSibling).toHaveTextContent(
    "120",
  );
  expect(
    within(card).queryByText("Exact third attribute"),
  ).not.toBeInTheDocument();
  expect(within(card).getByText("USD 105.00")).toBeVisible();
  expect(within(card).getByText("Includes 5% buyer commission")).toBeVisible();
  expect(within(card).getByText("No account screenshot")).toBeVisible();
  expect(within(card).queryByRole("img")).not.toBeInTheDocument();
  expect(
    within(card).getByRole("link", { name: "Review account" }),
  ).toHaveAttribute("href", "/games/mobile-legends/accounts/account");
});

it("retains every authored term and feature in the read-only accepted record", () => {
  render(<ProductTerms listing={listing} />);
  expect(screen.getByText("Exact third attribute")).toBeVisible();
  expect(screen.getByText("24–72 hours after verified payment")).toBeVisible();
  expect(
    screen.getByText("168 hours after you acknowledge delivery"),
  ).toBeVisible();
  expect(
    screen.getByText(/inspection period does not end your protected/),
  ).toBeVisible();
  for (const [label, text] of [
    ["Sale agreement", "Exact sale agreement"],
    ["Ownership transfer", "Exact transfer requirements"],
    ["Disputes & acknowledgement", "Exact dispute terms"],
  ] as const) {
    expect(screen.getByText(text)).not.toBeVisible();
    fireEvent.click(screen.getByText(label));
    expect(screen.getByText(text)).toBeVisible();
  }
  expect(screen.getByText("Exact acknowledgement terms")).toBeVisible();
  expect(
    screen.queryByRole("button", { name: /reserve/i }),
  ).not.toBeInTheDocument();
});

it("keeps historical totals and private previews truthful", () => {
  const historical = structuredClone(listing);
  delete historical.product.commission;
  historical.state = "draft";
  historical.product.media_ids = ["private-image"];
  render(<AccountCard listing={historical} heading="h4" preview />);
  expect(screen.queryByText(/buyer commission/)).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent(
    "Collector account",
  );
  expect(screen.getByText("Preview image not loaded")).toBeVisible();
  expect(screen.getByText("Account card preview · private")).toBeVisible();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
