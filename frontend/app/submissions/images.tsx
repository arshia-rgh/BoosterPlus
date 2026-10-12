import { useCallback, useRef, useState, useEffect } from "react";
import { Action, ErrorNotice } from "../catalog/controls";
import { UploadImage } from "../media/attachment";
import { post } from "../identity/api";
import { messageSchema } from "../support/model";
import { uncertain } from "../support/chat-state";
import { useRecordDraft } from "../ui/record-drafts";
type ImageSlot = {
  key: string;
  id: string;
  pending: boolean;
  working: boolean;
};
const emptySlot = (): ImageSlot => ({
  key: crypto.randomUUID(),
  id: "",
  pending: false,
  working: false,
});
export default function SellerImages({
  conversation,
}: {
  conversation: string;
}) {
  const [slots, setSlots] = useState<ImageSlot[]>(() => [emptySlot()]),
    [busy, setBusy] = useState(false),
    [unknown, setUnknown] = useState(false),
    [error, setError] = useState<unknown>(null),
    [notice, setNotice] = useState("");
  const request = useRef(crypto.randomUUID()),
    lock = useRef(false),
    outcome = useRef<HTMLDivElement>(null),
    focusOutcome = useRef(false);
  useEffect(() => {
    if (busy || !focusOutcome.current || (!error && !notice && !unknown))
      return;
    focusOutcome.current = false;
    if (
      document.activeElement === document.body ||
      outcome.current?.contains(document.activeElement)
    ) {
      outcome.current?.focus({ preventScroll: true });
      if (typeof outcome.current?.scrollIntoView === "function")
        outcome.current.scrollIntoView({ block: "center" });
    }
  }, [busy, error, notice, unknown]);
  const pending = slots.some((slot) => slot.pending),
    ids = slots.map((slot) => slot.id).filter(Boolean);
  const working = slots.some((slot) => slot.working);
  useRecordDraft(
    pending || ids.length > 0 || unknown,
    busy || working || unknown,
  );
  const operationPending = useCallback((key: string, working: boolean) => {
    setSlots((old) =>
      old.map((slot) => (slot.key === key ? { ...slot, working } : slot)),
    );
  }, []);
  const changed = useCallback((key: string, id: string, pending: boolean) => {
    setSlots((old) =>
      old.map((slot) => (slot.key === key ? { ...slot, id, pending } : slot)),
    );
    setNotice("");
  }, []);
  async function send() {
    if (lock.current || pending || !ids.length) return;
    lock.current = true;
    focusOutcome.current = true;
    setBusy(true);
    setError(null);
    try {
      await post(
        `/conversations/${conversation}/messages`,
        {
          request_key: request.current,
          purpose: "message",
          body: "Account screenshots submitted for private staff review.",
          visibility: "public",
          attachments: ids,
        },
        messageSchema,
      );
      request.current = crypto.randomUUID();
      setUnknown(false);
      setSlots([emptySlot()]);
      setNotice(
        "Screenshots sent privately to the review team. You can see them in Messages & evidence. They are not public account-listing images.",
      );
    } catch (cause) {
      setError(cause);
      setUnknown(uncertain(cause));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="seller-image-step">
      <h4>Account screenshots</h4>
      <p>
        Add up to four screenshots at a time, 4 MB each. Remove email addresses,
        player identifiers and private information. Uploading prepares them;
        Send screenshots attaches them to this account’s private review. Staff
        separately chooses any public listing images.
      </p>
      <fieldset disabled={busy || unknown}>
        <legend>Images for this submission</legend>
        {slots.map((slot, i) => (
          <Slot
            key={slot.key}
            slot={slot}
            index={i}
            conversation={conversation}
            changed={changed}
            operationPending={operationPending}
          />
        ))}
        <Action
          disabled={slots.length >= 4}
          onClick={() => {
            setSlots((old) => [...old, emptySlot()]);
          }}
        >
          Add another screenshot
        </Action>
      </fieldset>
      <div ref={outcome} tabIndex={-1}>
        <ErrorNotice error={error} />
        {notice && <p role="status">{notice}</p>}
        {unknown && (
          <p role="alert">
            Delivery is uncertain. Retry the same screenshots below; the request
            reference prevents duplicates. Do not re-upload them as a new
            message.
          </p>
        )}
        <Action
          disabled={busy || pending || !ids.length}
          onClick={() => void send()}
        >
          {busy
            ? "Sending screenshots…"
            : unknown
              ? "Retry sending these screenshots"
              : "Send screenshots for review"}
        </Action>
      </div>
    </section>
  );
}
function Slot({
  slot,
  index,
  conversation,
  changed,
  operationPending,
}: {
  slot: ImageSlot;
  index: number;
  conversation: string;
  changed: (key: string, id: string, pending: boolean) => void;
  operationPending: (key: string, working: boolean) => void;
}) {
  const change = useCallback(
    (id: string, pending: boolean) => {
      changed(slot.key, id, pending);
    },
    [changed, slot.key],
  );
  const working = useCallback(
    (pending: boolean) => {
      operationPending(slot.key, pending);
    },
    [operationPending, slot.key],
  );
  return (
    <UploadImage
      conversation={conversation}
      admin={false}
      visibility="public"
      label={`Account screenshot ${String(index + 1)}`}
      change={change}
      operationPending={working}
    />
  );
}
