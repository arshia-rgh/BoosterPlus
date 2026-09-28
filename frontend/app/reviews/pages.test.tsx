import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, it, vi } from "vitest";
import { useResource } from "../orders/resource";
import { ReviewList, ReviewDetail } from "./pages";
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
it("preserves filtered return and moderation draft through local review sections", async () => {
  const review = {
    id: "review-one",
    order_id: "order-one",
    version: 1,
    game: "Fixture game",
    slug: "fixture",
    state: "pending",
    rating: 4,
    created_at: "2026-09-28T00:00:00Z",
    updated_at: "2026-09-28T00:00:00Z",
  };
  vi.mocked(useResource).mockImplementation((path) => ({
    data: path.includes("history")
      ? { revisions: [] }
      : path.startsWith("/admin/reviews?")
        ? { items: [review], next: "" }
        : {
            review,
            body: "Customer feedback",
            answers: {},
            policy: {
              release_id: "release",
              policy: {
                content: "Accepted fixture policy",
                fields: [],
                rules: [],
              },
              references: [],
            },
            response: "",
          },
    loading: false,
    error: null,
    reload: vi.fn(),
  }));
  const router = createMemoryRouter(
    [
      { path: "/admin/reviews", element: <ReviewList admin /> },
      { path: "/admin/reviews/:id", element: <ReviewDetail admin /> },
    ],
    { initialEntries: ["/admin/reviews?state=pending&after=cursor"] },
  );
  render(<RouterProvider router={router} />);
  fireEvent.click(screen.getByRole("link", { name: /Fixture game/ }));
  await screen.findByLabelText("Internal moderation explanation");
  fireEvent.change(screen.getByLabelText("Internal moderation explanation"), {
    target: { value: "Private pending explanation" },
  });
  fireEvent.click(screen.getByRole("link", { name: "History" }));
  await screen.findByRole("heading", { name: "Review revision history" });
  expect(
    screen.getByRole("region", { name: "Review review-one" }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("link", { name: "Overview & moderation" }));
  expect(
    await screen.findByLabelText("Internal moderation explanation"),
  ).toHaveValue("Private pending explanation");
  fireEvent.click(screen.getByRole("link", { name: /Back to review list/ }));
  await screen.findByText("Keep your review drafts?");
  fireEvent.click(
    screen.getByRole("button", { name: "Discard drafts and leave" }),
  );
  await waitFor(() => {
    expect(router.state.location.search).toBe("?state=pending&after=cursor");
  });
});
it("hides but retains moderation drafts during failed refresh and requires explicit newer-revision replacement", async () => {
  const row = {
    review: {
      id: "review-one",
      order_id: "order",
      version: 1,
      game: "Fixture",
      slug: "fixture",
      state: "pending",
      rating: 4,
      created_at: "2026-09-28T00:00:00Z",
      updated_at: "2026-09-28T00:00:00Z",
    },
    body: "Feedback",
    answers: {},
    policy: {
      release_id: "release",
      policy: { content: "Policy", fields: [], rules: [] },
      references: [],
    },
    response: "",
  };
  let failed = false,
    newer = false;
  vi.mocked(useResource).mockImplementation((path) => ({
    data: failed
      ? null
      : path.includes("history")
        ? { revisions: [] }
        : { ...row, review: { ...row.review, version: newer ? 2 : 1 } },
    error: failed ? new Error("Connection interrupted") : null,
    loading: false,
    reload: vi.fn(),
  }));
  const router = createMemoryRouter(
    [{ path: "/admin/reviews/:id", element: <ReviewDetail admin /> }],
    { initialEntries: ["/admin/reviews/review-one"] },
  );
  render(<RouterProvider router={router} />);
  fireEvent.change(
    await screen.findByLabelText("Internal moderation explanation"),
    { target: { value: "Preserved note" } },
  );
  failed = true;
  await act(async () => {
    await router.navigate("/admin/reviews/review-one?section=history");
  });
  expect(
    screen.getByLabelText("Internal moderation explanation"),
  ).not.toBeVisible();
  failed = false;
  newer = true;
  await act(async () => {
    await router.navigate("/admin/reviews/review-one?section=overview");
  });
  await screen.findByText(/This review has a newer revision/);
  expect(screen.getByLabelText("Internal moderation explanation")).toHaveValue(
    "Preserved note",
  );
  expect(
    screen.getByLabelText("Internal moderation explanation"),
  ).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", {
      name: "Discard moderation draft and load current review",
    }),
  );
  expect(screen.getByLabelText("Internal moderation explanation")).toHaveValue(
    "",
  );
});
