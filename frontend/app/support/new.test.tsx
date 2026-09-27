import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { post, APIError } from "../identity/api";
import NewSupport from "./new";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
afterEach(() => {
  vi.resetAllMocks();
});
it("locks an uncertain creation and retries the exact request without editing or double submit", async () => {
  vi.mocked(post)
    .mockRejectedValueOnce(new Error("Connection interrupted"))
    .mockResolvedValue({ id: "same-thread" });
  render(
    <MemoryRouter>
      <NewSupport />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Conversation subject"), {
    target: { value: "A private question" },
  });
  const button = screen.getByRole("button", { name: "Start conversation" });
  fireEvent.click(button);
  fireEvent.click(button);
  await screen.findByRole("button", { name: "Retry same conversation" });
  expect(post).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Conversation subject")).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Retry same conversation" }),
  );
  await screen.findByRole("button", { name: "Retry same conversation" });
  expect(post).toHaveBeenCalledTimes(2);
  expect(vi.mocked(post).mock.calls[0]).toEqual(vi.mocked(post).mock.calls[1]);
});
it("keeps invalid subjects from submitting and permits correction after a definite rejection", async () => {
  const error = new APIError("Check your subject");
  error.status = 422;
  vi.mocked(post).mockRejectedValue(error);
  render(
    <MemoryRouter>
      <NewSupport />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("button", { name: "Start conversation" }),
  ).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Conversation subject"), {
    target: { value: "x".repeat(161) },
  });
  expect(
    screen.getByRole("button", { name: "Start conversation" }),
  ).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Conversation subject"), {
    target: { value: "Valid subject" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Start conversation" }));
  await screen.findByText("Check your subject");
  expect(screen.getByLabelText("Conversation subject")).toBeEnabled();
});
