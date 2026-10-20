import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import { useResource } from "../orders/resource";
import Privacy from "./pages";
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
let state = "reviewed",
  version = 1;
const policy = {
  enabled: true,
  financial_days: 1,
  dispute_days: 1,
  audit_days: 1,
  support_days: 1,
  grace_days: 1,
  policy_text: "Reviewed owner policy",
  backup_policy: "Operator policy",
  preserve_evidence: true,
};
beforeEach(() => {
  state = "reviewed";
  version = 1;
  vi.mocked(useResource).mockImplementation((path) => ({
    data: path.includes("retention")
      ? { release_id: "policy", label: "v1", data: policy }
      : {
          requests: [
            {
              id: "request",
              version,
              state,
              user_id: "customer",
              manual_hold: false,
              hold_reason: "",
              eligible_at: null,
            },
          ],
          next: "",
        },
    loading: false,
    error: null,
    reload: vi.fn(),
  }));
});
it("requires fresh confirmation for each owner action and observed request version", () => {
  const view = render(
    <MemoryRouter>
      <Privacy admin />
    </MemoryRouter>,
  );
  const label = "I reviewed this action, current policy and retained records.";
  fireEvent.click(screen.getByLabelText(label));
  expect(screen.getByLabelText(label)).toBeChecked();
  fireEvent.change(screen.getByLabelText("Action", { exact: true }), {
    target: { value: "erase" },
  });
  expect(screen.getByLabelText(label)).not.toBeChecked();
  expect(screen.getByText(/Erasure revokes sign-in/)).toBeVisible();
  fireEvent.click(screen.getByLabelText(label));
  version = 2;
  view.rerender(
    <MemoryRouter>
      <Privacy admin />
    </MemoryRouter>,
  );
  expect(screen.getByLabelText(label)).not.toBeChecked();
  expect(screen.getByLabelText("Action", { exact: true })).toHaveValue(
    "review",
  );
});
it("does not offer customer cancellation after live erasure starts", () => {
  state = "erased_pending_files";
  render(
    <MemoryRouter>
      <Privacy />
    </MemoryRouter>,
  );
  expect(
    screen.queryByRole("button", { name: "Cancel deletion request" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText(/This request can no longer be cancelled/),
  ).toBeVisible();
  expect(
    screen.getByText(
      /confirm with an email code or your enrolled authenticator/,
    ),
  ).toBeVisible();
});
