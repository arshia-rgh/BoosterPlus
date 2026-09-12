import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import AccountAlerts from "./accounts";
import { destination } from "./model";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
afterEach(() => vi.clearAllMocks());
it("saves explicit account criteria with exact minor units and separate email consent", async () => {
  vi.mocked(useResource).mockReturnValue({
    data: { games: [], next: "" },
    loading: false,
    error: null,
    reload: vi.fn(),
  });
  vi.mocked(post).mockResolvedValue({});
  render(
    <MemoryRouter>
      <AccountAlerts slug="game" />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Region (optional exact match)"), {
    target: { value: "EU" },
  });
  fireEvent.change(
    screen.getByLabelText("Price currency (optional, for example USD)"),
    { target: { value: "usd" } },
  );
  fireEvent.change(
    screen.getByLabelText("Maximum price (optional, requires currency)"),
    { target: { value: "19.01" } },
  );
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Save account alert" }));
  await screen.findByText(/Account alert saved/);
  expect(post).toHaveBeenCalledWith(
    "/availability",
    {
      slug: "game",
      package: "",
      variant: "",
      account: {
        listing_id: "",
        region: "EU",
        rank: "",
        currency: "USD",
        max_amount_minor: 1901,
      },
      accept: true,
      consent_version: "availability-v1",
    },
    expect.anything(),
  );
});
it("routes saved account alerts to public inventory without private identifiers", () => {
  expect(
    destination({
      slug: "game",
      package: "account_inventory",
      variant: "opaque",
      account: {
        listing_id: "public-id",
        region: "EU",
        rank: "",
        currency: "USD",
        max_amount_minor: 2000,
      },
    }),
  ).toBe("/accounts/public-id");
  expect(
    destination({
      slug: "game",
      package: "account_inventory",
      variant: "opaque",
      account: {
        listing_id: "",
        region: "EU",
        rank: "Mythic",
        currency: "",
        max_amount_minor: 0,
      },
    }),
  ).toBe("/accounts?slug=game&region=EU&rank=Mythic");
});
