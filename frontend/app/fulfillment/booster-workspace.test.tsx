import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, get } from "../identity/api";
import { BoosterOrder } from "./booster-workspace";
import type { Work } from "./model";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
}));
vi.mock("./secrets", () => ({
  StaffSecret: () => <p>Synthetic protected reveal</p>,
}));
vi.mock("../support/thread", () => ({
  default: () => (
    <label>
      Shared reply
      <textarea />
    </label>
  ),
}));
const ready = {
  ready: true,
  requirement: "ready",
  checked_at: "2026-09-27T00:00:00Z",
};
const work: Work = {
  coordination_id: "thread",
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
  alias: "Assigned staff",
  progress: 20,
  completion_pending: false,
  note: "Reviewed",
  estimated_start: null,
  estimated_finish: null,
  forecast_review: false,
  shared: [],
  updated_at: "2026-09-27T00:00:00Z",
};
afterEach(() => {
  vi.clearAllMocks();
});
function view() {
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/booster/orders/work",
          search: "?section=progress",
          state: { assignmentSearch: "state=active&search=game" },
        },
      ]}
    >
      <Routes>
        <Route path="/booster/orders/:id" element={<BoosterOrder />} />
      </Routes>
    </MemoryRouter>,
  );
}
it("retains ordinary progress and message drafts in one named assignment", async () => {
  vi.mocked(get).mockImplementation((path) =>
    Promise.resolve(path.includes("/readiness") ? ready : work),
  );
  view();
  fireEvent.change(await screen.findByLabelText("Customer-visible update"), {
    target: { value: "Progress draft" },
  });
  fireEvent.click(screen.getByRole("link", { name: "Messages & proof" }));
  fireEvent.change(screen.getByLabelText("Shared reply"), {
    target: { value: "Message draft" },
  });
  fireEvent.click(screen.getByRole("link", { name: "Progress" }));
  expect(screen.getByLabelText("Customer-visible update")).toHaveValue(
    "Progress draft",
  );
  expect(
    screen.getByRole("heading", { name: "Assignment work" }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("link", { name: "Messages & proof" }));
  expect(screen.getByLabelText("Shared reply")).toHaveValue("Message draft");
  expect(screen.getByRole("link", { name: /Assigned work/ })).toHaveAttribute(
    "href",
    "/booster/orders?state=active&search=game",
  );
});
it("conceals recoverable drafts and clears them after access is removed", async () => {
  let status = 200;
  vi.mocked(get).mockImplementation((path) => {
    if (status === 200)
      return Promise.resolve(path.includes("/readiness") ? ready : work);
    const error = new APIError("Unavailable");
    error.status = status;
    return Promise.reject(error);
  });
  view();
  fireEvent.change(await screen.findByLabelText("Customer-visible update"), {
    target: { value: "Retained progress" },
  });
  status = 503;
  fireEvent.click(screen.getByRole("button", { name: "Refresh assignment" }));
  await screen.findByRole("region", { name: "Assignment connection recovery" });
  expect(screen.getByLabelText("Customer-visible update")).not.toBeVisible();
  status = 200;
  fireEvent.click(screen.getByRole("button", { name: "Retry assignment" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Customer-visible update")).toBeVisible(),
  );
  expect(screen.getByLabelText("Customer-visible update")).toHaveValue(
    "Retained progress",
  );
  status = 403;
  fireEvent.click(screen.getByRole("button", { name: "Refresh assignment" }));
  await screen.findByRole("region", { name: "Assignment access removed" });
  expect(
    screen.queryByLabelText("Customer-visible update"),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("Synthetic game")).not.toBeInTheDocument();
});
it("unmounts protected access on section changes", async () => {
  vi.mocked(get).mockImplementation((path) =>
    Promise.resolve(path.includes("/readiness") ? ready : work),
  );
  view();
  await screen.findByLabelText("Customer-visible update");
  fireEvent.click(screen.getByRole("link", { name: "Game access" }));
  expect(screen.getByText("Synthetic protected reveal")).toBeVisible();
  fireEvent.click(screen.getByRole("link", { name: "Overview" }));
  expect(
    screen.queryByText("Synthetic protected reveal"),
  ).not.toBeInTheDocument();
});
it("waits for fresh authority before remounting an assignment after a session event", async () => {
  let resolveWork: (value: Work) => void = () => {};
  let reads = 0;
  vi.mocked(get).mockImplementation((path) => {
    if (path.includes("/readiness")) return Promise.resolve(ready);
    reads++;
    return reads === 1
      ? Promise.resolve(work)
      : new Promise((resolve) => {
          resolveWork = resolve;
        });
  });
  view();
  await screen.findByLabelText("Customer-visible update");
  fireEvent(
    window,
    new CustomEvent("boosterplus:session-changed", {
      detail: { portal: "booster" },
    }),
  );
  expect(
    screen.queryByLabelText("Customer-visible update"),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Check assignment access" }),
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "Checking current assignment access",
  );
  expect(
    screen.queryByLabelText("Customer-visible update"),
  ).not.toBeInTheDocument();
  await act(async () => {
    resolveWork({ ...work, coordination_shared: false });
    await Promise.resolve();
  });
  expect(await screen.findByLabelText("Customer-visible update")).toHaveValue(
    "",
  );
  fireEvent.click(screen.getByRole("link", { name: "Messages & proof" }));
  expect(
    screen.getByText(/Shared coordination is not available/),
  ).toBeVisible();
  expect(screen.queryByLabelText("Shared reply")).not.toBeInTheDocument();
});

it("keeps a panel-local verification return after clearing a sensitive assignment", async () => {
  vi.mocked(get).mockImplementation((path) =>
    Promise.resolve(path.includes("/readiness") ? ready : work),
  );
  view();
  await screen.findByLabelText("Customer-visible update");
  fireEvent.click(screen.getByRole("link", { name: "Game access" }));
  fireEvent(
    window,
    new CustomEvent("boosterplus:session-changed", {
      detail: { portal: "booster", verification: "recent_auth_required" },
    }),
  );
  expect(
    screen.queryByText("Synthetic protected reveal"),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("Synthetic game")).not.toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Verify to continue" }),
  ).toHaveFocus();
  expect(
    screen.getByRole("button", { name: "Verify to continue here" }),
  ).toBeVisible();
  fireEvent(
    window,
    new CustomEvent("boosterplus:session-changed", {
      detail: { portal: "admin" },
    }),
  );
  expect(
    screen.getByRole("button", { name: "Verify to continue here" }),
  ).toBeVisible();
  fireEvent.click(
    screen.getByRole("button", { name: "Check assignment access" }),
  );
  await screen.findByText("Synthetic protected reveal");
  expect(
    screen.queryByRole("button", { name: "Verify to continue here" }),
  ).not.toBeInTheDocument();
  fireEvent(
    window,
    new CustomEvent("boosterplus:session-changed", {
      detail: { portal: "booster" },
    }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Access changed");
  expect(
    screen.queryByRole("button", { name: "Verify to continue here" }),
  ).not.toBeInTheDocument();
});
