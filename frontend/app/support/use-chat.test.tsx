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
  window.dispatchEvent(new Event("boosterplus:session-changed"));
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
