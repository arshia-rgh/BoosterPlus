import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { APIError, get, post } from "../../identity/api";
import { ChatFormCard } from "./card";
import { CreateChatForm } from "./create";
import type { ChatForm } from "./model";

vi.mock("../../identity/api", async (original) => ({
  ...(await original<typeof import("../../identity/api")>()),
  get: vi.fn(),
  post: vi.fn(),
}));
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const row: ChatForm = {
  id: "form",
  version: 1,
  title: "Access request",
  description: "",
  mode: "request",
  purpose: "information",
  recipient: "Customer",
  audience: "Customer and staff",
  state: "open",
  fields: [
    {
      key: "notes",
      label: "Access notes",
      kind: "multiline",
      secure: true,
      required: true,
    },
  ],
  answers: {},
  has_secure: true,
  can_respond: true,
  can_reveal: false,
  can_cancel: false,
  expires_at: "2099-01-01T00:00:00Z",
  answered_at: null,
};
function card(value = row) {
  vi.mocked(get).mockResolvedValue(value);
  return render(
    <MemoryRouter>
      <ChatFormCard
        base="/conversations/chat"
        id="form"
        revision={1}
        changed={vi.fn()}
      />
    </MemoryRouter>,
  );
}
it("keeps multiline protected answers intact and focuses a missing required field", async () => {
  card();
  fireEvent.click(await screen.findByRole("button", { name: "Complete form" }));
  fireEvent.click(screen.getByRole("button", { name: "Send response" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Edit Access notes" }),
    ).toHaveFocus(),
  );
  expect(post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Edit Access notes" }));
  fireEvent.change(screen.getByRole("textbox", { name: /Access notes/ }), {
    target: { value: "line-one\nline-two" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Hide Access notes" }));
  vi.mocked(post).mockResolvedValue({
    ...row,
    state: "answered",
    can_respond: false,
  });
  fireEvent.click(screen.getByRole("button", { name: "Send response" }));
  await waitFor(() => {
    expect(post).toHaveBeenCalledWith(
      "/conversations/chat/forms/form/reply",
      expect.objectContaining({ answers: { notes: "line-one\nline-two" } }),
      expect.anything(),
    );
  });
  await waitFor(() =>
    expect(
      screen.getByText("Response sent. Continue the conversation below."),
    ).toHaveFocus(),
  );
});
it("retains the same reply after uncertain delivery and preserves its draft when returning from close", async () => {
  card();
  fireEvent.click(await screen.findByRole("button", { name: "Complete form" }));
  fireEvent.click(screen.getByRole("button", { name: "Edit Access notes" }));
  fireEvent.change(screen.getByRole("textbox", { name: /Access notes/ }), {
    target: { value: "private fixture" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Close form" }));
  expect(screen.getByText("Discard this draft?")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Return to form" }));
  expect(screen.getByRole("textbox", { name: /Access notes/ })).toHaveValue(
    "private fixture",
  );
  vi.mocked(post).mockRejectedValueOnce(new Error("Connection lost"));
  fireEvent.click(screen.getByRole("button", { name: "Send response" }));
  await screen.findByText(/Delivery is uncertain/);
  const first = vi.mocked(post).mock.calls[0]?.[1];
  expect(screen.getByRole("textbox", { name: /Access notes/ })).toBeDisabled();
  vi.mocked(post).mockResolvedValue({
    ...row,
    state: "answered",
    can_respond: false,
  });
  fireEvent.click(screen.getByRole("button", { name: "Retry same action" }));
  await waitFor(() => {
    expect(post).toHaveBeenCalledTimes(2);
  });
  expect(vi.mocked(post).mock.calls[1]?.[1]).toEqual(first);
});
it("hides revealed answers on blur and ignores a late reveal response", async () => {
  card({
    ...row,
    version: 2,
    state: "answered",
    can_respond: false,
    can_reveal: true,
  });
  fireEvent.click(await screen.findByRole("button", { name: "View form" }));
  expect(screen.getByText("Hidden")).toBeVisible();
  vi.mocked(post).mockResolvedValue({
    value: btoa(JSON.stringify({ notes: "protected fixture" })),
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Reveal protected details" }),
  );
  await screen.findByText("protected fixture");
  fireEvent(window, new Event("blur"));
  expect(screen.queryByText("protected fixture")).not.toBeInTheDocument();
  let finish: ((value: unknown) => void) | undefined;
  vi.mocked(post).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Reveal protected details" }),
  );
  fireEvent(window, new Event("blur"));
  await act(async () => {
    finish?.({ value: btoa(JSON.stringify({ notes: "late fixture" })) });
    await Promise.resolve();
  });
  expect(screen.queryByText("late fixture")).not.toBeInTheDocument();
});
it("distinguishes a temporary read failure from removed permission", async () => {
  const error = Object.assign(new APIError("Temporary failure"), {
    status: 503,
  });
  vi.mocked(get).mockRejectedValue(error);
  render(
    <MemoryRouter>
      <ChatFormCard
        base="/conversations/chat"
        id="form"
        revision={1}
        changed={vi.fn()}
      />
    </MemoryRouter>,
  );
  await screen.findByText("Unable to load this form. Please retry.");
  vi.mocked(get).mockRejectedValue(
    Object.assign(new APIError("Forbidden"), { status: 403 }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Check access again" }));
  await screen.findByText("This form is not available to your account.");
});
it("freezes an uncertain new form and blocks closing while it is sending", async () => {
  vi.mocked(get).mockResolvedValue({
    open: true,
    booster: false,
    purposes: [
      {
        key: "information",
        label: "Information",
        modes: ["request", "share"],
        max_hours: 720,
      },
    ],
  });
  render(
    <MemoryRouter>
      <CreateChatForm base="/admin/conversations/chat" changed={vi.fn()} />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Send a form/ }));
  fireEvent.change(await screen.findByLabelText("Title"), {
    target: { value: "Schedule" },
  });
  fireEvent.change(screen.getByLabelText("Field label"), {
    target: { value: "Available time" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Preview form" }));
  expect(
    screen.getByRole("heading", { name: "Recipient preview" }),
  ).toHaveFocus();
  let reject: ((error: Error) => void) | undefined;
  vi.mocked(post).mockImplementation(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Send form" }));
  expect(screen.getByRole("button", { name: "Close form" })).toBeDisabled();
  const first = vi.mocked(post).mock.calls[0]?.[1];
  await act(async () => {
    reject?.(new Error("Connection lost"));
    await Promise.resolve();
  });
  expect(screen.getByRole("button", { name: "Edit form" })).toBeDisabled();
  vi.mocked(post).mockResolvedValue(row);
  fireEvent.click(screen.getByRole("button", { name: "Retry same form" }));
  await waitFor(() => {
    expect(post).toHaveBeenCalledTimes(2);
  });
  expect(vi.mocked(post).mock.calls[1]?.[1]).toEqual(first);
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
});

it("focuses share-form answer errors and previews only safe values before returning to edit", async () => {
  vi.mocked(get).mockResolvedValue({
    open: true,
    booster: false,
    purposes: [
      {
        key: "information",
        label: "Information",
        modes: ["request", "share"],
        max_hours: 720,
      },
    ],
  });
  render(
    <MemoryRouter>
      <CreateChatForm base="/admin/conversations/chat" changed={vi.fn()} />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Send a form/ }));
  fireEvent.change(await screen.findByLabelText("Title"), {
    target: { value: "Recovery details" },
  });
  fireEvent.change(screen.getByLabelText("Field label"), {
    target: { value: "Recovery notes" },
  });
  fireEvent.change(screen.getByLabelText("Action"), {
    target: { value: "share" },
  });
  fireEvent.change(screen.getByLabelText("Input"), {
    target: { value: "multiline" },
  });
  fireEvent.click(screen.getByLabelText("Protected / sensitive"));
  fireEvent.click(screen.getByRole("button", { name: "Preview form" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Edit Recovery notes" }),
    ).toHaveFocus(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Edit Recovery notes" }));
  fireEvent.change(screen.getByRole("textbox", { name: /Recovery notes/ }), {
    target: { value: "protected-line-one\nprotected-line-two" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Preview form" }));
  expect(screen.getByText("Protected value entered")).toBeVisible();
  expect(screen.queryByText(/protected-line-one/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Edit form" }));
  await waitFor(() => expect(screen.getByLabelText("Title")).toHaveFocus());
  fireEvent.click(screen.getByRole("button", { name: "Close form" }));
  fireEvent.click(screen.getByRole("button", { name: "Return to form" }));
  await waitFor(() => expect(screen.getByLabelText("Title")).toHaveFocus());
  expect(screen.getByLabelText("Title")).toHaveValue("Recovery details");
});

it("keeps focus while correcting one of multiple rejected response fields", async () => {
  card({
    ...row,
    fields: [
      {
        key: "first",
        label: "First detail",
        kind: "text",
        secure: false,
        required: true,
      },
      {
        key: "second",
        label: "Second detail",
        kind: "text",
        secure: false,
        required: true,
      },
    ],
  });
  fireEvent.click(await screen.findByRole("button", { name: "Complete form" }));
  fireEvent.click(screen.getByRole("button", { name: "Send response" }));
  const first = screen.getByRole("textbox", { name: /First detail/ });
  await waitFor(() => expect(first).toHaveFocus());
  fireEvent.change(first, { target: { value: "Keep typing" } });
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(first).toHaveFocus();
  expect(first).not.toHaveAttribute("aria-invalid");
  fireEvent.change(screen.getByRole("textbox", { name: /Second detail/ }), {
    target: { value: "Ready" },
  });
  const error = Object.assign(new APIError("Check your details."), {
    status: 422,
    issues: [{ path: "answers.first", message: "Use the registered value." }],
  });
  vi.mocked(post).mockRejectedValueOnce(error);
  fireEvent.click(screen.getByRole("button", { name: "Send response" }));
  await waitFor(() =>
    expect(first).toHaveAccessibleDescription("Use the registered value."),
  );
  expect(first).toHaveFocus();
  expect(first).toBeEnabled();
  expect(first).toHaveValue("Keep typing");
});

it("reopens authoring and focuses a server-rejected share answer without losing it", async () => {
  vi.mocked(get).mockResolvedValue({
    open: true,
    booster: false,
    purposes: [
      {
        key: "information",
        label: "Information",
        modes: ["request", "share"],
        max_hours: 720,
      },
    ],
  });
  render(
    <MemoryRouter>
      <CreateChatForm base="/admin/conversations/chat" changed={vi.fn()} />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Send a form/ }));
  fireEvent.change(await screen.findByLabelText("Title"), {
    target: { value: "Instructions" },
  });
  fireEvent.change(screen.getByLabelText("Field label"), {
    target: { value: "Note" },
  });
  fireEvent.change(screen.getByLabelText("Action"), {
    target: { value: "share" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: /^Note/ }), {
    target: { value: "Retained note" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Preview form" }));
  vi.mocked(post).mockRejectedValueOnce(
    Object.assign(new APIError("Check the answer."), {
      status: 422,
      issues: [{ path: "answers.field_1", message: "Complete the note." }],
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Send form" }));
  const field = await screen.findByRole("textbox", { name: /^Note/ });
  await waitFor(() => expect(field).toHaveFocus());
  expect(field).toHaveValue("Retained note");
  expect(field).toHaveAccessibleDescription("Complete the note.");
});

it("recalculates corrected expiry after a definitive rejection", async () => {
  vi.mocked(get).mockResolvedValue({
    open: true,
    booster: false,
    purposes: [
      {
        key: "information",
        label: "Information",
        modes: ["request"],
        max_hours: 720,
      },
    ],
  });
  render(
    <MemoryRouter>
      <CreateChatForm base="/admin/conversations/chat" changed={vi.fn()} />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Send a form/ }));
  fireEvent.change(await screen.findByLabelText("Title"), {
    target: { value: "Instructions" },
  });
  fireEvent.change(screen.getByLabelText("Field label"), {
    target: { value: "Note" },
  });
  fireEvent.change(screen.getByLabelText(/Expires after/), {
    target: { value: "48" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Preview form" }));
  vi.mocked(post).mockRejectedValueOnce(
    Object.assign(new APIError("Check expiry."), {
      status: 422,
      issues: [{ path: "expires_at", message: "Choose a later expiry." }],
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Send form" }));
  const hours = await screen.findByLabelText(/Expires after/);
  await waitFor(() => expect(hours).toHaveFocus());
  const first = vi.mocked(post).mock.calls.at(-1)?.[1] as {
    expires_at: string;
    request_key: string;
  };
  fireEvent.change(hours, { target: { value: "72" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview form" }));
  fireEvent.click(screen.getByRole("button", { name: "Send form" }));
  await waitFor(() => {
    expect(post).toHaveBeenCalledTimes(2);
  });
  const second = vi.mocked(post).mock.calls.at(-1)?.[1] as {
    expires_at: string;
    request_key: string;
  };
  expect(
    Date.parse(second.expires_at) - Date.parse(first.expires_at),
  ).toBeGreaterThanOrEqual(24 * 3600000);
  expect(second.request_key).not.toBe(first.request_key);
});

it("focuses an unknown rejection after the authoring registry remounts", async () => {
  vi.mocked(get).mockResolvedValue({
    open: true,
    booster: false,
    purposes: [
      {
        key: "information",
        label: "Information",
        modes: ["request"],
        max_hours: 720,
      },
    ],
  });
  render(
    <MemoryRouter>
      <CreateChatForm base="/admin/conversations/chat" changed={vi.fn()} />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Send a form/ }));
  fireEvent.change(await screen.findByLabelText("Title"), {
    target: { value: "Instructions" },
  });
  fireEvent.change(screen.getByLabelText("Field label"), {
    target: { value: "Note" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Preview form" }));
  vi.mocked(post).mockRejectedValueOnce(
    Object.assign(new APIError("Check request."), {
      status: 422,
      issues: [{ path: "request", message: "Reload the conversation." }],
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Send form" }));
  await waitFor(() =>
    expect(screen.getByRole("list", { name: "Fields to check" })).toHaveFocus(),
  );
  const title = screen.getByLabelText("Title");
  title.focus();
  fireEvent.change(title, { target: { value: "Keep editing" } });
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(title).toHaveFocus();
});
