import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import DynamicForm from "../catalog/dynamic-form";
import { emptyConfiguration, emptyField, type Service } from "../catalog/model";
import { APIError, command, get, post } from "../identity/api";
import IntakeImage from "./intake-image";
vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
  post: vi.fn(),
  command: vi.fn(),
}));
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});
const scope = "7244c7b1-9e72-49bb-9af4-e2a5f9f36449",
  id = "cc22e77e-3985-465c-9424-3202268acb00";
const session = {
  user: { id: "buyer" },
  portal: "customer",
  mfa_required: false,
  csrf_token: "synthetic-csrf",
  terms_version: "test",
  terms_url: "/terms",
};
const fileRecord = {
  id,
  state: "queued",
  content_type: "image/png",
  size: 3,
  expires_at: "2099-01-01T00:00:00Z",
};
function image() {
  const file = new File(["png"], "rank.png", { type: "image/png" });
  Object.defineProperty(file, "arrayBuffer", {
    value: () => Promise.resolve(new TextEncoder().encode("png").buffer),
  });
  return file;
}
it("requires sign-in without collecting a file and keeps the exact return intent", async () => {
  vi.mocked(get).mockResolvedValue({ ...session, user: null });
  render(
    <MemoryRouter initialEntries={["/games/game/services/boost?step=review"]}>
      <IntakeImage
        scope={scope}
        label="Rank screenshot"
        value={undefined}
        change={vi.fn()}
        pending={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole("link", { name: "Sign in to attach a screenshot" }),
  ).toHaveAttribute(
    "href",
    "/login?returnTo=%2Fgames%2Fgame%2Fservices%2Fboost%3Fstep%3Dreview",
  );
  expect(
    screen.queryByLabelText("Choose rank screenshot"),
  ).not.toBeInTheDocument();
  expect(post).not.toHaveBeenCalled();
});
it("blocks validation until scanning completes, submits only the reference, and clears private choices on account change", async () => {
  vi.mocked(get).mockImplementation((path) =>
    Promise.resolve(
      path.startsWith("/media/") ? { ...fileRecord, state: "ready" } : session,
    ),
  );
  vi.mocked(post).mockImplementation((path) =>
    Promise.resolve(
      path === "/media"
        ? { ...fileRecord, state: "pending" }
        : path.endsWith("/finalize")
          ? fileRecord
          : { answers: { screenshot: [id] }, issues: [] },
    ),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
  );
  const service: Service = {
    key: "boost",
    name: "Boost",
    description: "",
    evaluator: "manual-review-v1",
    rules: [],
    fields: [
      {
        ...emptyField("screenshot"),
        type: "attachment",
        stage: "order",
        label: "Rank screenshot",
      },
    ],
  };
  const commit = vi.fn().mockResolvedValue(undefined);
  render(
    <MemoryRouter>
      <DynamicForm
        config={{ ...emptyConfiguration("Game"), services: [service] }}
        service={service}
        slug="game"
        releaseID="release"
        stage="order"
        intakeScope={scope}
        onCommit={commit}
      />
    </MemoryRouter>,
  );
  fireEvent.change(await screen.findByLabelText("Choose rank screenshot"), {
    target: { files: [image()] },
  });
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Upload image" })).toHaveFocus();
  });
  expect(
    screen.getByRole("button", { name: "Check selections" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Upload image" }));
  await screen.findByText("Checking image safety…");
  await waitFor(() => {
    expect(document.activeElement).toHaveTextContent("Checking image safety…");
  });
  expect(
    screen.queryByRole("button", { name: "Save revised request" }),
  ).not.toBeInTheDocument();
  await screen.findByText(
    "Image checked and ready to send.",
    {},
    { timeout: 3000 },
  );
  expect(post).toHaveBeenCalledWith(
    "/media",
    expect.objectContaining({ intake_key: scope, conversation_id: "" }),
    expect.anything(),
    "customer",
  );
  fireEvent.click(screen.getByRole("button", { name: "Check selections" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Save revised request" }),
  );
  await waitFor(() => {
    expect(commit).toHaveBeenCalledWith({ screenshot: [id] }, "");
  });
  fireEvent(
    window,
    new CustomEvent("boosterplus:session-changed", {
      detail: { portal: "customer" },
    }),
  );
  expect(
    screen.queryByText("Image checked and ready to send."),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Save revised request" }),
  ).not.toBeInTheDocument();
});
it("removes rejected drafts without making them ready or submitting their reference", async () => {
  vi.mocked(get).mockResolvedValue(session);
  vi.mocked(post).mockImplementation((path) =>
    Promise.resolve({
      ...fileRecord,
      state: path.endsWith("/finalize") ? "rejected" : "pending",
    }),
  );
  vi.mocked(command).mockResolvedValue(undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
  );
  const change = vi.fn(),
    pending = vi.fn();
  render(
    <MemoryRouter>
      <IntakeImage
        scope={scope}
        label="Rank screenshot"
        value={undefined}
        change={change}
        pending={pending}
      />
    </MemoryRouter>,
  );
  fireEvent.change(await screen.findByLabelText("Choose rank screenshot"), {
    target: { files: [image()] },
  });
  fireEvent.click(screen.getByRole("button", { name: "Upload image" }));
  await screen.findByText(/This image could not be accepted/);
  expect(change).not.toHaveBeenCalledWith(id);
  expect(pending).toHaveBeenLastCalledWith(true);
  fireEvent.click(screen.getByRole("button", { name: "Remove attachment" }));
  await waitFor(() => {
    expect(command).toHaveBeenCalledWith(`/media/${id}/remove`);
    expect(pending).toHaveBeenLastCalledWith(false);
    expect(screen.getByLabelText("Choose rank screenshot")).toHaveFocus();
  });
});
it("retries access failures without posting private data", async () => {
  vi.mocked(get)
    .mockRejectedValueOnce(new APIError("Upload access unavailable"))
    .mockResolvedValue({ ...session, user: null });
  render(
    <MemoryRouter>
      <IntakeImage
        scope={scope}
        label="Rank screenshot"
        value={undefined}
        change={vi.fn()}
        pending={vi.fn()}
      />
    </MemoryRouter>,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Retry upload access" }),
  );
  await screen.findByRole("link", { name: "Sign in to attach a screenshot" });
  expect(post).not.toHaveBeenCalled();
});
it("does not claim bytes were uploaded after only reserving a file intent", async () => {
  vi.mocked(get).mockResolvedValue(session);
  vi.mocked(post).mockResolvedValue({ ...fileRecord, state: "pending" });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
  render(
    <MemoryRouter>
      <IntakeImage
        scope={scope}
        label="Rank screenshot"
        value={undefined}
        change={vi.fn()}
        pending={vi.fn()}
      />
    </MemoryRouter>,
  );
  fireEvent.change(await screen.findByLabelText("Choose rank screenshot"), {
    target: { files: [image()] },
  });
  fireEvent.click(screen.getByRole("button", { name: "Upload image" }));
  await screen.findByText(/Image upload failed/);
  expect(
    await screen.findByText("Local preview · upload not yet confirmed"),
  ).toBeVisible();
  expect(
    screen.queryByText("Local preview · uploaded privately"),
  ).not.toBeInTheDocument();
  expect(post).not.toHaveBeenCalledWith(
    expect.stringContaining("/finalize"),
    expect.anything(),
    expect.anything(),
    expect.anything(),
  );
});

it("keeps a reserved image after storage failure and retries without creating another intent", async () => {
  vi.mocked(get).mockResolvedValue(session);
  vi.mocked(post).mockImplementation((path) =>
    Promise.resolve({
      ...fileRecord,
      state: path.endsWith("/finalize") ? "ready" : "pending",
    }),
  );
  const upload = vi
    .fn()
    .mockResolvedValueOnce(
      new Response("private provider detail", { status: 500 }),
    )
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", upload);
  const change = vi.fn();
  render(
    <MemoryRouter>
      <IntakeImage
        scope={scope}
        label="Rank screenshot"
        value={undefined}
        change={change}
        pending={vi.fn()}
      />
    </MemoryRouter>,
  );
  fireEvent.change(await screen.findByLabelText("Choose rank screenshot"), {
    target: { files: [image()] },
  });
  fireEvent.click(screen.getByRole("button", { name: "Upload image" }));
  await screen.findByText(/Image storage is temporarily unavailable/);
  expect(
    screen.queryByText(/private provider detail|session ended/),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText("Local preview · upload not yet confirmed"),
  ).toBeVisible();
  expect(post).toHaveBeenCalledTimes(1);
  fireEvent.click(
    screen.getByRole("button", { name: /Upload image|Retry upload/i }),
  );
  await screen.findByText("Image checked and ready to send.");
  expect(post).toHaveBeenCalledTimes(2);
  expect(post).toHaveBeenLastCalledWith(
    `/media/${id}/finalize`,
    {},
    expect.anything(),
    "customer",
  );
  expect(upload).toHaveBeenCalledTimes(2);
  expect(change).toHaveBeenLastCalledWith(id);
});
