import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { get } from "../identity/api";
import Inbox from "./inbox";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
}));
vi.mock("./deliveries", () => ({ default: () => null }));
afterEach(() => {
  vi.resetAllMocks();
});
const thread = {
  id: "thread",
  subject: "Owned conversation",
  kind: "order",
  order_id: "order-reference",
  linked_order_id: "",
  slug: "mlbb",
  state: "open",
  version: 1,
  sequence: 2,
  unread: 1,
  booster_shared: false,
  created_at: "2026-09-27T00:00:00Z",
  updated_at: "2026-09-27T00:00:00Z",
};
function Location() {
  const value = useLocation();
  return <output aria-label="Current query">{value.search}</output>;
}
it("searches on submit before pagination and preserves filters on next/first", async () => {
  vi.mocked(get).mockResolvedValue({
    conversations: [thread],
    next: "next-page",
  });
  render(
    <MemoryRouter initialEntries={["/support?state=open&after=old-page"]}>
      <Inbox />
      <Location />
    </MemoryRouter>,
  );
  await screen.findByText("Owned conversation");
  fireEvent.change(screen.getByLabelText("Search conversations"), {
    target: { value: "Needle" },
  });
  expect(get).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText("Conversation type"), {
    target: { value: "order" },
  });
  fireEvent.change(screen.getByLabelText("Read status"), {
    target: { value: "true" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Search conversations" }));
  await waitFor(() => {
    expect(get).toHaveBeenCalledWith(
      expect.stringContaining("search=Needle"),
      expect.anything(),
      "customer",
    );
  });
  expect(screen.getByLabelText("Current query")).not.toHaveTextContent(
    "after=",
  );
  expect(
    screen.getByRole("link", { name: "Next conversations" }),
  ).toHaveAttribute(
    "href",
    expect.stringContaining("kind=order&unread=true&after=next-page"),
  );
  fireEvent.click(screen.getByRole("link", { name: "Next conversations" }));
  await waitFor(() => {
    expect(
      screen.getByRole("heading", { name: "Conversation results" }),
    ).toHaveFocus();
  });
  expect(
    screen.getByRole("link", { name: "First conversations" }),
  ).toHaveAttribute("href", expect.stringContaining("search=Needle"));
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(screen.getByLabelText("Search conversations")).toHaveValue("");
});
it("distinguishes failure from a filtered empty page and retries current criteria", async () => {
  vi.mocked(get)
    .mockRejectedValueOnce(new Error("Network unavailable"))
    .mockResolvedValue({ conversations: [], next: "" });
  render(
    <MemoryRouter initialEntries={["/support?search=Missing&kind=submission"]}>
      <Inbox />
    </MemoryRouter>,
  );
  await screen.findByText(/Conversations could not be loaded/);
  expect(screen.queryByText(/No conversations match/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Refresh inbox" }));
  await screen.findByText(/No conversations match these filters/);
  expect(get).toHaveBeenCalledTimes(2);
  expect(vi.mocked(get).mock.calls[1]?.[0]).toContain("search=Missing");
});
