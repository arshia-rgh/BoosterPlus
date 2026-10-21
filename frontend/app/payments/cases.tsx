import { FieldValidation } from "../ui/form-validation";
import { boundedTextIssue, useEditorValidation } from "../ui/editor-validation";
import { useEffect, useRef, useState } from "react";
import { Action, ErrorNotice, Issues, Select, Text } from "../catalog/controls";
import { denied } from "../support/chat-state";
import { APIError, post } from "../identity/api";
import type { Detail } from "../orders/model";
import { useResource } from "../orders/resource";
import { caseDetailSchema, caseListSchema, caseSchema } from "./cases-model";
import { remedyLabels, remedyText } from "./model";
import Refunds from "./refunds";
import { caseNextStep } from "./presentation";
import "./workspace.css";

function CaseConversation({
  id,
  admin,
  changed,
  refreshing,
}: {
  id: string;
  admin: boolean;
  changed: () => void;
  refreshing: boolean;
}) {
  const prefix = admin ? "/admin" : "";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
  const [after, setAfter] = useState(0),
    [note, setNote] = useState(""),
    [rationale, setRationale] = useState(""),
    [outcome, setOutcome] = useState("retain"),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const resource = useResource(
    `${prefix}/cases/${id}?after=${String(after)}`,
    caseDetailSchema,
  );
  const record = resource.data?.case;
  const accessDenied = denied(resource.error) || denied(error);
  if (accessDenied && (note || rationale)) {
    setNote("");
    setRationale("");
  }

  const fields = useEditorValidation();
  const lock = useRef(false);
  async function act(action: string) {
    if (!record || lock.current || refreshing || resource.loading) return;
    if (
      !fields.check([
        ...boundedTextIssue("note", note, 10, 2000),
        ...(admin && (action === "decide" || rationale !== "")
          ? boundedTextIssue("internal_rationale", rationale, 10, 2000)
          : []),
      ])
    )
      return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await post(
        `${prefix}/cases/${id}/${action}`,
        {
          version: record.version,
          note,
          message_id: "",
          outcome: action === "decide" ? outcome : "",
          ...(admin ? { internal_rationale: rationale } : {}),
        },
        caseSchema,
      );
      setNote("");
      setRationale("");
      setAfter(0);
      resource.reload();
      changed();
    } catch (cause) {
      setError(cause);
      if (cause instanceof APIError) fields.check(cause.issues);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <FieldValidation value={fields.validation}>
      <section
        className="catalog-section case-workspace"
        aria-label="Case review"
      >
        <ErrorNotice error={resource.error ?? error} hideIssues />
        <Issues issues={fields.issues} />
        {(!!resource.error || denied(error)) && (
          <Action
            disabled={resource.loading}
            onClick={() => {
              setError(null);
              resource.reload();
            }}
          >
            Try case again
          </Action>
        )}
        {!record ? (
          resource.loading ? (
            <p role="status">Loading case…</p>
          ) : null
        ) : (
          <>
            <h3>
              {record.kind.replaceAll("_", " ")} · {record.state}
            </h3>
            <p className="case-next-step" role="status">
              {caseNextStep(record.state, admin)}
            </p>
            {record.outcome && (
              <p>
                Proposed outcome: {record.outcome}. Refunds have their own
                approval and confirmation records below.
              </p>
            )}
            {record.appeal_until && (
              <p>
                Appeal deadline:{" "}
                <time dateTime={record.appeal_until}>
                  {new Date(record.appeal_until).toLocaleString()}
                </time>
                . Appeals used: {record.appeals}.
              </p>
            )}
            {record.policy ? (
              <details>
                <summary>Agreed service remedies</summary>
                {remedyLabels.map(([key, label]) => (
                  <div key={key}>
                    <h4>{label}</h4>
                    <p>{record.policy && remedyText(record.policy, key)}</p>
                  </div>
                ))}
              </details>
            ) : (
              <p>
                This agreement has no saved remedy policy. Staff can propose a
                resolution for your explicit acceptance.
              </p>
            )}
            {record.account_terms && (
              <details>
                <summary>Accepted account sale and handoff terms</summary>
                <p className="payment-policy">
                  {record.account_terms.sale_terms}
                </p>
                <p className="payment-policy">
                  {record.account_terms.transfer_requirements}
                </p>
                <p className="payment-policy">
                  {record.account_terms.dispute_terms}
                </p>
                <p>
                  Account dispute window: {record.account_terms.dispute_hours}{" "}
                  hours from delivery.
                </p>
                <p className="payment-policy">
                  {record.account_terms.acknowledgement_terms}
                </p>
              </details>
            )}
            <h4>Case updates</h4>
            <ol className="case-timeline">
              {resource.data?.events.map((event) => (
                <li key={event.id}>
                  <strong>
                    {event.role === "customer" ? "Customer" : "Support team"} ·{" "}
                    {event.action.replaceAll("_", " ")}
                    <time dateTime={event.created_at}>
                      {new Date(event.created_at).toLocaleString()}
                    </time>
                  </strong>
                  <p className="payment-policy">{event.note}</p>
                  {admin && event.internal_rationale && (
                    <aside>
                      <strong>Staff-only rationale</strong>
                      <p className="payment-policy">
                        {event.internal_rationale}
                      </p>
                    </aside>
                  )}
                </li>
              ))}
            </ol>
            {after > 0 && (
              <Action
                onClick={() => {
                  setAfter(0);
                }}
              >
                First case updates
              </Action>
            )}
            {!!resource.data?.next && (
              <Action
                onClick={() => {
                  setAfter(resource.data?.next ?? 0);
                }}
              >
                More case updates
              </Action>
            )}
            {record.state !== "closed" && (
              <fieldset
                disabled={
                  busy || refreshing || resource.loading || accessDenied
                }
              >
                <legend>Respond to this case</legend>
                <Text
                  name="note"
                  label={admin ? "Customer explanation" : "Case message"}
                  multiline
                  value={note}
                  change={setNote}
                  help={admin ? "" : "Add photos in the order’s messages."}
                />
                {admin && (
                  <Text
                    name="internal_rationale"
                    label="Internal rationale"
                    multiline
                    value={rationale}
                    change={setRationale}
                    help="Visible only to authorized staff. Keep the customer explanation separate; never enter credentials or authentication codes here."
                  />
                )}
                <div className="form-actions">
                  <Action onClick={() => void act("reply")}>
                    Send case reply
                  </Action>
                </div>
                {admin && ["open", "appealed"].includes(record.state) && (
                  <>
                    <Select
                      label="Case outcome"
                      value={outcome}
                      change={setOutcome}
                      options={[
                        ["retain", "Retain the existing outcome"],
                        ["continue", "Continue service"],
                        ["rework", "Arrange rework"],
                        ["cancel", "Cancel service"],
                      ]}
                    />
                    <Action onClick={() => void act("decide")}>
                      Propose case decision
                    </Action>
                  </>
                )}
                {!admin && record.state === "decided" && (
                  <>
                    <Action onClick={() => void act("accept")}>
                      Accept resolution and close case
                    </Action>
                    {!!record.appeal_until &&
                      new Date(record.appeal_until).getTime() > now && (
                        <Action onClick={() => void act("appeal")}>
                          Appeal decision
                        </Action>
                      )}
                  </>
                )}
                {admin && record.state === "decided" && (
                  <Action
                    disabled={
                      !record.policy ||
                      (!!record.appeal_until &&
                        new Date(record.appeal_until).getTime() > now)
                    }
                    onClick={() => void act("finalize")}
                  >
                    Finalize after appeal window
                  </Action>
                )}
                <p>A case cannot close while a refund is still unresolved.</p>
              </fieldset>
            )}
          </>
        )}
      </section>
    </FieldValidation>
  );
}
export default function Cases({
  detail,
  admin,
  owner,
  changed,
}: {
  detail: Detail;
  admin: boolean;
  owner: boolean;
  changed: () => void;
}) {
  const prefix = admin ? "/admin" : "";
  const resource = useResource(
    `${prefix}/orders/${detail.order.id}/cases`,
    caseListSchema,
  );
  const [selected, setSelected] = useState(""),
    [kind, setKind] = useState("dispute"),
    [note, setNote] = useState(""),
    [key, setKey] = useState(() => crypto.randomUUID()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const active = resource.data?.cases.find((value) => value.state !== "closed");
  const current = selected || active?.id || resource.data?.cases[0]?.id || "";
  function reload() {
    resource.reload();
    changed();
  }
  const fields = useEditorValidation();
  const lock = useRef(false);
  async function open() {
    if (
      lock.current ||
      resource.loading ||
      !resource.data ||
      active ||
      !detail.contract
    )
      return;
    if (!fields.check(boundedTextIssue("note", note, 10, 2000))) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await post(
        `${prefix}/orders/${detail.order.id}/cases`,
        { request_key: key, kind, note, message_id: "" },
        caseSchema,
      );
      setSelected(result.id);
      setNote("");
      setKey(crypto.randomUUID());
      reload();
    } catch (cause) {
      setError(cause);
      if (cause instanceof APIError) fields.check(cause.issues);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <FieldValidation value={fields.validation}>
      <section className="catalog-section" aria-label="Disputes and refunds">
        <h2>Service review and refunds</h2>
        <ErrorNotice error={resource.error ?? error} hideIssues />
        <Issues issues={fields.issues} />
        <Action disabled={resource.loading} onClick={reload}>
          Refresh cases and order
        </Action>
        {!resource.data && resource.loading && (
          <p role="status">Loading service cases…</p>
        )}
        {resource.data && (
          <>
            {resource.data.cases.length > 1 && (
              <Select
                label="Service case"
                value={current}
                change={setSelected}
                options={resource.data.cases.map(
                  (value) =>
                    [
                      value.id,
                      `${value.kind.replaceAll("_", " ")} · ${value.state} · ${new Date(value.created_at).toLocaleDateString()}`,
                    ] as const,
                )}
              />
            )}
            {!active && detail.contract && (
              <details className="case-request">
                <summary>Request a service review</summary>
                <fieldset disabled={busy || resource.loading}>
                  <legend>Tell us what happened</legend>
                  <p>Work pauses during review. Refunds aren’t automatic.</p>
                  <Select
                    name="kind"
                    label="Review reason"
                    value={kind}
                    change={(value) => {
                      setKind(value);
                      setKey(crypto.randomUUID());
                    }}
                    options={[
                      ["dispute", "Service dispute"],
                      ["cancellation", "Cancellation"],
                      ["no_show", "Missed appointment"],
                      ["missed_target", "Missed target"],
                      ["payment", "Payment issue"],
                    ]}
                  />
                  <Text
                    name="note"
                    label="Describe your case"
                    multiline
                    value={note}
                    change={(value) => {
                      setNote(value);
                      setKey(crypto.randomUUID());
                    }}
                  />
                  <div className="form-actions">
                    <Action onClick={() => void open()}>
                      {busy ? "Opening case…" : "Open service case"}
                    </Action>
                  </div>
                </fieldset>
              </details>
            )}
            {!current && (
              <p>
                No service cases yet. For an ordinary question, use your order
                conversation. Open a case when you need a formal review.
              </p>
            )}
            {current && (
              <CaseConversation
                key={`${current}:${String(resource.data.cases.find((value) => value.id === current)?.version ?? 0)}`}
                id={current}
                refreshing={resource.loading}
                admin={admin}
                changed={reload}
              />
            )}
            <Refunds
              key={`${detail.order.id}:${String(detail.order.version)}`}
              orderID={detail.order.id}
              caseID={active?.id ?? ""}
              admin={admin}
              owner={owner}
            />
          </>
        )}
      </section>
    </FieldValidation>
  );
}
