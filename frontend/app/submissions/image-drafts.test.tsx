import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createMemoryRouter, Link, RouterProvider } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, command, post } from "../identity/api";
import { RecordDraftBoundary } from "../ui/record-drafts";
import SellerImages from "./images";

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
const media = {
  id: "synthetic-image",
  state: "ready",
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
function mount() {
  const router = createMemoryRouter(
    [
      {
        path: "/sale",
        element: (
          <RecordDraftBoundary record="submission">
            <SellerImages conversation="thread" />
            <Link to="/sales">Your account sales</Link>
          </RecordDraftBoundary>
        ),
      },
      { path: "/sales", element: <h1>Account sales list</h1> },
    ],
    { initialEntries: ["/sale"] },
  );
  render(<RouterProvider router={router} />);
  return router;
}
async function leave() {
  fireEvent.click(screen.getByRole("link", { name: "Your account sales" }));
  return screen.findByRole("button", { name: "Discard drafts and leave" });
}
it("lets a seller explicitly discard an idle local selection without uploading it", async () => {
  mount();
  fireEvent.change(screen.getByLabelText("Choose account screenshot 1"), {
    target: { files: [image()] },
  });
  const discard = await leave();
  expect(discard).toBeEnabled();
  fireEvent.click(discard);
  expect(
    await screen.findByRole("heading", { name: "Account sales list" }),
  ).toBeVisible();
  expect(post).not.toHaveBeenCalled();
});
it("keeps an invalid local file discardable after client validation fails", async () => {
  mount();
  fireEvent.change(screen.getByLabelText("Choose account screenshot 1"), {
    target: {
      files: [new File(["invalid"], "notes.txt", { type: "text/plain" })],
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Upload image" }));
  await screen.findByText(/Choose a JPEG, PNG, or WebP image/);
  expect(await leave()).toBeEnabled();
  expect(post).not.toHaveBeenCalled();
});
it("blocks discard for an unresolved upload but permits it after confirmed removal", async () => {
  let reject: (error: Error) => void = () => {};
  vi.mocked(post).mockReturnValue(
    new Promise((_, fail) => {
      reject = fail;
    }),
  );
  mount();
  fireEvent.change(screen.getByLabelText("Choose account screenshot 1"), {
    target: { files: [image()] },
  });
  fireEvent.click(screen.getByRole("button", { name: "Upload image" }));
  await waitFor(() => {
    expect(post).toHaveBeenCalledOnce();
  });
  expect(await leave()).toBeDisabled();
  expect(screen.getByText(/An action is still pending/)).toBeVisible();
  await act(async () => {
    reject(new APIError("Connection lost"));
    await Promise.resolve();
  });
  expect(
    screen.getByRole("button", { name: "Discard drafts and leave" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Stay on submission" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove attachment" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Choose account screenshot 1")).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("link", { name: "Your account sales" }));
  expect(
    await screen.findByRole("heading", { name: "Account sales list" }),
  ).toBeVisible();
});
it("protects an uncertain batch send and permits explicit discard of a ready unsent image", async () => {
  let sending = false;
  vi.mocked(post).mockImplementation((path) => {
    if (path === "/conversations/thread/messages") {
      if (!sending) {
        sending = true;
        return Promise.reject(new APIError("Connection lost"));
      }
      return Promise.resolve({ id: "message" });
    }
    return Promise.resolve(media);
  });
  mount();
  fireEvent.change(screen.getByLabelText("Choose account screenshot 1"), {
    target: { files: [image()] },
  });
  fireEvent.click(screen.getByRole("button", { name: "Upload image" }));
  await screen.findByText("Image checked and ready to send.");
  expect(await leave()).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Stay on submission" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Send screenshots for review" }),
  );
  await screen.findByRole("button", {
    name: "Retry sending these screenshots",
  });
  expect(await leave()).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Stay on submission" }));
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: "Retry sending these screenshots" }),
    );
    await Promise.resolve();
  });
  await screen.findByText(/Screenshots sent privately to the review team/);
  fireEvent.click(screen.getByRole("link", { name: "Your account sales" }));
  expect(
    await screen.findByRole("heading", { name: "Account sales list" }),
  ).toBeVisible();
  const messages = vi
    .mocked(post)
    .mock.calls.filter(([path]) => path === "/conversations/thread/messages");
  expect(messages).toHaveLength(2);
  expect(messages[0]?.[1]).toEqual(messages[1]?.[1]);
});

it("withholds a ready image while removal is uncertain and retries the same reference", async () => {
  vi.mocked(post).mockResolvedValue(media);
  vi.mocked(command)
    .mockRejectedValueOnce(new APIError("Connection lost"))
    .mockResolvedValueOnce(undefined);
  mount();
  fireEvent.change(screen.getByLabelText("Choose account screenshot 1"), {
    target: { files: [image()] },
  });
  fireEvent.click(screen.getByRole("button", { name: "Upload image" }));
  await screen.findByText("Image checked and ready to send.");
  fireEvent.click(screen.getByRole("button", { name: "Remove attachment" }));
  await screen.findByText(/Removal is not confirmed/);
  expect(
    screen.queryByText("Image checked and ready to send."),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Send screenshots for review" }),
  ).toBeDisabled();
  expect(await leave()).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Stay on submission" }));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Remove attachment" }));
    await Promise.resolve();
  });
  fireEvent.click(screen.getByRole("link", { name: "Your account sales" }));
  expect(
    await screen.findByRole("heading", { name: "Account sales list" }),
  ).toBeVisible();
  expect(command).toHaveBeenCalledTimes(2);
  expect(vi.mocked(command).mock.calls[0]).toEqual(
    vi.mocked(command).mock.calls[1],
  );
  expect(
    vi.mocked(post).mock.calls.some(([path]) => path.includes("/messages")),
  ).toBe(false);
});
