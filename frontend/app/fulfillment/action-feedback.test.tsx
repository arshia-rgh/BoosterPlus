import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import { ExecutionActions } from "./actions";
import type { Work } from "./model";

vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
afterEach(() => vi.resetAllMocks());
const work: Work = {
  coordination_id: "conversation",
  coordination_shared: true,
  order_id: "work",
  order_version: 1,
  access_version: 1,
  version: 1,
  game: "Synthetic game",
  service: "Boost",
  state: "in_progress",
  mode: "account",
  secret_hours: 1,
  alias: "Assigned booster",
  progress: 20,
  completion_pending: false,
  note: "Reviewed",
  estimated_start: null,
  estimated_finish: null,
  forecast_review: false,
  shared: [],
  updated_at: "2026-10-12T00:00:00Z",
};
function mount() {
  const reload = vi.fn();
  render(
    <>
      <ExecutionActions work={work} admin={false} reload={reload} />
      <button>Another task</button>
    </>,
  );
  fireEvent.change(screen.getByLabelText("Customer-visible update"), {
    target: { value: "Reached the next milestone" },
  });
  fireEvent.change(screen.getByLabelText("Progress percent (0–99)"), {
    target: { value: "42" },
  });
  const save = screen.getByRole("button", { name: "Save progress" });
  save.focus();
  return { save, reload };
}
it("announces confirmed progress, focuses its result and blocks duplicate clicks", async () => {
  let resolve: (value: Work) => void = () => {};
  vi.mocked(post).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const { save, reload } = mount();
  fireEvent.click(save);
  fireEvent.click(save);
  expect(save).toBeDisabled();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  await act(async () => {
    resolve({ ...work, version: 2, progress: 42 });
    await Promise.resolve();
  });
  await waitFor(() =>
    expect(
      screen.getByRole("group", {
        name: "Fulfillment update result",
      }),
    ).toHaveFocus(),
  );
  expect(screen.getByRole("status")).toHaveTextContent("Progress saved: 42%");
  expect(screen.getByLabelText("Customer-visible update")).toHaveValue("");
  expect(post).toHaveBeenCalledOnce();
  expect(reload).toHaveBeenCalledOnce();
});
it("retains an unsuccessful update and focuses recovery without claiming success", async () => {
  vi.mocked(post).mockRejectedValue(
    new APIError("Unable to save. Retry this update."),
  );
  const { save, reload } = mount();
  fireEvent.click(save);
  await waitFor(() =>
    expect(
      screen.getByRole("group", {
        name: "Fulfillment update result",
      }),
    ).toHaveFocus(),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to save");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Customer-visible update")).toHaveValue(
    "Reached the next milestone",
  );
  expect(screen.getByLabelText("Progress percent (0–99)")).toHaveValue("42");
  expect(save).toBeEnabled();
  expect(reload).not.toHaveBeenCalled();
});
it("announces success without stealing focus from another task", async () => {
  let resolve: (value: Work) => void = () => {};
  vi.mocked(post).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const { save } = mount();
  fireEvent.click(save);
  const other = screen.getByRole("button", { name: "Another task" });
  other.focus();
  await act(async () => {
    resolve({ ...work, version: 2, progress: 42 });
    await Promise.resolve();
  });
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Progress saved: 42%",
  );
  expect(other).toHaveFocus();
});
