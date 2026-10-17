import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { APIError, get } from "../identity/api";
import { useChat } from "./use-chat";
import { mergeMessages, readingPosition, type Message } from "./chat-state";

vi.mock("../identity/api", async (original) => ({
  ...(await original<typeof import("../identity/api")>()),
  get: vi.fn(),
}));
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
function message(sequence: number): Message {
  return {
    id: "message-" + String(sequence),
    sequence,
    purpose: "message",
    body: "Message " + String(sequence),
    sender_role: "customer",
    sender_label: "Customer",
    visibility: "public",
    created_at: "2026-09-13T10:00:00Z",
  };
}
it("merges duplicate hints by stable ID and preserves chronological order", () => {
  const rows = mergeMessages(
    [message(3), message(2)],
    [message(1), message(3)],
  );
  expect(rows.map((row) => row.sequence)).toEqual([1, 2, 3]);
});
it("keeps reading anchors separate by account and clears them at a session boundary", () => {
  readingPosition("alice", "thread", { sequence: 25, offset: 4 });
  expect(readingPosition("alice", "thread")).toEqual({
    sequence: 25,
    offset: 4,
  });
  expect(readingPosition("bob", "thread")).toBeUndefined();
  readingPosition("bob", "thread", { sequence: 10, offset: 1 });
  window.dispatchEvent(
    new CustomEvent("boosterplus:session-changed", {
      detail: { portal: "customer" },
    }),
  );
  expect(readingPosition("bob", "thread")).toBeUndefined();
});
it("appends earlier history, reconciles multi-page gaps and closes one stable event stream", async () => {
  let latest = 100,
    revoked = false;
  const close = vi.fn();
  class Stream extends EventTarget {
    onopen: (() => void) | null = null;
    onerror: (() => void) | null = null;
    close = close;
  }
  const streams: Stream[] = [];
  vi.stubGlobal(
    "EventSource",
    class extends Stream {
      constructor() {
        super();
        streams.push(this);
      }
    },
  );
  vi.mocked(get).mockImplementation((path) => {
    if (revoked) {
      const error = new APIError("Unavailable");
      error.status = 404;
      return Promise.reject(error);
    }
    if (!path.includes("/messages"))
      return Promise.resolve({
        id: "thread",
        kind: "presales",
        state: "open",
        subject: "Private support",
        sequence: latest,
        version: latest,
        unread: 0,
        booster_shared: false,
        order_id: "",
        linked_order_id: "",
        slug: "",
        created_at: "2026-09-13T10:00:00Z",
        updated_at: "2026-09-13T10:00:00Z",
      });
    const params = new URL(path, "https://playora.invalid").searchParams;
    const before = params.has("before") ? Number(params.get("before")) : null;
    const after = Number(params.get("after") ?? 0);
    const from =
      before !== null ? Math.max(1, (before || latest + 1) - 50) : after + 1;
    const to =
      before !== null
        ? (before || latest + 1) - 1
        : Math.min(latest, after + 50);
    return Promise.resolve({
      messages: Array.from({ length: Math.max(0, to - from + 1) }, (_, index) =>
        message(from + index),
      ),
      latest,
      next: before !== null ? (from > 1 ? from : 0) : to < latest ? to : 0,
    });
  });
  const view = renderHook(() => useChat("/conversations/thread"));
  await waitFor(() => {
    expect(view.result.current.messages).toHaveLength(50);
  });
  expect(view.result.current.messages[0]?.sequence).toBe(51);
  await act(async () => {
    await view.result.current.loadEarlier();
  });
  expect(view.result.current.messages).toHaveLength(100);
  expect(view.result.current.messages[0]?.sequence).toBe(1);
  expect(view.result.current.earlier).toBe(0);
  latest = 650;
  await act(async () => {
    await view.result.current.refresh();
  });
  expect(view.result.current.messages).toHaveLength(600);
  expect(view.result.current.catchingUp).toBe(true);
  await act(async () => {
    await view.result.current.refresh();
  });
  expect(view.result.current.messages).toHaveLength(650);
  expect(view.result.current.catchingUp).toBe(false);
  await act(async () => {
    streams[0]?.dispatchEvent(new Event("change"));
    await Promise.resolve();
  });
  await waitFor(() => {
    expect(view.result.current.messages).toHaveLength(650);
  });
  expect(streams).toHaveLength(1);
  revoked = true;
  await act(async () => {
    await view.result.current.refresh(true);
  });
  expect(view.result.current.messages).toHaveLength(0);
  expect(view.result.current.thread).toBeNull();
  view.unmount();
  expect(close).toHaveBeenCalledTimes(1);
});

