import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import SellerImages from "./images";
import { post, APIError } from "../identity/api";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../media/attachment", () => ({
  UploadImage: ({
    label,
    change,
  }: {
    label: string;
    change: (id: string, pending: boolean) => void;
  }) => (
    <div>
      <button
        onClick={() => {
          change("", true);
        }}
      >
        Prepare {label}
      </button>
      <button
        onClick={() => {
          change(label, false);
        }}
      >
        Ready {label}
      </button>
      <button
        onClick={() => {
          change("", false);
        }}
      >
        Remove {label}
      </button>
    </div>
  ),
}));
afterEach(() => vi.clearAllMocks());
it("sends a checked private screenshot batch once with safe uncertain retry", async () => {
  vi.mocked(post)
    .mockRejectedValueOnce(new APIError("Connection lost"))
    .mockResolvedValueOnce({ id: "saved" });
  render(<SellerImages conversation="submission-thread" />);
  const send = screen.getByRole("button", {
    name: "Send screenshots for review",
  });
  expect(send).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Prepare Account screenshot 1" }),
  );
  expect(send).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Ready Account screenshot 1" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Add another screenshot" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Ready Account screenshot 2" }),
  );
  fireEvent.click(send);
  const retry = await screen.findByRole("button", {
    name: "Retry sending these screenshots",
  });
  await waitFor(() => {
    expect(document.activeElement).toContainElement(retry);
  });
  expect(
    screen.getByRole("button", { name: "Remove Account screenshot 1" }),
  ).toBeDisabled();
  fireEvent.click(retry);
  await waitFor(() => {
    expect(post).toHaveBeenCalledTimes(2);
  });
  expect(vi.mocked(post).mock.calls[0]?.[1]).toEqual(
    vi.mocked(post).mock.calls[1]?.[1],
  );
  expect(post).toHaveBeenCalledWith(
    "/conversations/submission-thread/messages",
    expect.objectContaining({
      purpose: "message",
      visibility: "public",
      attachments: ["Account screenshot 1", "Account screenshot 2"],
    }),
    expect.anything(),
  );
  expect(await screen.findByRole("status")).toHaveTextContent(
    "They are not public account-listing images",
  );
  await waitFor(() => {
    expect(document.activeElement).toContainElement(screen.getByRole("status"));
  });
  expect(
    screen.getByRole("button", { name: "Send screenshots for review" }),
  ).toBeDisabled();
});
