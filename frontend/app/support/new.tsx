import {
  FieldValidation,
  useFormValidation,
  type FieldIssue,
} from "../ui/form-validation";
import { uncertain } from "./chat-state";
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "../portal-router";
import { z } from "../validation";
import { APIError, post } from "../identity/api";
import { Action, ErrorNotice, Issues, Text } from "../catalog/controls";
import { conversationSchema } from "./model";
import { releaseSchema } from "../catalog/model";
import { useResource } from "../orders/resource";
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
export const accountRequestSlug = /^[a-z][a-z0-9-]{0,79}$/;
export function accountRequestSubject(game: string) {
  return "Account request — " + game;
}
export default function NewSupport() {
  const [params] = useSearchParams();
  const listing = params.get("listing") ?? "";
  const request = params.get("account_request") ?? "";
  if (accountRequestSlug.test(request))
    return <AccountRequestStart key={request} slug={request} />;
  return (
    <StartConversation
      initial={
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          listing,
        )
          ? "Question about account " + listing
          : ""
      }
      slug=""
    />
  );
}
// The subject names the published game from its public release, never raw URL text.
function AccountRequestStart({ slug }: { slug: string }) {
  const resource = useResource(
    `/catalog/games/${encodeURIComponent(slug)}`,
    releaseSchema,
  );
  if (resource.loading) return <p role="status">Loading…</p>;
  if (resource.error || !resource.data)
    return <StartConversation initial="" slug="" />;
  return (
    <StartConversation
      initial={accountRequestSubject(resource.data.configuration.name)}
      slug={slug}
      request
    />
  );
}
function StartConversation({
  initial,
  slug,
  request = false,
}: {
  initial: string;
  slug: string;
  request?: boolean;
}) {
  const navigate = useNavigate(),
    [subject, setSubject] = useState(initial),
    [key, setKey] = useState(() => crypto.randomUUID()),
    [busy, setBusy] = useState(false),
    [unknown, setUnknown] = useState(false),
    [error, setError] = useState<unknown>(null),
    lock = useRef(false),
    form = useRef<HTMLFormElement>(null);
  // A request link lands directly on its prefilled subject, ready to edit.
  useEffect(() => {
    if (!request) return;
    const input = form.current?.querySelector<HTMLInputElement>(
      "input[name=subject]",
    );
    if (!input) return;
    input.scrollIntoView({ block: "center" });
    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
  }, [request]);
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const validation = useFormValidation(
    issues,
    (name) => {
      setIssues((old) => old.filter((issue) => issue.path !== name));
    },
    undefined,
    !busy,
  );
  const valid =
    subject.trim().length > 0 &&
    Array.from(subject).length <= 160 &&
    !subject.includes("\0");
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    setIssues(
      valid
        ? []
        : [
            {
              path: "subject",
              message: "Enter a conversation subject of 1–160 characters.",
            },
          ],
    );
    if (!valid) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await post(
        "/conversations",
        { request_key: key, kind: "presales", order_id: "", subject, slug },
        conversationSchema,
      );
      await navigate("/support/" + result.id);
    } catch (cause) {
      setError(cause);
      if (cause instanceof APIError) setIssues(cause.issues);
      setUnknown(uncertain(cause));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <FieldValidation value={validation}>
      <form
        ref={form}
        className="catalog-section"
        onSubmit={(event) => void submit(event)}
      >
        <fieldset disabled={busy || unknown}>
          <legend>
            {request ? "Request an account" : "Start a conversation"}
          </legend>
          <p>
            {request
              ? "Next, describe the account you want in the chat. Don’t share passwords or codes."
              : "Questions before you order. Don’t share passwords or codes."}
          </p>
          <Text
            name="subject"
            label="Conversation subject"
            value={subject}
            change={(value) => {
              setSubject(value);
              setKey(crypto.randomUUID());
              setError(null);
            }}
            help={request ? "" : "For an existing order, use its Messages tab."}
          />
        </fieldset>
        {unknown && (
          <p role="status">
            Creation was not confirmed. Keep this request unchanged and retry to
            open the same conversation.
          </p>
        )}
        <div className="form-actions">
          <button className="button" type="submit" disabled={busy}>
            {busy
              ? "Opening…"
              : unknown
                ? "Retry same conversation"
                : "Start conversation"}
          </button>
        </div>
        <ErrorNotice error={error} hideIssues />
        <Issues issues={issues} />
      </form>
    </FieldValidation>
  );
}
