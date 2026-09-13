import { Link, useSearchParams } from "react-router";
import { AuthorizedIdentity } from "../identity/frame";
import { useContext, useState } from "react";
import { z } from "../validation";
import OperationsOverview from "../operations/overview";
import { Form, Text, value } from "../identity/identity";
import {
  get,
  command,
  userSchema,
  auditsSchema,
  recoveriesSchema,
  sessionsSchema,
  type Session,
  type User,
} from "../identity/api";
type Refresh = () => Promise<void>;
function UserControls({
  user,
  owner,
  refresh,
}: {
  user: User;
  owner: boolean;
  refresh: Refresh;
}) {
  const [sessions, setSessions] = useState<
    z.infer<typeof sessionsSchema>["sessions"]
  >([]);
  return (
    <details className="identity-card staff-person">
      <summary>
        <strong>{user.display_name || user.email}</strong>
        <span>
          {user.role} · {user.suspended ? "Suspended" : "Active"}
        </span>
      </summary>
      <h3>{user.email}</h3>
      <p>
        {user.display_name || "No display name"} · {user.role} ·{" "}
        {user.suspended ? "Suspended" : "Active"}
      </p>
      <p className="muted">
        Internal ID: {user.id} ·{" "}
        {user.email_verified ? "Verified email" : "Unverified email"} ·{" "}
        {user.deleted ? "Profile erased" : "Profile retained"}
      </p>
      <p>
        <Link to={"/admin/orders?customer=" + user.id}>Order history</Link> ·{" "}
        <Link to={"/admin/support?customer=" + user.id}>Support history</Link>
      </p>
      <Form
        title="Active sessions"
        label="Load active sessions"
        submit={async () => {
          setSessions(
            (await get("/admin/users/" + user.id + "/sessions", sessionsSchema))
              .sessions,
          );
        }}
      />
      <ul>
        {sessions.map((session) => (
          <li key={session.id}>
            Started {new Date(session.created_at).toLocaleString()} · last
            active {new Date(session.last_seen_at).toLocaleString()}
          </li>
        ))}
      </ul>
      {!user.deleted && (
        <Form
          title="Revoke all active sessions"
          submit={async () => {
            await command("/admin/users/" + user.id + "/sessions/revoke", {});
            setSessions([]);
            await refresh();
          }}
        >
          <label className="check">
            <input type="checkbox" required />
            Confirm sign-out on all devices
          </label>
        </Form>
      )}

      {owner && !user.deleted && (
        <Form
          title="Change role"
          submit={async (data) => {
            await command(
              "/admin/users/" + encodeURIComponent(user.id) + "/role",
              { role: value(data, "role") },
            );
            await refresh();
          }}
        >
          <label>
            Role
            <select name="role" defaultValue={user.role}>
              <option value="customer">Customer</option>
              <option value="booster">Booster</option>
              <option value="administrator">Administrator</option>
              <option value="owner">Owner</option>
            </select>
          </label>
          <label className="check">
            <input type="checkbox" required />
            Apply this role and revoke their sessions
          </label>
        </Form>
      )}
      {!user.deleted && (
        <Form
          title={user.suspended ? "Restore account" : "Suspend account"}
          submit={async () => {
            await command(
              "/admin/users/" + encodeURIComponent(user.id) + "/suspension",
              { suspended: !user.suspended },
            );
            await refresh();
          }}
        >
          <label className="check">
            <input type="checkbox" required />
            Confirm account access change
          </label>
        </Form>
      )}
    </details>
  );
}
function Administration({
  directoryOnly = false,
  session,
  refresh,
}: {
  session: Session;
  refresh: Refresh;
  directoryOnly?: boolean;
}) {
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? ""),
    [state, setState] = useState(""),
    [after, setAfter] = useState(""),
    [next, setNext] = useState("");
  const [users, setUsers] = useState<User[]>([]),
    [audits, setAudits] = useState<z.infer<typeof auditsSchema>["audits"]>([]),
    [recoveries, setRecoveries] = useState<
      z.infer<typeof recoveriesSchema>["recoveries"]
    >([]);
  const owner = session.capabilities.includes("owner");
  const [loaded, setLoaded] = useState(false);
  async function load(cursor: string) {
    setUsers([]);
    setNext("");
    setLoaded(false);
    const page = await get(
      "/admin/users?" +
        new URLSearchParams({ search, state, after: cursor }).toString(),
      z.object({ users: z.array(userSchema), next: z.string() }),
    );
    setUsers(page.users);
    setAfter(cursor);
    setNext(page.next);
    setLoaded(true);
    await refresh();
  }
  async function reload() {
    await load(after);
  }
  if (!directoryOnly) return <OperationsOverview />;
  return (
    <section className="staff-directory">
      <h2>Account and staff administration</h2>
      <p>
        For sensitive changes, first verify your identity in{" "}
        <a href="/account/security?returnTo=%2Fadmin%2Fcustomers">
          account security
        </a>
        .
      </p>
      <Form
        title="User directory"
        label="Load users"
        submit={async () => load("")}
      >
        <p>
          Search verified identities in pages of 50. Directory access is
          audited. Only owners can assign roles.
        </p>
        <label>
          Search email, display name or full user ID
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            maxLength={254}
          />
        </label>
        <label>
          Account state
          <select
            value={state}
            onChange={(event) => {
              setState(event.target.value);
            }}
          >
            <option value="">All accounts</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deleted">Erased profiles</option>
          </select>
        </label>
      </Form>
      {loaded && (
        <p role="status">
          {users.length
            ? `${String(users.length)} identities in this page`
            : "No matching identities. Adjust the search or account state."}
        </p>
      )}
      <div className="staff-directory-results">
        {users.map((user) => (
          <UserControls
            key={user.id}
            user={user}
            owner={owner}
            refresh={reload}
          />
        ))}
      </div>
      {next && <Form title="Next users" submit={async () => load(next)} />}
      {after && <Form title="First users" submit={async () => load("")} />}
      {owner && (
        <details className="staff-security-review">
          <summary>Security audit and recovery review</summary>
          <Form
            title="Security audit"
            label="Load audit"
            submit={async () => {
              setAudits((await get("/admin/audit", auditsSchema)).audits);
            }}
          />
          <ul className="audit-list">
            {audits.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.action}</strong> · {entry.created_at}
                <br />
                Actor: {entry.actor_id || entry.actor_reference} · Target:{" "}
                {entry.target_id}
              </li>
            ))}
          </ul>
          <Form
            title="Recovery review"
            label="Load recovery requests"
            submit={async () => {
              setRecoveries(
                (await get("/admin/recoveries", recoveriesSchema)).recoveries,
              );
            }}
          >
            <p>
              Verify ownership using independent evidence before approval. A
              code sent to a new address is insufficient. Keep evidence in your
              restricted support case; record only its reference here. Approval
              disconnects Google and revokes sessions. It preserves suspension
              and the authenticator.
            </p>
          </Form>
          {recoveries.map((entry) => (
            <Form
              key={entry.id}
              title={"Recovery for " + entry.user_id}
              label="Resolve recovery"
              submit={async (data) => {
                await command(
                  "/admin/recoveries/" +
                    encodeURIComponent(entry.id) +
                    "/resolve",
                  {
                    approve: value(data, "decision") === "approve",
                    case_reference: value(data, "reference"),
                  },
                );
                setRecoveries(
                  (await get("/admin/recoveries", recoveriesSchema)).recoveries,
                );
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
              <label className="check">
                <input type="checkbox" required />I reviewed ownership evidence
                and recorded the case
              </label>
            </Form>
          ))}
        </details>
      )}
    </section>
  );
}

export default function AdministrationEntry() {
  const identity = useContext(AuthorizedIdentity);
  return identity ? (
    <Administration session={identity.session} refresh={identity.refresh} />
  ) : null;
}

export function Customers() {
  const identity = useContext(AuthorizedIdentity);
  return identity ? (
    <Administration
      session={identity.session}
      refresh={identity.refresh}
      directoryOnly
    />
  ) : null;
}
