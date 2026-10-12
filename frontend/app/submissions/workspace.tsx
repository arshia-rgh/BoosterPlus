import { RecordDraftBoundary } from "../ui/record-drafts";
import { selectedLabel } from "../experience/selection-summary";
import { optionsFor } from "../catalog/model";
import { useCallback, useContext, useEffect, useState } from "react";
import { Link, useLocation, useParams, type Location } from "../portal-router";
import { z } from "../validation";
import { Action, ErrorNotice } from "../catalog/controls";
import { AuthorizedIdentity } from "../identity/frame";
import { sessionEventMatches } from "../identity/portal";
import { denied } from "../support/chat-state";
import { RecordShell } from "../ui/record-shell";
import Thread from "../support/thread";
import { financeReturn, relatedRecord } from "../payments/finance-context";
import SellerOffers from "../resale/offers";
import { useResource } from "../orders/resource";
import { submissionSchema, stateLabel, type Submission } from "./model";
import SubmissionEditor from "./form";
import { History, ReviewActions } from "./record-parts";
import "../orders/admin-workspace.css";
const sections = [
  { id: "overview", label: "Overview" },
  { id: "details", label: "Account details" },
  { id: "messages", label: "Messages & evidence" },
  { id: "agreement", label: "Sale agreement" },
  { id: "handover", label: "Secure handover" },
  { id: "payout", label: "Payout" },
  { id: "activity", label: "Activity" },
];
function Workspace({
  value,
  admin,
  back,
  loading,
  suspended,
  reload,
}: {
  value: Submission;
  admin: boolean;
  back: string;
  loading: boolean;
  suspended: boolean;
  reload: () => void;
}) {
  const row = value.submission;
  const location: Location<unknown> = useLocation();
  const local = (section: string, label: string) => (
    <Link to={"?section=" + section} state={location.state} preventScrollReset>
      {label}
    </Link>
  );
  return (
    <div className="sale-workspace admin-order-workspace">
      <RecordShell
        id={row.id}
        title="Submission"
        headingLevel={2}
        compactReference
        stickyStatus={stateLabel(row.state)}
        workspace={admin ? "Admin workspace" : "My account"}
        back={{
          to: back,
          state: location.state,
          label: back.startsWith("/admin/accounts/")
            ? "Account listing"
            : back.startsWith("/admin/finance?")
              ? "Finance workspace"
              : admin
                ? "Submission queue"
                : "Your account sales",
        }}
        sections={sections}
        keepMounted={[
          "overview",
          "details",
          "messages",
          "agreement",
          "handover",
          "payout",
        ]}
        status={
          <>
            <strong>{row.title}</strong>
            <span>{row.game}</span>
            <span className="status">{stateLabel(row.state)}</span>
            <Action disabled={loading} onClick={reload}>
              Refresh submission
            </Action>
          </>
        }
      >
        {(section, visible) => (
          <fieldset
            className="admin-record-content"
            disabled={loading || suspended}
          >
            <legend className="sr-only">
              {sections.find((item) => item.id === section)?.label}
            </legend>
            {section === "overview" && (
              <>
                <h3>Your account sale at a glance</h3>
                <p>
                  {value.note ||
                    "Keep ownership information, the agreed terms and direct payout attached to this submission."}
                </p>
                <p>
                  {row.state === "accepted"
                    ? "An agreement has been accepted. Review protected handover and its recorded payout conditions."
                    : row.state === "approved_pending_terms"
                      ? "Review is approved. A separate commercial agreement still requires explicit acceptance."
                      : row.state === "needs_information"
                        ? "The team needs more information before review can continue."
                        : row.state === "submitted"
                          ? "Your submission is waiting for private staff review."
                          : row.state === "draft"
                            ? "Complete your private account details and submit them for review."
                            : "This submission is closed. Its records remain available below."}
                </p>
                <div className="catalog-actions">
                  {local(
                    ["draft", "needs_information"].includes(row.state)
                      ? "details"
                      : row.state === "accepted"
                        ? "handover"
                        : "agreement",
                    row.state === "accepted"
                      ? "Review secure handover"
                      : ["draft", "needs_information"].includes(row.state)
                        ? "Complete account details"
                        : "Review sale agreement",
                  )}
                  {local("messages", "Contact the review team")}
                </div>
                <ReviewActions value={value} admin={admin} reload={reload} />
              </>
            )}
            {section === "details" && (
              <>
                <h3>Private account details</h3>
                {!admin &&
                ["draft", "needs_information"].includes(row.state) ? (
                  <SubmissionEditor value={value} reload={reload} />
                ) : (
                  <section>
                    <dl>
                      {value.offer.configuration.intake?.fields.map((field) => {
                        const answer = value.answers[field.key];
                        return answer === undefined ? null : (
                          <div key={field.key}>
                            <dt>{field.label}</dt>
                            <dd>
                              {selectedLabel(
                                answer,
                                optionsFor(field, value.offer.configuration),
                              )}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                    <h4>Ownership and control</h4>
                    <p>{value.ownership_notes || "Not provided"}</p>
                    <p>
                      {value.ownership_declared
                        ? "Seller declared authority to submit this account."
                        : "Authority has not been declared."}
                    </p>
                  </section>
                )}
              </>
            )}
            {section === "messages" && (
              <>
                <h3>Messages & ownership evidence</h3>
                <p>
                  Private to the seller and administrators. Buyer support and
                  booster coordination are separate. Use Secure handover for
                  login and recovery details.
                </p>
                <Thread
                  conversationID={value.conversation_id}
                  admin={admin}
                  embedded
                  visible={visible && !loading && !suspended}
                />
              </>
            )}
            {["agreement", "handover", "payout"].includes(section) && (
              <SellerOffers
                id={row.id}
                version={row.version}
                state={row.state}
                admin={admin}
                changed={reload}
                view={
                  section === "handover"
                    ? "handover"
                    : section === "payout"
                      ? "payout"
                      : "agreement"
                }
                visible={visible && !loading && !suspended}
              />
            )}
            {section === "activity" && <History id={row.id} admin={admin} />}
          </fieldset>
        )}
      </RecordShell>
    </div>
  );
}
function Session({ admin }: { admin: boolean }) {
  const { id = "" } = useParams();
  const portal = admin ? "admin" : "customer";
  const identity = useContext(AuthorizedIdentity);
  const location: Location<unknown> = useLocation();
  const source = z
    .object({ submissionListSearch: z.string().max(2048) })
    .safeParse(location.state);
  const back =
    (admin
      ? (financeReturn(location.state) ??
        relatedRecord(location.state, "inventoryID"))
      : null) ??
    (admin ? "/admin/submissions" : "/sell") +
      (source.success
        ? "?" + new URLSearchParams(source.data.submissionListSearch).toString()
        : "");
  const resource = useResource(
    `${admin ? "/admin" : ""}/submissions/${encodeURIComponent(id)}`,
    submissionSchema,
  );
  const [saved, setSaved] = useState<Submission | null>(null),
    [interrupted, setInterrupted] = useState(false),
    [checking, setChecking] = useState(false);
  const wrong =
    !!identity &&
    (identity.session.portal !== portal ||
      !identity.session.user ||
      identity.session.mfa_required ||
      !identity.session.capabilities.includes(admin ? "admin" : "account"));
  const lost = interrupted || wrong || denied(resource.error);
  if (lost && saved) setSaved(null);
  else if (!lost && !checking && resource.data && saved !== resource.data)
    setSaved(resource.data);
  const reloadResource = resource.reload;
  const reload = useCallback(() => {
    if (lost) setChecking(true);
    setInterrupted(false);
    reloadResource();
  }, [lost, reloadResource]);
  useEffect(() => {
    const changed = (event: Event) => {
      if (sessionEventMatches(event, portal)) setInterrupted(true);
    };
    window.addEventListener("boosterplus:session-changed", changed);
    return () => {
      window.removeEventListener("boosterplus:session-changed", changed);
    };
  }, [portal]);
  if (checking && resource.loading)
    return <p role="status">Checking submission access…</p>;
  if (checking && !resource.loading) setChecking(false);
  if (lost)
    return (
      <section aria-label="Submission access removed">
        <p role="alert">
          Access changed. Private details and unsent drafts have been cleared.
        </p>
        <Link to={admin ? "/admin/login" : "/login"}>
          Sign in to this workspace
        </Link>
        <Action disabled={resource.loading} onClick={reload}>
          Check submission access
        </Action>
        <Link to={back}>Return to submissions</Link>
      </section>
    );
  const value = resource.data ?? saved;
  const suspended = !!resource.error;
  return (
    <>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Refreshing submission…</p>}
      {suspended && (
        <section aria-label="Submission connection recovery">
          <p>
            Details are hidden until the connection recovers. Ordinary drafts
            stay in this tab.
          </p>
          <Action disabled={resource.loading} onClick={reload}>
            Retry submission
          </Action>
        </section>
      )}
      {value && (
        <div hidden={suspended}>
          <Workspace
            value={value}
            admin={admin}
            back={back}
            loading={resource.loading}
            suspended={suspended}
            reload={reload}
          />
        </div>
      )}
    </>
  );
}
export default function SubmissionWorkspace({
  admin = false,
}: {
  admin?: boolean;
}) {
  const { id } = useParams();
  return (
    <RecordDraftBoundary
      pendingDescription="An upload, safety check or send is still pending. Stay on this account sale to check the result. For an uncertain screenshot send, use Retry sending these screenshots; for an unfinished image upload, retry or remove that attachment when its controls become available."
      key={(admin ? "admin:" : "customer:") + (id ?? "")}
      record="submission"
      description="Submission sections keep your account details and unsent screenshots. Leaving discards unsaved work."
    >
      <Session admin={admin} />
    </RecordDraftBoundary>
  );
}
