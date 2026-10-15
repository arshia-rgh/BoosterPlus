import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import { useResource } from "../orders/resource";
import BackgroundJobs from "./jobs";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
afterEach(() => {
  vi.clearAllMocks();
});
function setup(retryable = true) {
  const reload = vi.fn();
  vi.mocked(useResource).mockReturnValue({
    data: {
      items: [
        {
          id: "task",
          kind: "activity.email",
          state: retryable ? "failed" : "running",
          attempts: 5,
          max_attempts: 5,
          retry_generation: 3,
          error_code: "handler_failed",
          created_at: "2026-09-10T00:00:00Z",
          available_at: "2026-09-10T01:00:00Z",
          lease_until: null,
          retryable,
        },
      ],
      next: "",
    },
    loading: false,
    error: null,
    reload,
  });
  render(
    <MemoryRouter>
      <BackgroundJobs />
    </MemoryRouter>,
  );
  return reload;
}
it("submits only the observed generation and an explicit audit reason", async () => {
  const reload = setup();
  vi.mocked(post).mockResolvedValue({});
  fireEvent.click(screen.getByText("Review and retry this task"));
  const submit = screen.getByRole("button", { name: "Queue another attempt" });
  expect(submit).toBeEnabled();
  fireEvent.click(submit);
  expect(screen.getByText("Use 1–2,000 characters.")).toBeVisible();
  fireEvent.change(screen.getByLabelText("Reason for retry"), {
    target: { value: "SMTP connectivity restored; retry reviewed." },
  });
  fireEvent.click(submit);
  await waitFor(() => {
    expect(reload).toHaveBeenCalledOnce();
  });
  expect(post).toHaveBeenCalledWith(
    "/admin/jobs/task/retry",
    { generation: 3, reason: "SMTP connectivity restored; retry reviewed." },
    expect.anything(),
  );
});
it("retains the audit explanation on a stale generation and never guesses a new one", async () => {
  const reload = setup();
  vi.mocked(post).mockRejectedValue(
    new APIError("This task changed. Refresh it."),
  );
  fireEvent.click(screen.getByText("Review and retry this task"));
  fireEvent.change(screen.getByLabelText("Reason for retry"), {
    target: { value: "Investigated outage" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Queue another attempt" }),
  );
  await waitFor(() => {
    expect(screen.getByRole("alert")).toHaveTextContent("This task changed.");
  });
  expect(screen.getByLabelText("Reason for retry")).toHaveValue(
    "Investigated outage",
  );
  expect(reload).not.toHaveBeenCalled();
  expect(post).toHaveBeenCalledOnce();
});
it("does not offer manual retry for a running task", () => {
  setup(false);
  expect(
    screen.queryByText("Review and retry this task"),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Queue another attempt" }),
  ).not.toBeInTheDocument();
});
