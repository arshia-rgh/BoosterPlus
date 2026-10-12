import { useCallback, useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
  type Location,
} from "../portal-router";
import { z } from "../validation";
import { Action, ErrorNotice, Select, Text } from "../catalog/controls";
import {
  sessionEventMatches,
  sessionVerificationReason,
  type VerificationReason,
} from "../identity/portal";
import { APIError } from "../identity/api";
import { VerificationLink } from "../account/return-path";
import { focusValidationTarget } from "../ui/form-validation";
import { denied } from "../support/chat-state";
import Thread from "../support/thread";
import { useResource } from "../orders/resource";
import { RecordShell } from "../ui/record-shell";
import { workNextStep } from "./work-presentation";
import { listingSchema, workSchema, type Work } from "./model";
import { WorkSummary } from "./work-summary";
import AssignmentActions from "./readiness";
import { StaffSecret } from "./secrets";
import Bookings from "./bookings";
import { sessionTime } from "./agenda";
import "../orders/order-workspace.css";
import "./booster.css";
const sourceSchema = z.object({
  assignmentSearch: z.string().max(2048).optional(),
  assignmentOrigin: z.enum(["calendar", "overview"]).optional(),
});
const sections = [
  { id: "overview", label: "Overview" },
  { id: "progress", label: "Progress" },
  { id: "messages", label: "Messages & proof" },
  { id: "sessions", label: "Sessions" },
  { id: "access", label: "Game access" },
];
export function BoosterQueue() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [state, setState] = useState(params.get("state") ?? "");
  const appliedFilters = JSON.stringify([
    params.get("search"),
    params.get("state"),
  ]);
  const [previousFilters, setPreviousFilters] = useState(appliedFilters);
  if (previousFilters !== appliedFilters) {
    setPreviousFilters(appliedFilters);
    setSearch(params.get("search") ?? "");
    setState(params.get("state") ?? "");
  }
  const query = new URLSearchParams({
    after: params.get("after") ?? "",
    search: params.get("search") ?? "",
    state: params.get("state") ?? "",
  });
  const resource = useResource(
    `/booster/fulfillment?${query.toString()}`,
    listingSchema,
  );
  return (
    <section aria-label="Assignment queue">
      <p>
        Only your assigned work appears here. Each assignment keeps its
        instructions, progress, messages and sessions together.
      </p>
      <form
        className="orders-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setParams({ search, state });
        }}
      >
        <Text
          label="Search game or full order ID"
          value={search}
          change={setSearch}
        />
        <Select
          label="Assignment status"
          value={state}
          change={setState}
          options={[
            ["", "All statuses"],
            ["active", "Active"],
            ["queued", "Queued"],
            ["in_progress", "In progress"],
            ["on_hold", "On hold"],
            ["review", "Awaiting completion review"],
            ["completed", "Completed"],
          ]}
        />
        <button type="submit" className="button">
          Filter assignments
        </button>
      </form>
      <div className="catalog-actions">
        <Action disabled={resource.loading} onClick={resource.reload}>
          Refresh queue
        </Action>
        <Link to="/booster/calendar">My availability</Link>
        {!!params.toString() && (
          <Action
            onClick={() => {
              setSearch("");
              setState("");
              setParams({});
            }}
          >
            Clear filters
          </Action>
        )}
      </div>
      <ErrorNotice error={resource.error} />
      {resource.loading && <p role="status">Loading assigned work…</p>}
      {resource.data && !resource.error && (
        <>
          {!resource.data.items.length && (
            <p>
              {params.get("state") || params.get("search")
                ? "No assignments match these filters."
                : "No assigned work yet. Keep your availability current."}
            </p>
          )}
          <ul className="booster-queue">
            {resource.data.items.map((work) => (
              <li key={work.order_id} className="booster-work-card">
                <Link
                  to={`/booster/orders/${work.order_id}`}
                  state={{ assignmentSearch: params.toString() }}
                  aria-label={`View assignment ${work.order_id} · ${work.game}`}
                >
                  <strong>
                    {work.game} · {work.service}
                  </strong>
                  <small>Assignment {work.order_id.slice(0, 8)}</small>
                </Link>
                <span className="status">
                  {work.completion_pending
                    ? "Awaiting completion review"
                    : work.state.replaceAll("_", " ")}
                </span>
                <p>
                  {work.mode === "account"
                    ? "Play on account"
                    : "Play together"}
                </p>
                <p>{workNextStep(work)}</p>
                {work.next_session && (
                  <p>
                    Confirmed session:{" "}
                    {sessionTime(
                      work.next_session.starts_at,
                      work.next_session.timezone,
                    )}{" "}
                    · {work.next_session.timezone}
                  </p>
                )}
                <progress
                  value={work.progress}
                  max={100}
                  aria-label={`${work.game} reported progress`}
                />
                <small>
                  {work.progress}% reported ·{" "}
                  <time dateTime={work.updated_at}>
                    {new Date(work.updated_at).toLocaleString()}
                  </time>
                </small>
              </li>
            ))}
          </ul>
          <div className="catalog-actions">
            {params.get("after") && (
              <Link
                to={`?${new URLSearchParams({ ...Object.fromEntries(query), after: "" }).toString()}`}
              >
                Newest assignments
              </Link>
            )}
            {resource.data.next && (
              <Link
                to={`?${new URLSearchParams({ ...Object.fromEntries(query), after: resource.data.next }).toString()}`}
              >
                Older assignments
              </Link>
            )}
          </div>
        </>
      )}
    </section>
  );
}
function Assignment({
  work,
  hidden,
  loading,
  back,
  reload,
}: {
  work: Work;
  hidden: boolean;
  loading: boolean;
  back: string;
  reload: () => void;
}) {
  const location: Location<unknown> = useLocation();
  return (
    <RecordShell
      id={work.order_id}
      title="Assignment"
      workspace="Booster workspace"
      headingLevel={2}
      compactReference
      status={
        <>
          <strong>
            {work.game} · {work.service}
          </strong>
          <span className="status">
            {work.completion_pending
              ? "Awaiting completion review"
              : work.state.replaceAll("_", " ")}
          </span>
          <span>{work.progress}% reported complete</span>
          <Action disabled={loading} onClick={reload}>
            Refresh assignment
          </Action>
        </>
      }
      back={{
        to: back,
        label:
          back === "/booster/calendar"
            ? "Calendar & availability"
            : back === "/booster"
              ? "Booster overview"
              : "Assigned work",
      }}
      sections={sections
        .filter(
          (section) => section.id !== "sessions" || work.mode === "together",
        )
        .filter(
          (section) => section.id !== "access" || work.mode === "account",
        )}
      keepMounted={["progress", "messages", "sessions"]}
    >
      {(section, visible) => (
        <>
          {section === "overview" && (
            <>
              <h3>Your next step</h3>
              <WorkSummary work={work} />
              <p>
                Progress and completion requests are customer-visible.
                Completion requires administrator review.
              </p>
            </>
          )}
          {section === "progress" && (
            <fieldset disabled={loading || hidden}>
              <legend>Progress update</legend>
              <AssignmentActions work={work} reload={reload} />
              <Link to="?section=messages" state={location.state}>
                Add scanned proof in assignment messages
              </Link>
            </fieldset>
          )}
          {section === "messages" && (
            <>
              <h3>Shared assignment conversation</h3>
              <p>
                Visible to the customer, currently assigned booster and PLAYORA
                staff. Keep credentials in Game access.
              </p>
              {work.coordination_id && work.coordination_shared ? (
                <Thread
                  conversationID={work.coordination_id}
                  booster
                  embedded
                  visible={visible && !hidden}
                />
              ) : (
                <p>
                  {["queued", "in_progress", "on_hold"].includes(work.state)
                    ? "Shared coordination is not available. Ask your administrator to enable it for this assignment."
                    : "Shared messages are no longer available for this inactive assignment."}
                </p>
              )}
            </>
          )}
          {section === "sessions" && (
            <fieldset disabled={loading || hidden}>
              <legend>Assignment sessions</legend>
              <Bookings work={work} audience="booster" reload={reload} />
            </fieldset>
          )}
          {section === "access" && visible && !hidden && !loading && (
            <StaffSecret key={work.access_version} work={work} admin={false} />
          )}
        </>
      )}
    </RecordShell>
  );
}
function BoosterOrderSession() {
  const { id = "" } = useParams();
  const location: Location<unknown> = useLocation();
  const source = sourceSchema.safeParse(location.state);
  const back =
    source.success && source.data.assignmentOrigin
      ? source.data.assignmentOrigin === "calendar"
        ? "/booster/calendar"
        : "/booster"
      : "/booster/orders" +
        (source.success && source.data.assignmentSearch
          ? "?" + new URLSearchParams(source.data.assignmentSearch).toString()
          : "");
  const resource = useResource(
    `/booster/fulfillment/${encodeURIComponent(id)}`,
    workSchema,
  );
  const [interrupted, setInterrupted] = useState(false);
  const [verification, setVerification] = useState<VerificationReason>();
  const recoveryHeading = useRef<HTMLHeadingElement>(null);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [saved, setSaved] = useState<Work | null>(null);
  const lost = interrupted || denied(resource.error);
  useEffect(() => {
    if (lost) focusValidationTarget(recoveryHeading.current);
  }, [lost, verification]);
  if (lost && saved) setSaved(null);
  else if (!lost && !checkingAccess && resource.data && saved !== resource.data)
    setSaved(resource.data);
  const reloadWork = resource.reload;
  const reload = useCallback(() => {
    if (lost) setCheckingAccess(true);
    setInterrupted(false);
    setVerification(undefined);
    reloadWork();
  }, [lost, reloadWork]);
  useEffect(() => {
    const changed = (event: Event) => {
      if (sessionEventMatches(event, "booster")) {
        setInterrupted(true);
        setVerification(sessionVerificationReason(event));
      }
    };
    window.addEventListener("boosterplus:session-changed", changed);
    return () => {
      window.removeEventListener("boosterplus:session-changed", changed);
    };
  }, []);
  useEffect(() => {
    if (lost) return;
    const refresh = () => {
      if (!document.hidden) reloadWork();
    };
    const timer = window.setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [lost, reloadWork]);
  if (checkingAccess && resource.loading)
    return <p role="status">Checking current assignment access…</p>;
  if (checkingAccess && !resource.loading) setCheckingAccess(false);
  if (lost) {
    const recovery = verification
      ? Object.assign(
          new APIError(
            "Confirm your identity to continue. Private details remain hidden until access is checked again.",
          ),
          { code: verification, status: 403 },
        )
      : null;
    return (
      <section aria-label="Assignment access removed">
        <h2 ref={recoveryHeading} tabIndex={-1}>
          {recovery ? "Verify to continue" : "Assignment access changed"}
        </h2>
        {recovery ? (
          <p role="alert">{recovery.message}</p>
        ) : (
          <p role="alert">
            Access changed. Private details and drafts have been cleared. Check
            assignment access to continue with your current permissions.
          </p>
        )}
        <div className="catalog-actions">
          {recovery && <VerificationLink error={recovery} />}
          <Link to={back}>Return to assigned work</Link>
          <Action disabled={resource.loading} onClick={reload}>
            Check assignment access
          </Action>
        </div>
      </section>
    );
  }
  const work = resource.data ?? saved;
  const suspended = !!resource.error;
  return (
    <>
      <ErrorNotice error={resource.error} />
      {suspended && (
        <section aria-label="Assignment connection recovery">
          <p>
            Assignment details are hidden while the connection is unavailable.
            Your unsent ordinary drafts stay in memory.
          </p>
          <Action disabled={resource.loading} onClick={reload}>
            Retry assignment
          </Action>
        </section>
      )}
      {!work && !resource.error && <p role="status">Loading assignment…</p>}
      {work && (
        <div hidden={suspended}>
          <Assignment
            work={work}
            hidden={suspended}
            loading={resource.loading}
            back={back}
            reload={reload}
          />
        </div>
      )}
    </>
  );
}
export function BoosterOrder() {
  const { id } = useParams();
  return <BoosterOrderSession key={id} />;
}
