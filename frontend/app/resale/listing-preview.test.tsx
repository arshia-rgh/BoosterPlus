import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ListingPreview from "./listing-preview";
import { productSchema } from "./model";
import { post } from "../identity/api";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});
it("previews the explicit cover first through private grants without publishing", async () => {
  const product = productSchema.parse({
    title: "Synthetic account",
    description: "Account details",
    region: "Europe",
    rank: "Gold",
    attributes: [],
    media_ids: ["a", "b"],
    cover_media_id: "b",
    currency: "USD",
    amount_minor: "1000",
    sale_terms: "Sale terms",
    transfer_requirements: "Transfer terms",
    dispute_terms: "Dispute terms",
    acknowledgement_terms: "Acknowledgement terms",
    dispute_hours: 24,
    delivery_min_hours: 1,
    delivery_max_hours: 24,
  });
  vi.mocked(post).mockImplementation((path) =>
    Promise.resolve({
      url: `/api/v1${path.replace("/grant", "/content")}?token=synthetic`,
    }),
  );
  vi.useFakeTimers();
  render(
    <ListingPreview
      listing={{
        id: "listing",
        release_id: "release",
        game: "Synthetic",
        slug: "game",
        state: "draft",
        product,
        images: [],
      }}
    />,
  );
  expect(post).not.toHaveBeenCalled();
  const load = screen.getByRole("button", {
    name: "Load private preview images",
  });
  load.focus();
  await act(async () => {
    fireEvent.click(load);
    await Promise.resolve();
  });
  const cover = screen.getByRole("img", {
    name: "Synthetic account — title image",
  });
  expect(load).toHaveFocus();
  expect(cover).toHaveAttribute(
    "src",
    "/api/v1/admin/media/b/content?token=synthetic",
  );
  expect(
    screen.getByRole("img", { name: "Synthetic account — reviewed view 1" }),
  ).toHaveAttribute("src", cover.getAttribute("src"));
  fireEvent.click(screen.getByRole("button", { name: "View screenshot 2" }));
  expect(
    screen.getByRole("img", { name: "Synthetic account — reviewed view 2" }),
  ).toHaveAttribute("src", "/api/v1/admin/media/a/content?token=synthetic");
  expect(post).toHaveBeenCalledTimes(2);
  expect(vi.mocked(post).mock.calls.map(([path]) => path)).toEqual([
    "/admin/media/b/grant",
    "/admin/media/a/grant",
  ]);
  screen.getByRole("button", { name: "View screenshot 2" }).focus();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(45000);
  });
  expect(load).toHaveFocus();
  expect(
    screen.queryByRole("button", { name: "View screenshot 2" }),
  ).not.toBeInTheDocument();
  expect(load).toHaveTextContent("Load private preview images");
});
