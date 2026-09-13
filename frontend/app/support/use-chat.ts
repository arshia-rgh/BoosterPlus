import { useCallback, useEffect, useRef, useState } from "react";
import { get } from "../identity/api";
import { conversationSchema, messagesSchema, type Conversation } from "./model";
import { denied, mergeMessages, type Message } from "./chat-state";

export function useChat(base: string, start?: number) {
  const [thread, setThread] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [earlier, setEarlier] = useState(0);
  const [olderBusy, setOlderBusy] = useState(false);
  const [catchingUp, setCatchingUp] = useState(false);
  const [firstUnread, setFirstUnread] = useState(0);
  const alive = useRef(false),
    generation = useRef(0),
    cursor = useRef<number | null>(null);
  const work = useRef(false),
    again = useRef(false);
  const revision = useRef(0),
    requests = useRef(0);
  const invalidate = useCallback(() => {
    generation.current++;
  }, []);
  const fail = useCallback((cause: unknown) => {
    setError(cause);
    setLive(false);
    if (denied(cause)) {
      generation.current++;
      cursor.current = null;
      setThread(null);
      setMessages([]);
      setEarlier(0);
    }
  }, []);
  const refresh = useCallback(
    async (force = false) => {
      if (!alive.current) return;
      if (work.current && !force) {
        again.current = true;
        return;
      }
      if (force) generation.current++;
      work.current = true;
      const token = generation.current,
        request = ++requests.current;
      const latestRequest = () => alive.current && request === requests.current;
      const current = () => alive.current && token === generation.current;
      try {
        const detail = await get(base, conversationSchema);
        if (!current()) return;
        const initial = cursor.current === null;
        const marker = Math.max(
          0,
          (start ?? detail.sequence - detail.unread + 1) - 1,
        );
        let after = cursor.current ?? marker;
        let page = await get(
          base +
            (initial && !detail.unread && start === undefined
              ? "/messages?before=0"
              : `/messages?after=${String(after)}`),
          messagesSchema,
        );
        if (!current()) return;
        if (initial) {
          setFirstUnread(
            detail.unread ? detail.sequence - detail.unread + 1 : 0,
          );
          setEarlier(
            page.messages[0]?.sequence && page.messages[0].sequence > 1
              ? page.messages[0].sequence
              : 0,
          );
        }
        let batch = page.messages;
        // The endpoint bounds each page. Limit one refresh, then continue on the next hint/poll.
        for (
          let count = 0;
          count < 9 &&
          page.next &&
          !(initial && !detail.unread && start === undefined);
          count++
        ) {
          after = page.messages.at(-1)?.sequence ?? after;
          page = await get(
            base + `/messages?after=${String(after)}`,
            messagesSchema,
          );
          if (!current()) return;
          batch = mergeMessages(batch, page.messages);
        }
        cursor.current =
          batch.at(-1)?.sequence ?? cursor.current ?? detail.sequence;
        revision.current = detail.version;
        setMessages((current) =>
          initial ? batch : mergeMessages(current, batch),
        );
        setCatchingUp(cursor.current < page.latest);
        setThread(detail);
        setError(null);
      } catch (cause) {
        if (current()) fail(cause);
      } finally {
        if (latestRequest()) {
          work.current = false;
          setLoading(false);
        }
      }
    },
    [base, fail, start],
  );
  useEffect(() => {
    alive.current = true;
    // Attach recovery listeners before the cancellable initial refresh.
    const initial = setTimeout(() => {
      void refresh();
    }, 0);
    let source: EventSource | null = null;
    let disconnect: ReturnType<typeof setTimeout> | undefined;
    if (typeof EventSource !== "undefined") {
      source = new EventSource(
        "/api/v1" + base + "/stream?after=" + String(revision.current),
      );
      source.onopen = () => {
        clearTimeout(disconnect);
        setLive(true);
        void refresh();
      };
      source.onerror = () => {
        // Short server stream renewals should not repeatedly announce an outage.
        clearTimeout(disconnect);
        disconnect = setTimeout(() => {
          setLive(false);
        }, 5000);
        void refresh();
      };
      source.addEventListener("change", () => {
        void refresh();
      });
    }
    const retry = () => {
      void refresh(true);
    };
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("online", retry);
    document.addEventListener("visibilitychange", visible);
    const poll = setInterval(visible, 10000);
    // A hint received during an in-flight request must not be lost.
    const pending = setInterval(() => {
      if (again.current && !work.current) {
        again.current = false;
        void refresh();
      }
    }, 250);
    return () => {
      alive.current = false;
      invalidate();
      clearTimeout(initial);
      source?.close();
      clearTimeout(disconnect);
      clearInterval(poll);
      clearInterval(pending);
      window.removeEventListener("online", retry);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [base, refresh, invalidate]);
  async function loadEarlier() {
    if (!earlier || olderBusy) return false;
    const token = generation.current;
    setOlderBusy(true);
    try {
      const page = await get(
        base + `/messages?before=${String(earlier)}`,
        messagesSchema,
      );
      if (!alive.current || token !== generation.current) return false;
      setMessages((current) => mergeMessages(page.messages, current));
      setEarlier(page.next);
      return true;
    } catch (cause) {
      if (alive.current && token === generation.current) fail(cause);
      return false;
    } finally {
      if (alive.current) setOlderBusy(false);
    }
  }
  return {
    thread,
    messages,
    error,
    live,
    loading,
    earlier,
    olderBusy,
    catchingUp,
    firstUnread,
    refresh,
    loadEarlier,
    fail,
  };
}
