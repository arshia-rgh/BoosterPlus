import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, get, post } from "../identity/api";
import StaffControls from "./staff-controls";
import type { Conversation } from "./model";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
  post: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());
it("keeps the edited revision across incoming messages and requires review after a stale save", async () => {
  vi.mocked(get).mockResolvedValue({ users: [] });
  const conflict = new APIError("The conversation changed. Reload and review.");
  conflict.status = 409;
  vi.mocked(post).mockRejectedValue(conflict);
  const done = vi.fn();
  const thread: Conversation = {
    id: "owned-thread",
    kind: "presales",
    subject: "Service question",
    state: "open",
    version: 2,
    sequence: 1,
    unread: 1,
    booster_shared: false,
    order_id: "",
    linked_order_id: "",
    slug: "",
    created_at: "2026-09-13T10:00:00Z",
    updated_at: "2026-09-13T10:00:00Z",
  };
  const view = render(<StaffControls thread={thread} done={done} />);
  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: "Save assignment" }),
    ).toBeEnabled();
  });
  fireEvent.change(screen.getByLabelText("Set conversation status"), {
    target: { value: "resolved" },
  });
  view.rerender(
    <StaffControls
      thread={{ ...thread, version: 3, state: "waiting" }}
      done={done}
    />,
  );
  expect(screen.getByLabelText("Set conversation status")).toHaveValue(
    "resolved",
  );
  expect(
    screen.getByText(/Conversation changed while you were editing/),
  ).toBeVisible();
  fireEvent.click(
    screen.getByRole("button", { name: "Save conversation status" }),
  );
  await screen.findByText("The conversation changed. Reload and review.");
  expect(post).toHaveBeenCalledWith(
    "/admin/conversations/owned-thread/state",
    expect.objectContaining({ version: 2, state: "resolved" }),
    expect.anything(),
  );
  expect(done).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Reload conversation controls" }),
  );
  expect(screen.getByLabelText("Set conversation status")).toHaveValue(
    "waiting",
  );
  vi.mocked(post).mockResolvedValue({
    ...thread,
    version: 4,
    state: "waiting",
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Save conversation status" }),
  );
  await waitFor(() => {
    expect(done).toHaveBeenCalledOnce();
  });
  expect(post).toHaveBeenLastCalledWith(
    "/admin/conversations/owned-thread/state",
    expect.objectContaining({ version: 3, state: "waiting" }),
    expect.anything(),
  );
});
