import { useEffect, useRef, useState } from "react";
import {
  Action,
  ErrorNotice,
  NumberInput,
  Select,
  Text,
} from "../catalog/controls";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import { active, staffSchema, workSchema, type Work } from "./model";
import { focusValidationTarget } from "../ui/form-validation";
export function Assignment({
  id,
  orderVersion,
  work,
  reload,
}: {
  id: string;
  orderVersion: number;
  work: Work | null;
  reload: () => void;
}) {
  const staff = useResource("/admin/fulfillment/staff", staffSchema),
    [assigned, setAssigned] = useState(work?.assigned_id ?? ""),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function save() {
    setBusy(true);
    try {
      await post(
        `/admin/fulfillment/${id}/assign`,
        {
          version: work?.version ?? 0,
          order_version: work?.order_version ?? orderVersion,
          assigned_id: assigned,
          reason,
        },
        workSchema,
      );
      reload();
      setReason("");
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="catalog-section">
      <h3>{work ? "Change assignment" : "Assign paid order"}</h3>
      <ErrorNotice error={error ?? staff.error} />
      <Select
        label="Assigned staff"
        value={assigned}
        options={[
          ["", "Choose staff"],
          ...(staff.data?.staff.map(
            (s) =>
              [s.id, `${s.alias} · ${s.role} · ${s.id.slice(0, 8)}`] as const,
          ) ?? []),
        ]}
        change={setAssigned}
      />
      <Text
        label="Assignment reason"
        value={reason}
        change={setReason}
        help="Customer-visible. Reassignment puts work on hold and removes stored game access; ask the customer to change the game password before submitting fresh access."
      />
      <Action
        disabled={busy || !assigned || !reason.trim()}
        onClick={() => {
          void save();
        }}
      >
        Save assignment
      </Action>
    </section>
  );
}
export function ExecutionActions({
  work,
  admin,
  reload,
  startAllowed = true,
}: {
  work: Work;
  admin: boolean;
  reload: () => void;
  startAllowed?: boolean;
}) {
  const [note, setNote] = useState(""),
    [progress, setProgress] = useState(Math.min(99, work.progress)),
    [start, setStart] = useState(""),
    [finish, setFinish] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState<unknown>(null);
  const root = useRef<HTMLElement>(null),
    feedback = useRef<HTMLDivElement>(null),
    focusPending = useRef(false),
    origin = useRef<Element | null>(null),
    lock = useRef(false);
  useEffect(() => {
    if (busy || !focusPending.current || (!notice && !error)) return;
    focusPending.current = false;
    const current = document.activeElement;
    if (
      !root.current?.closest("[hidden]") &&
      (current === origin.current ||
        current === document.body ||
        (current && root.current && current.contains(root.current)))
    )
      focusValidationTarget(feedback.current);
  }, [busy, notice, error]);
  async function apply(action: string) {
    if (lock.current) return;
    lock.current = true;
    origin.current = document.activeElement;
    focusPending.current = true;
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      const saved = await post(
        `/${admin ? "admin" : "booster"}/fulfillment/${work.order_id}/${action}`,
        {
          version: work.version,
          order_version: work.order_version,
          note,
          progress: action === "progress" ? progress : 0,
          estimated_start:
            action === "estimate" ? new Date(start).toISOString() : null,
          estimated_finish:
            action === "estimate" ? new Date(finish).toISOString() : null,
        },
        workSchema,
      );
      setNotice(
        action === "progress"
          ? `Progress saved: ${String(saved.progress)}%. Your update is visible to the customer. Add proof in the assignment conversation when needed.`
          : action === "submit_completion"
            ? "Completion submitted for administrator review."
            : action === "estimate"
              ? "Delivery estimate saved."
              : "Fulfillment update saved. The assignment is refreshing.",
      );
      setNote("");
      reload();
    } catch (cause) {
      setError(cause);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!active(work) && !notice && !error) return null;
  const action = (key: string, label: string, allowed = true) => (
    <Action
      disabled={busy || !note.trim() || !allowed}
      onClick={() => {
        void apply(key);
      }}
    >
      {label}
    </Action>
  );
  return (
    <section ref={root} className="catalog-section">
      <h3>Update fulfillment</h3>
      <div
        ref={feedback}
        tabIndex={-1}
        role="group"
        aria-label="Fulfillment update result"
      >
        <ErrorNotice error={error} />
        {notice && <p role="status">{notice}</p>}
      </div>
      {active(work) && (
        <>
          <Text
            label="Customer-visible update"
            value={note}
            change={setNote}
            multiline
            help="Describe progress or the reason for this change. Do not enter credentials."
          />
          <div className="catalog-actions">
            {work.state === "queued" &&
              action("start", "Start work", startAllowed)}
            {work.state === "on_hold" &&
              action("resume", "Resume work", startAllowed)}
            {work.state !== "on_hold" && action("hold", "Put on hold")}
          </div>
          {work.state === "in_progress" && !work.completion_pending && (
            <>
              <NumberInput
                label="Progress percent (0–99)"
                value={progress}
                change={setProgress}
              />
              {action(
                "progress",
                "Save progress",
                progress >= 0 && progress <= 99,
              )}{" "}
              {action("submit_completion", "Submit completion for review")}
            </>
          )}
          {work.completion_pending && (
            <>
              <p>Completion is awaiting administrator review.</p>
              {admin && (
                <div className="catalog-actions">
                  {action("approve_completion", "Approve completion")}
                  {action("return_completion", "Return for more work")}
                </div>
              )}
            </>
          )}
          {admin && (
            <details>
              <summary>Update delivery estimate</summary>
              <p>
                Enter your local date and time. These are estimates; the
                accepted agreement stays in the order history.
              </p>
              <Text
                type="datetime-local"
                label="Estimated start"
                value={start}
                change={setStart}
              />
              <Text
                type="datetime-local"
                label="Estimated finish"
                value={finish}
                change={setFinish}
              />
              {action(
                "estimate",
                "Save delivery estimate",
                !!start && !!finish,
              )}
            </details>
          )}
        </>
      )}
    </section>
  );
}
