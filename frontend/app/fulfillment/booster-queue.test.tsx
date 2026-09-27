import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router";
import { expect, it, vi } from "vitest";
import { get } from "../identity/api";
import { BoosterQueue } from "./booster-workspace";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
}));
function History() {
  const navigate = useNavigate();
  return <button onClick={() => void navigate(-1)}>Previous filters</button>;
}
it("restores visible filters along with applied results through browser history", async () => {
  vi.mocked(get).mockResolvedValue({ items: [], next: "" });
  render(
    <MemoryRouter
      initialEntries={["/booster/orders?search=Mobile&state=in_progress"]}
    >
      <History />
      <BoosterQueue />
    </MemoryRouter>,
  );
  expect(screen.getByLabelText("Search game or full order ID")).toHaveValue(
    "Mobile",
  );
  fireEvent.change(screen.getByLabelText("Search game or full order ID"), {
    target: { value: "World" },
  });
  fireEvent.change(screen.getByLabelText("Assignment status"), {
    target: { value: "queued" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Filter assignments" }));
  await waitFor(() => {
    expect(vi.mocked(get).mock.lastCall?.[0]).toContain(
      "search=World&state=queued",
    );
  });
  fireEvent.click(screen.getByRole("button", { name: "Previous filters" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Search game or full order ID")).toHaveValue(
      "Mobile",
    );
  });
  expect(screen.getByLabelText("Assignment status")).toHaveValue("in_progress");
  expect(vi.mocked(get).mock.lastCall?.[0]).toContain(
    "search=Mobile&state=in_progress",
  );
});
