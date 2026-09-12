import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { get } from "../identity/api";
import Thread from "./thread";
import type { Conversation } from "./model";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
}));
vi.mock("../media/attachment", () => ({
  UploadImage: () => null,
  DownloadImage: () => null,
}));
afterEach(() => vi.clearAllMocks());
it("recovers outside hidden message components on reconnect and keeps denied data hidden", async () => {
  const conversation: Conversation = {
    id: "thread",
    subject: "Private review",
    kind: "submission",
    submission_id: "submission",
    booster_shared: false,
    order_id: "",
    linked_order_id: "",
    slug: "game",
    state: "open",
    version: 1,
    sequence: 0,
    unread: 0,
    updated_at: "2026-09-10T00:00:00Z",
    created_at: "2026-09-10T00:00:00Z",
  };
  let connected = false;
  vi.mocked(get).mockImplementation((path) => {
    if (!connected) return Promise.reject(new Error("Offline"));
    if (path === "/conversations")
      return Promise.resolve({ conversations: [], next: "" });
    if (path.includes("/messages"))
      return Promise.resolve({ messages: [], next: 0, latest: 0 });
    return Promise.resolve(conversation);
  });
  const view = render(
    <MemoryRouter>
      <Thread />
    </MemoryRouter>,
  );
  await screen.findByRole("button", { name: "Retry conversation access" });
  expect(
    screen.queryByRole("heading", { name: "Private review" }),
  ).not.toBeInTheDocument();
  connected = true;
  await act(async () => {
    window.dispatchEvent(new Event("online"));
    await Promise.resolve();
  });
  expect(
    await screen.findByRole("heading", { name: "Private review" }),
  ).toBeVisible();
  connected = false;
  fireEvent.click(screen.getByRole("button", { name: "Refresh conversation" }));
  await waitFor(() => {
    expect(
      screen.queryByRole("heading", { name: "Private review" }),
    ).not.toBeInTheDocument();
  });
  const retry = screen.getByRole("button", {
    name: "Retry conversation access",
  });
  fireEvent.click(retry);
  expect(
    screen.queryByRole("heading", { name: "Private review" }),
  ).not.toBeInTheDocument();
  await screen.findByRole("button", { name: "Retry conversation access" });
  view.unmount();
});

it("recovers when online arrives before the initial request reports failure", async () => {
  let rejectInitial: (reason: Error) => void = () => {
    throw new Error("Initial request missing");
  };
  let waiting = true;
  const recovered = {
    id: "thread",
    subject: "Recovered pending request",
    kind: "presales",
    state: "open",
    version: 1,
    sequence: 0,
    unread: 0,
    order_id: "",
    linked_order_id: "",
    submission_id: "",
    booster_shared: false,
    slug: "",
    created_at: "2026-09-10T00:00:00Z",
    updated_at: "2026-09-10T00:00:00Z",
  };
  vi.mocked(get).mockImplementation((path) => {
    if (path === "/conversations")
      return Promise.resolve({ conversations: [], next: "" });
    if (path.includes("/messages"))
      return Promise.resolve({ messages: [], next: 0, latest: 0 });
    if (waiting)
      return new Promise((_resolve, reject) => {
        rejectInitial = reject;
      });
    return Promise.resolve(recovered);
  });
  render(
    <MemoryRouter>
      <Thread />
    </MemoryRouter>,
  );
  await screen.findByText("Loading conversation…");
  waiting = false;
  await act(async () => {
    window.dispatchEvent(new Event("online"));
    await Promise.resolve();
  });
  expect(
    await screen.findByRole("heading", { name: "Recovered pending request" }),
  ).toBeVisible();
  await act(async () => {
    rejectInitial(new Error("Late offline failure"));
    await Promise.resolve();
  });
  expect(
    screen.getByRole("heading", { name: "Recovered pending request" }),
  ).toBeVisible();
});
