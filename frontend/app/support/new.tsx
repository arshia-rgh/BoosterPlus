import { uncertain } from "./chat-state";
import { useRef, useState, type SubmitEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { z } from "../validation";
import { post } from "../identity/api";
import { Action, ErrorNotice, Text } from "../catalog/controls";
import { conversationSchema } from "./model";
export function OrderSupport({
  id,
  name,
  admin = false,
}: {
  id: string;
  name: string;
  admin?: boolean;
}) {
  const location = useLocation();
  const source = z
    .object({ orderListSearch: z.string().max(2048) })
    .safeParse(location.state);
  const navigate = useNavigate(),
    [key] = useState(() => crypto.randomUUID()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function open() {
    setBusy(true);
    setError(null);
    try {
      const thread = await post(
        (admin ? "/admin" : "") + "/conversations",
        {
          request_key: key,
          kind: "order",
          order_id: id,
          subject: name + " order support",
          slug: "",
        },
        conversationSchema,
      );
      await navigate((admin ? "/admin" : "") + "/support/" + thread.id, {
        state: source.success ? source.data : null,
      });
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <Action disabled={busy} onClick={() => void open()}>
        {busy ? "Opening…" : "Open order conversation"}
      </Action>
      <ErrorNotice error={error} />
    </div>
  );
}
export default function NewSupport() {
  const navigate = useNavigate(),
    [subject, setSubject] = useState(""),
    [key, setKey] = useState(() => crypto.randomUUID()),
    [busy, setBusy] = useState(false),
    [unknown, setUnknown] = useState(false),
    [error, setError] = useState<unknown>(null),
    lock = useRef(false);
  const valid = subject.trim().length > 0 && subject.length <= 160;
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || !valid) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await post(
        "/conversations",
        { request_key: key, kind: "presales", order_id: "", subject, slug: "" },
        conversationSchema,
      );
      await navigate("/support/" + result.id);
    } catch (cause) {
      setError(cause);
      setUnknown(uncertain(cause));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <form className="catalog-section" onSubmit={(event) => void submit(event)}>
      <fieldset disabled={busy || unknown}>
        <legend>Start a private pre-sales conversation</legend>
        <p>
          Ask about services before placing an order. Keep passwords and
          recovery codes out of support messages.
        </p>
        <Text
          label="Conversation subject"
          value={subject}
          change={(value) => {
            setSubject(value);
            setKey(crypto.randomUUID());
            setError(null);
          }}
          help="Use a clear subject of 1–160 characters. For an existing order, open its Messages section instead."
        />
      </fieldset>
      {unknown && (
        <p role="status">
          Creation was not confirmed. Keep this request unchanged and retry to
          open the same conversation.
        </p>
      )}
      <button className="button" type="submit" disabled={busy || !valid}>
        {busy
          ? "Opening…"
          : unknown
            ? "Retry same conversation"
            : "Start conversation"}
      </button>
      <ErrorNotice error={error} />
    </form>
  );
}
