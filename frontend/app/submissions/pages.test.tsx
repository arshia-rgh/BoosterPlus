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
  fireEvent.click(
    screen.getByRole("button", { name: "Continue to account details" }),
  );
  const retry = await screen.findByRole("button", {
    name: "Check the same submission request",
  });
  expect(screen.getByLabelText("Private account title")).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Choose Other game" }),
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

function renderDraft() {
  vi.mocked(useResource).mockImplementation((path) => ({
    data: path.includes("?")
      ? { games: [], next: "" }
      : {
          id: "release",
          paused: false,
          configuration: {
            intake: { name: "Account intake", description: "Private review" },
          },
        },
    loading: false,
    error: null,
    reload: vi.fn(),
  }));
  return render(
    <MemoryRouter initialEntries={["/sell/new?slug=review-game"]}>
      <NewSubmission />
    </MemoryRouter>,
  );
}

it("focuses an invalid draft title, retains it, and permits correction before creating", async () => {
  renderDraft();
  const title = screen.getByLabelText("Private account title");
  const create = screen.getByRole("button", {
    name: "Continue to account details",
  });
  fireEvent.click(create);
  await waitFor(() => expect(title).toHaveFocus());
  expect(title).toHaveAttribute("aria-invalid", "true");
  expect(title).toHaveAccessibleDescription(
    expect.stringContaining("1–120 characters"),
  );
  fireEvent.change(title, { target: { value: "x".repeat(130) } });
  expect(title).not.toHaveAttribute("aria-invalid");
  create.focus();
  fireEvent.click(create);
  await waitFor(() => expect(title).toHaveFocus());
  expect(title).toHaveValue("x".repeat(130));
  expect(post).not.toHaveBeenCalled();
  vi.mocked(post).mockRejectedValueOnce(new APIError("Unavailable"));
  fireEvent.change(title, { target: { value: "🎮".repeat(120) } });
  fireEvent.click(create);
  await waitFor(() => {
    expect(post).toHaveBeenCalledTimes(1);
  });
  expect(vi.mocked(post).mock.calls[0]?.[1]).toMatchObject({
    title: "🎮".repeat(120),
  });
});

it("associates server draft errors with their field and refocuses on an identical retry", async () => {
  vi.mocked(post).mockRejectedValue(
    Object.assign(new APIError("Review title"), {
      status: 422,
      issues: [{ path: "title", message: "Choose another private title." }],
    }),
  );
  renderDraft();
  const title = screen.getByLabelText("Private account title");
  fireEvent.change(title, { target: { value: "My account" } });
  const create = screen.getByRole("button", {
    name: "Continue to account details",
  });
  fireEvent.click(create);
  await waitFor(() => expect(title).toHaveFocus());
  expect(title).toHaveAccessibleDescription(
    expect.stringContaining("Choose another private title."),
  );
  expect(title).toHaveValue("My account");
  create.focus();
  fireEvent.click(create);
  await waitFor(() => {
    expect(post).toHaveBeenCalledTimes(2);
  });
  await waitFor(() => expect(title).toHaveFocus());
});
