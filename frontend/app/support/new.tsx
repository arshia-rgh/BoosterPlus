import { useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router";
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
      await navigate((admin ? "/admin" : "") + "/support/" + thread.id);
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
    [error, setError] = useState<unknown>(null);
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
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
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="catalog-section" onSubmit={(event) => void submit(event)}>
      <fieldset disabled={busy}>
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
          }}
        />
        <button className="button" type="submit">
          {busy ? "Opening…" : "Start conversation"}
        </button>
      </fieldset>
      <ErrorNotice error={error} />
    </form>
  );
}
