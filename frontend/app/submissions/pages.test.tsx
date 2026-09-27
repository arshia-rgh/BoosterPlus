import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import { useResource } from "../orders/resource";
import { NewSubmission } from "./pages";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
afterEach(() => vi.clearAllMocks());
it("retains the selected game and identical draft request after an uncertain response", async () => {
  const reload = vi.fn();
  vi.mocked(useResource).mockImplementation((path) => ({
    data: path.includes("?")
      ? {
          games: [
            {
              id: "other",
              slug: "other-game",
              name: "Other game",
              intake_enabled: true,
              paused: false,
            },
          ],
          next: "",
        }
      : {
          id: "release",
          paused: false,
          configuration: {
            intake: {
              name: "Review game intake",
              description: "Private review",
            },
          },
        },
    loading: false,
    error: null,
    reload,
  }));
  vi.mocked(post)
    .mockRejectedValueOnce(new Error("Lost response"))
    .mockRejectedValueOnce(
      Object.assign(new APIError("Request needs review"), { status: 409 }),
    )
    .mockResolvedValueOnce({ submission: { id: "saved" } });
  render(
    <MemoryRouter initialEntries={["/sell/new?slug=review-game"]}>
      <Routes>
        <Route path="/sell/new" element={<NewSubmission />} />
        <Route path="/sell/:id" element={<h1>Saved private submission</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  expect(useResource).toHaveBeenCalledWith(
    "/catalog/games/review-game",
    expect.anything(),
  );
  fireEvent.change(screen.getByLabelText("Private account title"), {
    target: { value: "Private review title" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create private draft" }));
  const retry = await screen.findByRole("button", {
    name: "Check the same submission request",
  });
  expect(screen.getByLabelText("Private account title")).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Submit Other game account" }),
  ).toBeDisabled();
  fireEvent.click(retry);
  await waitFor(() => {
    expect(post).toHaveBeenCalledTimes(2);
  });
  await waitFor(() => expect(retry).toBeEnabled());
  expect(screen.getByLabelText("Private account title")).toBeDisabled();
  fireEvent.click(retry);
  await screen.findByRole("heading", { name: "Saved private submission" });
  expect(vi.mocked(post).mock.calls.map((call) => call[1])).toEqual(
    Array(3).fill(vi.mocked(post).mock.calls[0]?.[1]),
  );
});
