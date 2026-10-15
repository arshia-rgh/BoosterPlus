import { Confirmation } from "../ui/form-validation";
import { useContext, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "../portal-router";
import { AuthorizedIdentity } from "../identity/frame";
import { focusValidationTarget } from "../ui/form-validation";
import { command, auditsSchema, recoveriesSchema } from "../identity/api";
import { Form, Text, value } from "../identity/identity";
import { Action, ErrorNotice, Text as Field } from "../catalog/controls";
import { useResource } from "../orders/resource";
function OwnerReview() {
  const [params, setParams] = useSearchParams();
  const names = ["actor", "action", "target", "from", "to"] as const;
  const applied = Object.fromEntries(
    names.map((key) => [key, params.get(key) ?? ""]),
  );
  const key = JSON.stringify(applied);
  const [previous, setPrevious] = useState(key);
  const [filters, setFilters] = useState(applied);
  if (previous !== key) {
    setPrevious(key);
    setFilters(applied);
  }
  const fieldValues = new Map(Object.entries(filters));
  const query = new URLSearchParams({
    ...applied,
    after: params.get("after") ?? "",
  });
  const audits = useResource(`/admin/audit?${query.toString()}`, auditsSchema);
  const requests = useResource("/admin/recoveries", recoveriesSchema);
  const recoveryHeading = useRef<HTMLHeadingElement>(null);
  const pendingRecoveryFocus = useRef(false);
  const [completedRecovery, setCompletedRecovery] = useState<{
    id: string;
    message: string;
  } | null>(null);
  useEffect(() => {
    if (requests.loading || !pendingRecoveryFocus.current) return;
    focusValidationTarget(recoveryHeading.current);
    pendingRecoveryFocus.current = false;
  }, [requests.loading, requests.data, requests.error]);
  return (
    <section className="staff-security-review">
      <h2>Audit & recovery review</h2>
      <p>
        Owner-only evidence and account recovery. Audit filters match exact
        identifiers; dates include the full UTC day.
      </p>
      <p>
        If this action needs fresh verification, confirm it in the dialog here.
      </p>
      <form
        className="catalog-grid"
        onSubmit={(event) => {
          event.preventDefault();
          setParams({ view: "audit", ...filters });
        }}
      >
        {names.map((name) => (
          <Field
            key={name}
            type={name === "from" || name === "to" ? "date" : "text"}
            label={
              name === "actor"
                ? "Exact actor ID or reference"
                : name === "action"
                  ? "Exact audit action"
                  : name === "target"
                    ? "Exact target ID"
                    : name === "from"
                      ? "From UTC day"
                      : "Through UTC day"
            }
            value={fieldValues.get(name) ?? ""}
            change={(value) => {
              setFilters({ ...filters, [name]: value });
            }}
          />
        ))}
        <button className="button" type="submit">
          Filter audit
        </button>
      </form>
      <Action disabled={audits.loading} onClick={audits.reload}>
        Refresh audit
      </Action>
      <ErrorNotice error={audits.error} />
      {audits.loading && <p role="status">Loading audit evidence…</p>}
      {audits.data && !audits.error && (
        <>
          {!audits.data.audits.length && (
            <p>No audit entries match these filters.</p>
          )}
          <ol className="audit-list">
            {audits.data.audits.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.action}</strong> ·{" "}
                <time dateTime={entry.created_at}>
                  {new Date(entry.created_at).toLocaleString()}
                </time>
                <p>
                  Actor: {entry.actor_id || entry.actor_reference || "System"} ·
                  Target: {entry.target_id || "Not applicable"}
                </p>
              </li>
            ))}
          </ol>
          <div className="catalog-actions">
            {params.get("after") && (
              <Link
                to={`?${new URLSearchParams({ view: "audit", ...applied }).toString()}`}
              >
                Newest audit entries
              </Link>
            )}
            {audits.data.next && (
              <Link
                to={`?${new URLSearchParams({ view: "audit", ...applied, after: audits.data.next }).toString()}`}
              >
                Older audit entries
              </Link>
            )}
          </div>
        </>
      )}
      <h3 ref={recoveryHeading} tabIndex={-1}>
        Account recovery requests
      </h3>
      <p>
        Verify ownership using independent evidence before approval. A code sent
        to a new address is insufficient. Keep evidence in your restricted
        support case; record only its reference here. Approval disconnects
        Google and revokes sessions. It preserves suspension and the
        authenticator.
      </p>
      <Action disabled={requests.loading} onClick={requests.reload}>
        Load recovery requests
      </Action>
      {completedRecovery && <p role="status">{completedRecovery.message}</p>}
      <ErrorNotice error={requests.error} />
      {requests.loading && <p role="status">Loading recovery requests…</p>}
      {requests.data?.recoveries.length === 0 && (
        <p>No pending recovery requests.</p>
      )}
      {(requests.error ? [] : (requests.data?.recoveries ?? []))
        .filter((entry) => entry.id !== completedRecovery?.id)
        .map((entry) => (
          <Form
            key={entry.id}
            title={"Recovery for " + entry.user_id}
            label="Resolve recovery"
            submit={async (data) => {
              const approve = value(data, "decision") === "approve";
              await command(
                "/admin/recoveries/" +
                  encodeURIComponent(entry.id) +
                  "/resolve",
                {
                  approve,
                  case_reference: value(data, "reference"),
                },
              );
              pendingRecoveryFocus.current = true;
              setCompletedRecovery({
                id: entry.id,
                message: `Recovery for ${entry.user_id} ${approve ? "approved" : "rejected"}.`,
              });
              requests.reload();
            }}
          >
            <p>Requested destination: {entry.new_email}</p>
            <Text
              name="reference"
              label="Independent support case reference"
              maxLength={64}
            />
            <label>
              Decision
              <select name="decision" defaultValue="reject">
                <option value="reject">Reject</option>
                <option value="approve">
                  Approve after independent review
                </option>
              </select>
            </label>
            <Confirmation>
              I reviewed ownership evidence and recorded the case
            </Confirmation>
          </Form>
        ))}
    </section>
  );
}
export default function Governance() {
  const identity = useContext(AuthorizedIdentity);
  return identity?.session.capabilities.includes("owner") ? (
    <OwnerReview />
  ) : (
    <p>Audit and recovery review require an owner session.</p>
  );
}
