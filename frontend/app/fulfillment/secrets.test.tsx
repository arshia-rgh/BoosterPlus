import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { post } from "../identity/api";
import { StaffSecret } from "./secrets";
import type { Work } from "./model";

vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});
const work: Work = {
  coordination_id: "",
  coordination_shared: false,
  order_id: "synthetic-order",
  order_version: 1,
  access_version: 1,
  version: 1,
  game: "Synthetic game",
  service: "Rank boost",
  state: "in_progress",
  mode: "account",
  secret_hours: 1,
  alias: "Staff",
  progress: 20,
  completion_pending: false,
  note: "",
  estimated_start: null,
  estimated_finish: null,
  forecast_review: false,
  shared: [],
  updated_at: "2026-10-09T00:00:00Z",
};
it.each([true, false])(
  "preserves keyboard context for staff reveal, hide and rejection (admin=%s)",
  async (admin) => {
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
    vi.mocked(post)
      .mockResolvedValueOnce({ value: btoa("synthetic protected access") })
      .mockRejectedValueOnce(new Error("Unavailable"));
    render(<StaffSecret work={work} admin={admin} />);
    fireEvent.click(screen.getByRole("button", { name: "Reveal game access" }));
    const ready = await screen.findByRole("heading", {
      name: "Game access ready",
    });
    await waitFor(() => expect(ready).toHaveFocus());
    expect(ready).not.toHaveTextContent("synthetic protected access");
    fireEvent.click(screen.getByRole("button", { name: "Hide game access" }));
    const reveal = screen.getByRole("button", { name: "Reveal game access" });
    expect(reveal).toHaveFocus();
    expect(
      screen.queryByText("synthetic protected access"),
    ).not.toBeInTheDocument();
    fireEvent.click(reveal);
    await screen.findByRole("alert");
    await waitFor(() =>
      expect(
        screen.getByRole("group", { name: "Game access notice" }),
      ).toHaveFocus(),
    );
  },
);
