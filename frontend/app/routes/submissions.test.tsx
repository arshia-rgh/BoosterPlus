import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import List, { meta as listMeta } from "./submissions";
import Create, { meta as createMeta } from "./submission-new";
import Detail, { meta as detailMeta } from "./submission";
import Queue, { meta as queueMeta } from "./submissions-admin";
import Review, { meta as reviewMeta } from "./submission-admin";
vi.mock("../identity/identity", () => ({
  default: ({
    capability,
    children,
  }: {
    capability: string;
    children: ReactNode;
  }) => <section aria-label={capability}>{children}</section>,
}));
vi.mock("../submissions/pages", () => ({
  SubmissionList: ({ admin = false }: { admin?: boolean }) => (
    <p>{admin ? "Review queue" : "Seller history"}</p>
  ),
  SubmissionDetail: ({ admin = false }: { admin?: boolean }) => (
    <p>{admin ? "Review decisions" : "Seller submission"}</p>
  ),
  NewSubmission: () => <p>New private draft</p>,
}));
it("protects all five seller and review routes with their intended capability", () => {
  for (const meta of [listMeta, createMeta, detailMeta, queueMeta, reviewMeta])
    expect(meta()[0]?.title).toContain("PLAYORA");
  render(
    <>
      <List />
      <Create />
      <Detail />
      <Queue />
      <Review />
    </>,
  );
  expect(screen.getAllByRole("region", { name: "account" })).toHaveLength(3);
  expect(screen.getAllByRole("region", { name: "admin" })).toHaveLength(2);
  expect(screen.getByText("New private draft")).toBeVisible();
  expect(screen.getByText("Review decisions")).toBeVisible();
});
