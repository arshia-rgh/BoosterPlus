import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import List, { meta as listMeta } from "./reviews";
import Detail, { meta as detailMeta } from "./review";
import Queue, { meta as queueMeta } from "./reviews-admin";
import Review, { meta as reviewMeta } from "./review-admin";
import Public, { meta as publicMeta, loader } from "./game-reviews";
import { loadReviews } from "../reviews/loaders.server";
vi.mock("../identity/identity", () => ({
  default: ({
    capability,
    children,
  }: {
    capability: string;
    children: ReactNode;
  }) => <section aria-label={capability}>{children}</section>,
}));
vi.mock("../reviews/pages", () => ({
  ReviewList: ({ admin = false }: { admin?: boolean }) => (
    <p>{admin ? "Moderation queue" : "Purchase history"}</p>
  ),
  ReviewDetail: ({ admin = false }: { admin?: boolean }) => (
    <p>{admin ? "Moderation decisions" : "Customer review"}</p>
  ),
}));
vi.mock("../reviews/public", () => ({ default: () => <p>Public reviews</p> }));
vi.mock("../reviews/loaders.server", () => ({ loadReviews: vi.fn() }));
it("protects private routes and loads public feedback through the server", async () => {
  for (const meta of [listMeta, detailMeta, queueMeta, reviewMeta, publicMeta])
    expect(meta()[0]?.title).toContain("PLAYORA");
  render(
    <>
      <List />
      <Detail />
      <Queue />
      <Review />
      <Public />
    </>,
  );
  expect(screen.getAllByRole("region", { name: "account" })).toHaveLength(2);
  expect(screen.getAllByRole("region", { name: "admin" })).toHaveLength(2);
  expect(screen.getByText("Moderation decisions")).toBeVisible();
  expect(screen.getByText("Public reviews")).toBeVisible();
  const request = new Request("https://booster.example/games/test/reviews");
  await loader({ params: { slug: "test" }, request });
  expect(loadReviews).toHaveBeenCalledWith("test", request);
});
