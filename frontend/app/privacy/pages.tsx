import { useState } from "react";
import { Link } from "../portal-router";
import { z } from "../validation";
import { Action, ErrorNotice } from "../catalog/controls";
import { Form, value } from "../identity/identity";
import { post } from "../identity/api";
import { useResource } from "../orders/resource";
import { contentSchema, retentionSchema } from "../site/model";
export const requestSchema = z.object({
  manual_hold: z.boolean(),
  id: z.string(),
  user_id: z.string(),
  version: z.number().int(),
  state: z.string(),
  policy_id: z.string(),
  reviewed_policy_id: z.string(),
  hold_reason: z.string(),
  eligible_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
const listingSchema = z.object({
  requests: z.array(requestSchema),
  next: z.string(),
});
const exportSchema = z.object({
  section: z.string(),
  records: z.array(z.record(z.string(), z.unknown())).max(100),
  next: z.string(),
  audit_id: z.string(),
  observed_at: z.string(),
});
const sections = [
  "profile",
  "orders",
  "quotes",
  "contracts",
  "order_events",
  "submissions",
  "submission_events",
  "offers",
  "conversations",
  "messages",
  "forms",
  "receipts",
  "transfers",
  "reviews",
  "favorites",
  "alerts",
  "notifications",
  "cases",
  "case_events",
  "bookings",
  "media",
  "fulfillment",
] as const;
function Export() {
  const [section, setSection] = useState<string>("profile"),
    [next, setNext] = useState(""),
    [message, setMessage] = useState("");
  return (
    <Form
      title="Download your data"
      label={next ? "Download next page" : "Download selected category"}
      submit={async () => {
        const page = await post(
          "/privacy/export",
          { section, after: next },
          exportSchema,
        );
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(page, null, 2) + "\n"], {
            type: "application/json",
          }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = "playora-personal-" + section + ".json";
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
        setNext(page.next);
        setMessage(
          `${String(page.records.length)} records downloaded. Audit ${page.audit_id}. ${page.next ? "More records remain in this category." : "Category complete; select another category to continue."}`,
        );
      }}
    >
      <p>
        Download each category in pages of up to 100 records. Shop delivery
        identifiers are included with your orders. When requested, confirm with
        an email code or your enrolled authenticator in the verification dialog.
        Exports contain your personal information; store them privately.
        Internal staff notes and authentication secrets are excluded.
      </p>
      <p>
        If this action needs fresh verification, confirm it in the dialog here.
      </p>
      <label>
        Data category
        <select
          value={section}
          onChange={(event) => {
            setSection(event.target.value);
            setNext("");
            setMessage("");
          }}
        >
          {sections.map((item) => (
            <option key={item} value={item}>
              {item.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <p role="status">{message}</p>
    </Form>
  );
}
export default function Privacy({ admin = false }: { admin?: boolean }) {
  const [after, setAfter] = useState("");
  const base = admin ? "/admin/privacy/requests" : "/privacy/requests",
    resource = useResource(
      base + "?after=" + encodeURIComponent(after),
      listingSchema,
    ),
    policy = useResource("/site/retention", contentSchema);
  const parsed = retentionSchema.safeParse(policy.data?.data),
    enabled = parsed.success && parsed.data.enabled;
  return (
    <section>
      <h2>
        {admin ? "Privacy request review" : "Data controls and retention"}
      </h2>
      <p>
        Active orders, disputes, unsettled payouts, inventory and unresolved
        support hold deletion. Owner review and all retention deadlines must
        pass. Financial agreements, dispute evidence and audit history remain
        preserved under the approved policy. File cleanup is tracked separately;
        backups follow the operator's published policy.
      </p>
      {admin ? (
        <p>
          <Link to="/admin/content?kind=retention&section=editor">
            Manage owner retention policy
          </Link>
        </p>
      ) : (
        <Export />
      )}
      <ErrorNotice error={policy.error} />
      {parsed.success && (
        <details>
          <summary>Retention policy · {policy.data?.label}</summary>
          <div className="legal-text">{parsed.data.policy_text}</div>
          <p>Backup policy: {parsed.data.backup_policy}</p>
          <p>
            Minimum days: financial {parsed.data.financial_days}; disputes{" "}
            {parsed.data.dispute_days}; audit {parsed.data.audit_days}; support{" "}
            {parsed.data.support_days}; request grace {parsed.data.grace_days}.
          </p>
        </details>
      )}
      {!admin &&
        (enabled ? (
          <Form
            title="Request account deletion"
            submit={async () => {
              await post(
                base,
                { policy_id: policy.data?.release_id, accept: true },
                requestSchema,
              );
              resource.reload();
            }}
          >
            <label className="check">
              <input type="checkbox" required />I read the current retention
              policy and request removal of my profile and eligible private
              content, subject to its retained-evidence and backup rules.
            </label>
          </Form>
        ) : (
          <p>
            Deletion requests are disabled until the owner publishes and enables
            a retention policy.
          </p>
        ))}
      <h3>
        {admin ? "Requests awaiting action and history" : "Your requests"}
      </h3>
      <Action onClick={resource.reload}>Refresh privacy requests</Action>
      <ErrorNotice error={resource.error} />
      {resource.data?.requests.length === 0 && <p>No privacy requests.</p>}
      {resource.data?.requests.map((request) => (
        <article className="identity-card" key={request.id}>
          <h3>Request {request.id}</h3>
          {admin && <p>Customer {request.user_id}</p>}
          <p>Status: {request.state.replaceAll("_", " ")}</p>
          {request.hold_reason && <p>{request.hold_reason}</p>}
          {request.eligible_at && (
            <p>
              Earliest retention date:{" "}
              {new Date(request.eligible_at).toLocaleString()}. Active records
              are rechecked before erasure.
            </p>
          )}
          {request.state === "erased_pending_files" && (
            <p>
              Live-data erasure has started. Private file cleanup is pending;
              retained evidence and backups follow the published policy. This
              request can no longer be cancelled.
            </p>
          )}
          {!["completed", "cancelled"].includes(request.state) &&
            (admin || request.state !== "erased_pending_files") && (
              <RequestAction
                key={`${request.id}:${String(request.version)}:${policy.data?.release_id ?? ""}`}
                request={request}
                admin={admin}
                base={base}
                policyID={policy.data?.release_id ?? ""}
                enabled={enabled}
                reload={resource.reload}
              />
            )}
        </article>
      ))}
      {resource.data?.next && (
        <Action
          onClick={() => {
            setAfter(resource.data?.next ?? "");
          }}
        >
          Next privacy requests
        </Action>
      )}
      {after && (
        <Action
          onClick={() => {
            setAfter("");
          }}
        >
          First privacy requests
        </Action>
      )}
    </section>
  );
}

function RequestAction({
  request,
  admin,
  base,
  policyID,
  enabled,
  reload,
}: {
  request: z.infer<typeof requestSchema>;
  admin: boolean;
  base: string;
  policyID: string;
  enabled: boolean;
  reload: () => void;
}) {
  const [action, setAction] = useState("review");
  const actionLabel =
    new Map([
      ["review", "Recheck holds and retention"],
      ["hold", "Place owner hold"],
      ["release_hold", "Release owner hold"],
      ["erase", "Erase eligible data"],
      ["finalize", "Confirm file purge"],
    ]).get(action) ?? "Review privacy request";
  return (
    <Form
      title={admin ? "Review privacy request" : "Cancel deletion request"}
      label={admin ? actionLabel : "Cancel deletion request"}
      submit={async (data) => {
        await post(
          base + "/" + request.id,
          {
            version: request.version,
            action: admin ? action : "cancel",
            reason: value(data, "reason"),
            policy_id: policyID,
          },
          requestSchema,
        );
        reload();
      }}
    >
      {admin ? (
        <>
          <label>
            Action
            <select
              name="action"
              value={action}
              onChange={(event) => {
                setAction(event.target.value);
              }}
            >
              <option value="review">Recheck holds and retention</option>
              <option value="hold">Place owner hold</option>
              {request.manual_hold && (
                <option value="release_hold">
                  Release owner hold with reason
                </option>
              )}
              {enabled && request.state === "reviewed" && (
                <option value="erase">
                  Erase eligible profile and private data
                </option>
              )}
              {request.state === "erased_pending_files" && (
                <option value="finalize">
                  Confirm private files have been purged
                </option>
              )}
            </select>
          </label>
          <p>
            <strong>Selected action: {actionLabel}</strong>
          </p>
          <label>
            Owner hold reason
            <textarea name="reason" maxLength={2000} />
          </label>
          <p role="status">
            {action === "erase"
              ? "Erasure revokes sign-in and removes eligible live private data. Financial, dispute and audit evidence remains; files may still need purging and backups follow the published policy."
              : action === "finalize"
                ? "Confirm only after private object purges are verified. Retained evidence and backups remain governed by the published policy."
                : "Recheck current holds and policy before proceeding."}
          </p>
          <label className="check">
            <input key={action} type="checkbox" required />I reviewed this
            action, current policy and retained records.
          </label>
        </>
      ) : (
        <label className="check">
          <input
            type="checkbox"
            required
            disabled={request.state === "erased_pending_files"}
          />
          Cancel my pending request before erasure begins
        </label>
      )}
    </Form>
  );
}
