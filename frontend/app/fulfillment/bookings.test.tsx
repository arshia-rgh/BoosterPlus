import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { get, post } from "../identity/api";
import type { Work } from "./model";
import Bookings from "./bookings";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
  post: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());
const work: Work = {
  coordination_id: "",
  coordination_shared: false,
  order_id: "synthetic-order",
  order_version: 1,
  access_version: 1,
  version: 1,
  game: "Synthetic game",
  service: "Rank boost",
  state: "queued",
  mode: "account",
  secret_hours: 1,
  alias: "Assigned booster",
  progress: 0,
  completion_pending: false,
  note: "Assigned",
  estimated_start: null,
  estimated_finish: null,
  forecast_review: false,
  shared: [],
  updated_at: "2026-09-10T00:00:00Z",
};

it("requires a current available window before presenting session detail inputs", async () => {
  let available = false;
  const slot = {
    availability_id: "window",
    starts_at: "2099-01-01T10:00:00Z",
    ends_at: "2099-01-01T11:00:00Z",
    timezone: "UTC",
  };
  vi.mocked(get).mockImplementation((path) =>
    Promise.resolve({
      items: path.includes("/slots") && available ? [slot] : [],
      next: "",
    }),
  );
  render(
    <MemoryRouter>
      <Bookings
        work={{ ...work, mode: "together" }}
        audience="account"
        reload={vi.fn()}
      />
    </MemoryRouter>,
  );
  await screen.findByText(/No free windows in this period/);
  expect(
    screen.queryByLabelText("Session time zone (IANA)"),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByLabelText("Session action reason"),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Submit session proposal" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("link", { name: "Ask about a session" }),
  ).toHaveAttribute("href", "/orders/synthetic-order?section=messages");
  available = true;
  fireEvent.click(screen.getByRole("button", { name: "Refresh availability" }));
  await waitFor(() => {
    expect(
      screen.getByLabelText("Available window").querySelectorAll("option"),
    ).toHaveLength(2);
  });
  fireEvent.change(screen.getByLabelText("Available window"), {
    target: { value: "window:" + slot.starts_at },
  });
  expect(screen.getByLabelText("Session time zone (IANA)")).toBeVisible();
  expect(
    screen.queryByLabelText("Session start: repeated clock hour"),
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Session time zone (IANA)"), {
    target: { value: "Europe/London" },
  });
  expect(
    screen.getByLabelText("Session start: repeated clock hour"),
  ).toBeVisible();
  expect(
    screen.getByLabelText("Session end: repeated clock hour"),
  ).toBeVisible();
  fireEvent.change(screen.getByLabelText("Session time zone (IANA)"), {
    target: { value: "UTC" },
  });
  expect(
    screen.queryByLabelText("Session start: repeated clock hour"),
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Availability period"), {
    target: { value: "1" },
  });
  expect(
    screen.queryByLabelText("Session time zone (IANA)"),
  ).not.toBeInTheDocument();
});

it("focuses an invalid session note or zone without sending a proposal", async () => {
  const slot = {
    availability_id: "window",
    starts_at: "2099-01-01T10:00:00Z",
    ends_at: "2099-01-01T11:00:00Z",
    timezone: "UTC",
  };
  vi.mocked(get).mockImplementation((path) =>
    Promise.resolve({ items: path.includes("/slots") ? [slot] : [], next: "" }),
  );
  render(
    <MemoryRouter>
      <Bookings
        work={{ ...work, mode: "together" }}
        audience="account"
        reload={vi.fn()}
      />
    </MemoryRouter>,
  );
  await waitFor(() => {
    expect(
      screen.getByLabelText("Available window").querySelectorAll("option"),
    ).toHaveLength(2);
  });
  fireEvent.change(screen.getByLabelText("Available window"), {
    target: { value: "window:" + slot.starts_at },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Submit session proposal" }),
  );
  await waitFor(() => {
    expect(screen.getByLabelText("Session note")).toHaveFocus();
  });
  fireEvent.change(screen.getByLabelText("Session note"), {
    target: { value: "Please use this agreed window." },
  });
  fireEvent.change(screen.getByLabelText("Session time zone (IANA)"), {
    target: { value: "not-a-zone" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Submit session proposal" }),
  );
  await waitFor(() => {
    expect(screen.getByLabelText("Session time zone (IANA)")).toHaveFocus();
  });
  expect(screen.getByLabelText("Session note")).toHaveValue(
    "Please use this agreed window.",
  );
  expect(post).not.toHaveBeenCalled();
});
