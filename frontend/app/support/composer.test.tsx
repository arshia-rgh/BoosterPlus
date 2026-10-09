import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { APIError, post } from "../identity/api";
import Composer from "./composer";

vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  post: vi.fn(),
}));
vi.mock("../media/attachment", () => ({ UploadImage: () => null }));
const done = vi.fn(),
  fail = vi.fn();
beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.mocked(post).mockResolvedValue({ id: "accepted" });
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});
function view(admin = true) {
  return render(
    <Composer
      base="/admin/conversations/thread"
      admin={admin}
      proofAllowed={false}
      unavailable={false}
      done={done}
      fail={fail}
    />,
  );
}
it("keeps reply and internal-note drafts separate and sends only the selected audience", async () => {
  view();
  fireEvent.change(screen.getByLabelText("Message", { exact: true }), {
    target: { value: "Customer reply draft" },
  });
  fireEvent.change(screen.getByLabelText("Message audience"), {
    target: { value: "internal" },
  });
  expect(screen.getByLabelText("Internal note", { exact: true })).toHaveValue(
    "",
  );
  fireEvent.change(screen.getByLabelText("Internal note", { exact: true }), {
    target: { value: "Private staff draft" },
  });
  fireEvent.change(screen.getByLabelText("Message audience"), {
    target: { value: "public" },
  });
  expect(screen.getByLabelText("Message", { exact: true })).toHaveValue(
    "Customer reply draft",
  );
  expect(
    screen.queryByDisplayValue("Private staff draft"),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await screen.findByText("Message sent.");
  expect(post).toHaveBeenCalledWith(
    "/admin/conversations/thread/messages",
    expect.objectContaining({
      body: "Customer reply draft",
      visibility: "public",
    }),
    expect.anything(),
  );
  fireEvent.change(screen.getByLabelText("Message audience"), {
    target: { value: "internal" },
  });
  expect(screen.getByLabelText("Internal note", { exact: true })).toHaveValue(
    "Private staff draft",
  );
});
it("locks an ambiguous send and retries exactly the same payload without duplicate submission", async () => {
  vi.mocked(post).mockRejectedValueOnce(new TypeError("transport lost"));
  view();
  fireEvent.change(screen.getByLabelText("Message", { exact: true }), {
    target: { value: "One message only" },
  });
  const form = screen.getByRole("form", { name: "Compose reply" });
  fireEvent.submit(form);
  fireEvent.submit(form);
  await screen.findByRole("button", { name: "Retry same message" });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Retry same message" }),
    ).toHaveFocus(),
  );
  expect(
    screen.getByRole("button", { name: "Retry same message" }),
  ).toHaveAccessibleDescription(
    /Send not confirmed.*Retry checks the same send/,
  );
  expect(post).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Message", { exact: true })).toHaveValue(
    "One message only",
  );
  expect(screen.getByLabelText("Message", { exact: true })).toBeDisabled();
  expect(screen.getByLabelText("Message audience")).toBeDisabled();
  expect(done).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Retry same message" }));
  await screen.findByText("Message sent.");
  expect(post).toHaveBeenCalledTimes(2);
  expect(vi.mocked(post).mock.calls[1]).toEqual(vi.mocked(post).mock.calls[0]);
  expect(done).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Message", { exact: true })).toHaveValue("");
});
it("lets a definite validation rejection be corrected but reports access revocation to the boundary", async () => {
  const invalid = new APIError("Review your message");
  invalid.status = 422;
  vi.mocked(post).mockRejectedValueOnce(invalid);
  view(false);
  const input = screen.getByLabelText("Message", { exact: true });
  fireEvent.change(input, { target: { value: "Rejected draft" } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await screen.findByText("Review your message");
  expect(input).toBeEnabled();
  fireEvent.change(input, { target: { value: "Corrected draft" } });
  const refusal = new APIError("Access ended");
  refusal.status = 403;
  vi.mocked(post).mockRejectedValueOnce(refusal);
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await waitFor(() => {
    expect(fail).toHaveBeenCalledWith(refusal);
  });
  expect(done).not.toHaveBeenCalled();
});
it("requires an explicit Enter preference and respects IME confirmation and Shift+Enter", async () => {
  view(false);
  const input = screen.getByLabelText("Message", { exact: true });
  fireEvent.change(input, { target: { value: "日本語 draft" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(post).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Press Enter to send" }),
  );
  fireEvent.compositionStart(input);
  fireEvent.keyDown(input, { key: "Enter" });
  fireEvent.compositionEnd(input);
  fireEvent.keyDown(input, { key: "Enter", isComposing: true });
  fireEvent.keyDown(input, { key: "Enter", keyCode: 229 });
  fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
  expect(post).not.toHaveBeenCalled();
  fireEvent.keyDown(input, { key: "Enter" });
  await screen.findByText("Message sent.");
  expect(post).toHaveBeenCalledTimes(1);
});
it("uses explicit Send on touch keyboards and clears drafts on thread unmount", async () => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  const first = view(false);
  fireEvent.change(screen.getByLabelText("Message", { exact: true }), {
    target: { value: "Touch draft" },
  });
  fireEvent.keyDown(screen.getByLabelText("Message", { exact: true }), {
    key: "Enter",
  });
  expect(post).not.toHaveBeenCalled();
  first.unmount();
  view(false);
  expect(screen.getByLabelText("Message", { exact: true })).toHaveValue("");
  fireEvent.change(screen.getByLabelText("Message", { exact: true }), {
    target: { value: "New recipient" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await screen.findByText("Message sent.");
});

it("names the shared recipients separately from private staff notes", () => {
  render(
    <Composer
      base="/admin/conversations/shared"
      admin
      audience="Customer, assigned booster and PLAYORA staff"
      proofAllowed
      unavailable={false}
      done={done}
      fail={fail}
    />,
  );
  expect(
    screen.getByText("To: Customer, assigned booster and PLAYORA staff"),
  ).toBeVisible();
  fireEvent.change(screen.getByLabelText("Message audience"), {
    target: { value: "internal" },
  });
  expect(
    screen.getByText("Private note · visible to administrators only."),
  ).toBeVisible();
});
it("shows message and proof errors beside their controls and never sends an incomplete proof", async () => {
  render(
    <Composer
      base="/admin/conversations/thread"
      admin
      proofAllowed
      unavailable={false}
      done={done}
      fail={fail}
    />,
  );
  const input = screen.getByLabelText("Message", { exact: true });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await waitFor(() => expect(input).toHaveFocus());
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAccessibleDescription(
    expect.stringContaining("Write a message of 1–4,000 characters."),
  );
  fireEvent.change(input, { target: { value: "Proof description retained" } });
  fireEvent.change(screen.getByLabelText("Message type"), {
    target: { value: "proof" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Publish proof" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Attach image" })).toHaveFocus(),
  );
  expect(
    screen.getByRole("button", { name: "Attach image" }),
  ).toHaveAccessibleDescription(
    "Attach an approved image before publishing proof.",
  );
  expect(input).toHaveValue("Proof description retained");
  expect(post).not.toHaveBeenCalled();
});
