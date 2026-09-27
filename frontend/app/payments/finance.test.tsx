import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { post } from "../identity/api";
import Finance from "./finance";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({
  useResource: (path: string) => ({
    data: path.includes("/finance/reconciliation?")
      ? {
          direction: "incoming",
          payment_id: "123",
          found: false,
          state: "",
          issue: "",
          order_id: "",
          case_id: "",
          transfer_id: "",
          submission_id: "",
          checked_at: null,
          observed_at: null,
          reading: false,
          job: null,
        }
      : null,
    error: null,
    loading: false,
    reload: vi.fn(),
  }),
}));
vi.mock("./case-queue", () => ({ default: () => null }));
vi.mock("../resale/payout-queue", () => ({ default: () => null }));
vi.mock("./policy-editor", () => ({ default: () => null }));
afterEach(() => vi.clearAllMocks());
it("keeps reconciliation failures visible in the active view and locks repeated requests", async () => {
  let reject: (error: Error) => void = () => {};
  vi.mocked(post).mockImplementation(
    () =>
      new Promise((_resolve, failure) => {
        reject = failure;
      }),
  );
  render(
    <MemoryRouter initialEntries={["/admin/finance?view=reconcile"]}>
      <Finance />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Provider payment ID"), {
    target: { value: "123" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Inspect provider reference" }),
  );
  fireEvent.change(screen.getByLabelText("Reason for reconciliation"), {
    target: { value: "Reviewed the provider exception." },
  });
  const submit = screen.getByRole("button", { name: "Reconcile payment" });
  fireEvent.click(submit);
  fireEvent.click(submit);
  expect(post).toHaveBeenCalledOnce();
  reject(new Error("Unavailable"));
  await waitFor(() => {
    expect(screen.getByRole("alert")).toBeVisible();
  });
  expect(submit).toBeEnabled();
  expect(
    screen.queryByRole("heading", { name: "Payment queue" }),
  ).not.toBeInTheDocument();
});
