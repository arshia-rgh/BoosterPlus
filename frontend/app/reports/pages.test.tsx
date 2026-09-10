import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { post, APIError } from "../identity/api";
import Reports from "./pages";
import { downloadReport, type Report } from "./model";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("./model", async (original) => ({
  ...(await original<typeof import("./model")>()),
  downloadReport: vi.fn(),
}));
afterEach(() => {
  vi.clearAllMocks();
});
const report: Report = {
  kind: "orders",
  basis: "Current operational metadata",
  observed_at: "2026-09-10T00:00:00Z",
  query: {
    kind: "orders",
    from: "2026-09-01T00:00:00Z",
    to: "2026-10-01T00:00:00Z",
    state: "",
    search: "",
    after: "",
  },
  columns: [{ key: "id", label: "Order ID" }],
  rows: [["order-id"]],
  next: "next-page",
  count: 1,
  digest: "a".repeat(64),
};
async function preview() {
  vi.mocked(post).mockResolvedValueOnce(report);
  render(<Reports />);
  fireEvent.change(screen.getByLabelText("From date (UTC, inclusive)"), {
    target: { value: "2026-09-01" },
  });
  fireEvent.change(screen.getByLabelText("Until date (UTC, exclusive)"), {
    target: { value: "2026-10-01" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Preview report" }));
  await screen.findByText("order-id");
}
it("downloads the exact reviewed page only after an explicit audit reason", async () => {
  await preview();
  const button = screen.getByRole("button", {
    name: "Download this page (.json)",
  });
  expect(button).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Reason for export"), {
    target: { value: "Review operations" },
  });
  vi.mocked(post).mockResolvedValueOnce({ report, audit_id: "audit" });
  fireEvent.click(button);
  await waitFor(() => {
    expect(downloadReport).toHaveBeenCalledWith({ report, audit_id: "audit" });
  });
  expect(post).toHaveBeenLastCalledWith(
    "/admin/reports/export",
    { query: report.query, digest: report.digest, reason: "Review operations" },
    expect.anything(),
  );
});
it("invalidates a preview when filters change", async () => {
  await preview();
  fireEvent.change(screen.getByLabelText("Report"), {
    target: { value: "staff" },
  });
  expect(
    screen.queryByRole("button", { name: "Download this page (.json)" }),
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText("Current status")).toHaveValue("");
});
it("rejects stale previews visibly and never downloads a guessed replacement", async () => {
  await preview();
  fireEvent.change(screen.getByLabelText("Reason for export"), {
    target: { value: "Review" },
  });
  vi.mocked(post).mockRejectedValueOnce(
    new APIError("Records changed. Refresh preview."),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Download this page (.json)" }),
  );
  await screen.findByRole("alert");
  expect(downloadReport).not.toHaveBeenCalled();
  expect(screen.queryByText("order-id")).not.toBeInTheDocument();
});
it("preserves the exact filters in the bounded next-page request", async () => {
  await preview();
  vi.mocked(post).mockResolvedValueOnce({
    ...report,
    next: "",
    query: { ...report.query, after: report.next },
  });
  fireEvent.click(screen.getByRole("button", { name: "Next report page" }));
  await screen.findByRole("button", { name: "First report page" });
  expect(post).toHaveBeenLastCalledWith(
    "/admin/reports/preview",
    { ...report.query, after: report.next },
    expect.anything(),
  );
});
