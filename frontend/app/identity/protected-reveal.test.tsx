import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { post } from "./api";
import { notifySession } from "./portal";
import { useProtectedReveal } from "./protected-reveal";

vi.mock("./api", () => ({ post: vi.fn() }));
afterEach(() => {
  vi.resetAllMocks();
  vi.useRealTimers();
});
function Fixture({ path = "/first" }: { path?: string }) {
  const { value, busy, error, reveal, hide } = useProtectedReveal(path, 30000);
  return (
    <div>
      <button disabled={busy} onClick={() => void reveal()}>
        Reveal
      </button>
      <button onClick={hide}>Hide</button>
      {value && <pre>{value}</pre>}
      {error instanceof Error && <p role="alert">{error.message}</p>}
    </div>
  );
}
const plaintext = "isolated test access";
const response = { value: btoa(plaintext) };

it.each(["blur", "visibility", "session", "record", "unmount"])(
  "discards an in-flight reveal after %s invalidation",
  async (kind) => {
    let resolve!: (value: unknown) => void;
    vi.mocked(post).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const view = render(<Fixture />);
    fireEvent.click(screen.getByRole("button", { name: "Reveal" }));
    if (kind === "blur") fireEvent(window, new Event("blur"));
    if (kind === "visibility")
      fireEvent(document, new Event("visibilitychange"));
    if (kind === "session")
      act(() => {
        notifySession("customer");
      });
    if (kind === "record") view.rerender(<Fixture path="/second" />);
    if (kind === "unmount") view.unmount();
    await act(async () => {
      resolve(response);
      await Promise.resolve();
    });
    expect(screen.queryByText(plaintext)).not.toBeInTheDocument();
  },
);

it("hides on blur immediately after response, and does not clear another portal's session", async () => {
  vi.mocked(post).mockResolvedValue(response);
  render(<Fixture />);
  fireEvent.click(screen.getByRole("button", { name: "Reveal" }));
  await screen.findByText(plaintext);
  act(() => {
    notifySession("admin");
  });
  expect(screen.getByText(plaintext)).toBeInTheDocument();
  fireEvent(window, new Event("blur"));
  expect(screen.queryByText(plaintext)).not.toBeInTheDocument();
});

it("expires the visible value and permits a fresh intentional reveal", async () => {
  vi.useFakeTimers();
  vi.mocked(post).mockResolvedValue(response);
  render(<Fixture />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Reveal" }));
    await Promise.resolve();
  });
  expect(screen.getByText(plaintext)).toBeInTheDocument();
  act(() => {
    vi.advanceTimersByTime(30000);
  });
  expect(screen.queryByText(plaintext)).not.toBeInTheDocument();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Reveal" }));
    await Promise.resolve();
  });
  expect(screen.getByText(plaintext)).toBeInTheDocument();
  expect(post).toHaveBeenCalledTimes(2);
});

it("preserves safe re-verification guidance when a rejected request emits a session refresh", async () => {
  vi.mocked(post).mockImplementation(() => {
    notifySession("customer");
    return Promise.reject(
      new Error("Verify your email and authenticator again."),
    );
  });
  render(<Fixture />);
  fireEvent.click(screen.getByRole("button", { name: "Reveal" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Verify your email and authenticator again.",
  );
  expect(screen.queryByText(plaintext)).not.toBeInTheDocument();
});

it("discards errors from an older reveal after record navigation", async () => {
  let reject!: (error: Error) => void;
  vi.mocked(post).mockReturnValue(
    new Promise((_resolve, fail) => {
      reject = fail;
    }),
  );
  const view = render(<Fixture />);
  fireEvent.click(screen.getByRole("button", { name: "Reveal" }));
  view.rerender(<Fixture path="/second" />);
  await act(async () => {
    reject(new Error("Old record error"));
    await Promise.resolve();
  });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("keeps safe post-verification guidance after blur while refusing to reveal", async () => {
  let reject!: (cause: Error) => void;
  vi.mocked(post).mockReturnValue(
    new Promise((_done, fail) => {
      reject = fail;
    }),
  );
  render(<Fixture />);
  fireEvent.click(screen.getByRole("button", { name: "Reveal" }));
  fireEvent(window, new Event("blur"));
  const resume = vi.mocked(post).mock.calls[0]?.[4];
  expect(resume?.()).toBe(false);
  await act(async () => {
    reject(
      new Error(
        "Identity confirmed. Select Reveal again to view this information safely.",
      ),
    );
    await Promise.resolve();
  });
  expect(screen.getByRole("alert")).toHaveTextContent("Select Reveal again");
  expect(screen.queryByText(plaintext)).not.toBeInTheDocument();
});
