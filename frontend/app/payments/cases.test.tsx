import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import type { Detail } from "../orders/model";
import Cases from "./cases";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../orders/resource", () => ({ useResource: vi.fn() }));
vi.mock("./refunds", () => ({ default: () => null }));
afterEach(() => vi.clearAllMocks());
// These are the only fields consumed by an empty customer case list.
const detail = {
  order: { id: "order", version: 1 },
  contract: { id: "contract" },
} as Detail;
it("reveals the invalid case field, retains the draft and does not open a case", async () => {
  vi.mocked(useResource).mockReturnValue({
    data: { cases: [] },
    loading: false,
    error: null,
    reload: vi.fn(),
  });
  render(
    <Cases detail={detail} admin={false} owner={false} changed={vi.fn()} />,
  );
  fireEvent.click(screen.getByText("Request a service review"));
  const field = screen.getByLabelText("Describe your case");
  fireEvent.change(field, { target: { value: "short" } });
  fireEvent.click(screen.getByRole("button", { name: "Open service case" }));
  await waitFor(() => expect(field).toHaveFocus());
  expect(field).toHaveValue("short");
  expect(field).toHaveAttribute("aria-invalid", "true");
  expect(field).toHaveAccessibleDescription(/10–2,000 characters/);
  expect(post).not.toHaveBeenCalled();
});
