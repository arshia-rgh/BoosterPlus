import { Link } from "../portal-router";
import { useState, type Ref } from "react";
import { z } from "../validation";
import { Form, value } from "../identity/identity";
import { get, command, sessionsSchema, type User } from "../identity/api";
type Refresh = (message: string) => Promise<void>;
export function UserControls({
  user,
  owner,
  refresh,
  summaryRef,
}: {
  user: User;
  owner: boolean;
  refresh: Refresh;
  summaryRef?: Ref<HTMLElement>;
}) {
  const [sessions, setSessions] = useState<
    z.infer<typeof sessionsSchema>["sessions"]
  >([]);
  return (
    <details className="identity-card staff-person">
      <summary ref={summaryRef}>
        <strong>{user.display_name || user.email}</strong>
        <span>
          {user.portal} account · {user.role} ·{" "}
          {user.suspended ? "Suspended" : "Active"}
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
      {user.portal === "customer" && (
        <p>
          <Link to={"/admin/orders?customer=" + user.id}>Order history</Link> ·{" "}
          <Link to={"/admin/support?customer=" + user.id}>Support history</Link>
        </p>
      )}
      <p>
        This {user.portal} account has its own profile, permissions, sessions
        and authenticator. A matching email in another workspace is a separate
        identity.
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
            await refresh("All active sessions revoked.");
          }}
        >
          <label className="check">
            <input type="checkbox" required />
            Confirm sign-out on all devices
          </label>
        </Form>
      )}

      {owner && !user.deleted && user.portal === "admin" && (
        <Form
          title="Change role"
          submit={async (data) => {
            await command(
              "/admin/users/" + encodeURIComponent(user.id) + "/role",
              { role: value(data, "role") },
            );
            await refresh("Role updated and active sessions revoked.");
          }}
        >
          <label>
            Role
            <select name="role" defaultValue={user.role}>
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
            await refresh(
              user.suspended
                ? "Account access restored."
                : "Account suspended.",
            );
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