it("suspends a hidden record conversation and recovers after an interrupted fetch without a stuck lock", async () => {
  const close = vi.fn();
  vi.stubGlobal(
    "EventSource",
    class extends EventTarget {
      onopen = null;
      onerror = null;
      close = close;
    },
  );
  let finish: ((value: unknown) => void) | undefined;
  vi.mocked(get).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = renderHook(
    ({ enabled }) =>
      useChat("/conversations/thread", undefined, undefined, enabled),
    { initialProps: { enabled: true } },
  );
  await waitFor(() => {
    expect(get).toHaveBeenCalledTimes(1);
  });
  view.rerender({ enabled: false });
  expect(close).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish?.({ id: "stale", sequence: 0, unread: 0, version: 1 });
    await Promise.resolve();
  });
  expect(view.result.current.thread).toBeNull();
  vi.mocked(get).mockImplementation((path) =>
    Promise.resolve(
      path.includes("/messages")
        ? { messages: [], next: 0, latest: 0 }
        : { id: "thread", sequence: 0, unread: 0, version: 1 },
    ),
  );
  view.rerender({ enabled: true });
  await waitFor(() => {
    expect(view.result.current.thread?.id).toBe("thread");
  });
  expect(view.result.current.loading).toBe(false);
});

it("can load older messages after an older request settles while its record section is hidden", async () => {
  let finish: ((value: unknown) => void) | undefined;
  vi.mocked(get).mockImplementation((path) =>
    path.includes("before=51")
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : Promise.resolve(
          path.includes("/messages")
            ? { messages: [message(51)], next: 0, latest: 51 }
            : { id: "thread", sequence: 51, unread: 0, version: 1 },
        ),
  );
  const view = renderHook(
    ({ enabled }) =>
      useChat("/conversations/thread", undefined, undefined, enabled),
    { initialProps: { enabled: true } },
  );
  await waitFor(() => {
    expect(view.result.current.earlier).toBe(51);
  });
  let request: Promise<boolean> | undefined;
  act(() => {
    request = view.result.current.loadEarlier();
  });
  await waitFor(() => {
    expect(view.result.current.olderBusy).toBe(true);
  });
  view.rerender({ enabled: false });
  await act(async () => {
    finish?.({ messages: [message(1)], next: 0, latest: 51 });
    await request;
  });
  view.rerender({ enabled: true });
  await waitFor(() => {
    expect(view.result.current.olderBusy).toBe(false);
  });
  expect(view.result.current.messages.map((item) => item.sequence)).toEqual([
    51,
  ]);
  vi.mocked(get).mockImplementation((path) =>
    Promise.resolve(
      path.includes("before=51")
        ? { messages: [message(1)], next: 0, latest: 51 }
        : path.includes("/messages")
          ? { messages: [], next: 0, latest: 51 }
          : { id: "thread", sequence: 51, unread: 0, version: 1 },
    ),
  );
  await act(async () => {
    await view.result.current.loadEarlier();
  });
  expect(view.result.current.messages.map((item) => item.sequence)).toEqual([
    1, 51,
  ]);
});

it("starts at the server's first incoming unread message despite later outgoing messages", async () => {
  vi.mocked(get).mockImplementation((path) =>
    Promise.resolve(
      path.includes("/messages")
        ? {
            messages: [message(2), message(3), message(4), message(5)],
            latest: 5,
            next: 0,
          }
        : {
            id: "thread",
            sequence: 5,
            unread: 2,
            first_unread_sequence: 2,
            version: 5,
          },
    ),
  );
  const view = renderHook(() => useChat("/conversations/thread"));
  await waitFor(() => {
    expect(view.result.current.loading).toBe(false);
  });
  expect(get).toHaveBeenCalledWith(
    "/conversations/thread/messages?after=1",
    expect.anything(),
    "customer",
  );
  expect(view.result.current.firstUnread).toBe(2);
  expect(view.result.current.messages[0]?.sequence).toBe(2);
  expect(get).not.toHaveBeenCalledWith(
    "/conversations/thread/messages?after=3",
    expect.anything(),
    "customer",
  );
});

it("shows latest history without an unread divider when only outgoing messages remain", async () => {
  vi.mocked(get).mockImplementation((path) =>
    Promise.resolve(
      path.includes("/messages")
        ? { messages: [message(1), message(2)], latest: 2, next: 0 }
        : {
            id: "thread",
            sequence: 2,
            unread: 0,
            first_unread_sequence: 0,
            version: 2,
          },
    ),
  );
  const view = renderHook(() => useChat("/conversations/thread"));
  await waitFor(() => {
    expect(view.result.current.loading).toBe(false);
  });
  expect(get).toHaveBeenCalledWith(
    "/conversations/thread/messages?before=0",
    expect.anything(),
    "customer",
  );
  expect(view.result.current.firstUnread).toBe(0);
  expect(view.result.current.messages).toHaveLength(2);
});
