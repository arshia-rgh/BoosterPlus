import {
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
  type SubmitEvent,
} from "react";
import { Link, useSearchParams } from "react-router";
import { z } from "zod";
import {
  get,
  post,
  command,
  errorMessage,
  userSchema,
  sessionSchema,
  codesSchema,
  sessionsSchema,
  auditsSchema,
  recoveriesSchema,
  type Session,
  type User,
} from "./api";

type Refresh = () => Promise<void>;
function Form({
  title,
  children,
  submit,
  label = title,
}: {
  title: string;
  children?: ReactNode;
  submit: (data: FormData) => Promise<void>;
  label?: string;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function send(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      await submit(data);
      setMessage("Done.");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="identity-card" onSubmit={(event) => void send(event)}>
      <h2>{title}</h2>
      <fieldset disabled={busy}>
        {children}
        <button className="button" type="submit">
          {busy ? "Please wait…" : label}
        </button>
      </fieldset>
      <p role="status">{message}</p>
    </form>
  );
}
function Text({
  name,
  label,
  type = "text",
  required = true,
  autoComplete = "off",
  maxLength = 254,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  maxLength?: number;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        maxLength={maxLength}
      />
    </label>
  );
}
const value = (data: FormData, name: string) => {
  const field = data.get(name);
  return typeof field === "string" ? field : "";
};
function EmailForm({
  purpose,
  email = "",
  refresh,
}: {
  purpose: "login" | "reauth" | "email_change" | "recovery";
  email?: string;
  refresh: Refresh;
}) {
  const [challenge, setChallenge] = useState(""),
    [done, setDone] = useState(false);
  const title =
    new Map([
      ["login", "Continue with email"],
      ["reauth", "Verify your email again"],
      ["email_change", "Change email"],
      ["recovery", "Request account recovery"],
    ]).get(purpose) ?? "Verify email";
  return (
    <section className="identity-section">
      <Form
        title={title}
        label={
          purpose === "recovery"
            ? "Send recovery verification code"
            : "Send verification code"
        }
        submit={async (data) => {
          const result = await post(
            "/auth/email/request",
            {
              email: email || value(data, "email"),
              account_email: value(data, "account_email"),
              purpose,
              accept_terms: data.get("terms") === "on",
            },
            z.object({ challenge_id: z.string() }),
          );
          setChallenge(result.challenge_id);
          setDone(false);
        }}
      >
        {purpose === "recovery" && (
          <>
            <p>
              Access to a new email address does not prove ownership of an
              existing account. An owner must independently review your request.
              Your authenticator remains required.
            </p>
            <Text
              name="account_email"
              label="Current account email"
              type="email"
            />
          </>
        )}
        {email ? (
          <p>Send a code to {email}.</p>
        ) : (
          <Text
            name="email"
            label={
              purpose === "recovery" || purpose === "email_change"
                ? "New email address"
                : "Email address"
            }
            type="email"
            autoComplete="email"
          />
        )}
        {purpose === "login" && (
          <label className="check">
            <input type="checkbox" name="terms" required />I accept the{" "}
            <Link to="/terms" target="_blank" rel="noreferrer">
              account terms
            </Link>
            .
          </label>
        )}
        <p>
          Codes expire after 10 minutes. Wait at least 60 seconds before
          requesting another.
        </p>
      </Form>
      {challenge && !done && (
        <Form
          title="Check your inbox"
          label="Verify email code"
          submit={async (data) => {
            await post(
              "/auth/email/verify",
              { challenge_id: challenge, code: value(data, "code") },
              z.object({ purpose: z.string() }),
            );
            setDone(true);
            await refresh();
          }}
        >
          <p>If the request is eligible, a code will arrive shortly.</p>
          <Text
            name="code"
            label="Email verification code"
            autoComplete="one-time-code"
            maxLength={6}
          />
        </Form>
      )}
      {done && (
        <p role="status">
          {purpose === "recovery"
            ? "Your destination email is verified. Eligible requests await an independent ownership review. No account access has been granted."
            : purpose === "email_change"
              ? "Email changed. Sign in again with your new email address."
              : "Email verified."}
        </p>
      )}
    </section>
  );
}
function Google({
  session,
  purpose,
  refresh,
}: {
  session: Session;
  purpose: "login" | "link" | "reauth";
  refresh: Refresh;
}) {
  return (
    <Form
      title={
        purpose === "login"
          ? "Continue with Google"
          : purpose === "link"
            ? "Link Google"
            : "Verify Google again"
      }
      submit={async (data) => {
        const result = await post(
          "/auth/google/start",
          { purpose, accept_terms: data.get("terms") === "on" },
          z.object({ url: z.url() }),
        );
        const target = new URL(result.url);
        if (target.origin !== "https://accounts.google.com")
          throw new Error("Unexpected provider");
        await refresh();
        window.location.assign(target.href);
      }}
    >
      {purpose === "login" && (
        <label className="check">
          <input type="checkbox" name="terms" required />I accept the{" "}
          <Link to="/terms" target="_blank" rel="noreferrer">
            account terms
          </Link>
          .
        </label>
      )}
      {!session.google_enabled && (
        <p>Google sign-in is currently unavailable. Continue with email.</p>
      )}
    </Form>
  );
}
function Security({
  session,
  refresh,
  onCodes,
}: {
  session: Session;
  refresh: Refresh;
  onCodes: (codes: string[]) => void;
}) {
  const [secret, setSecret] = useState("");
  const user = session.user;
  if (!user) return null;
  return (
    <section className="identity-section">
      <h2>Authenticator security</h2>
      <p>
        Staff must verify an authenticator at every sign-in. A code can be used
        only once. Sensitive changes require email or Google verification and an
        authenticator code from the last 10 minutes.
      </p>
      {!user.mfa_enabled && (
        <Form
          title="Set up authenticator"
          submit={async () => {
            const result = await post(
              "/auth/mfa/enroll",
              {},
              z.object({ secret: z.string(), url: z.string() }),
            );
            setSecret(result.secret);
          }}
        >
          <p>
            Add Booster Plus to your authenticator app using the setup key, then
            verify its six-digit code.
          </p>
        </Form>
      )}
      {secret && (
        <div className="secret" role="status">
          <p>Manual setup key (time based, six digits, 30 seconds)</p>
          <code>{secret}</code>
          <p>
            Keep this key private. It expires in 10 minutes if setup is not
            completed.
          </p>
        </div>
      )}
      {(user.mfa_enabled || secret) && (
        <Form
          title="Verify authenticator"
          submit={async (data) => {
            const result = await post(
              "/auth/mfa/verify",
              { code: value(data, "code") },
              codesSchema,
            );
            onCodes(result.recovery_codes);
            setSecret("");
            await refresh();
          }}
        >
          <Text
            name="code"
            label="Authenticator or recovery code"
            autoComplete="one-time-code"
            maxLength={26}
          />
        </Form>
      )}
      {user.mfa_enabled && !session.mfa_required && (
        <>
          <Form
            title="Replace recovery codes"
            submit={async () => {
              const result = await post(
                "/auth/mfa/recovery-codes",
                {},
                codesSchema,
              );
              onCodes(result.recovery_codes);
            }}
          >
            <p>
              This invalidates previous codes and signs out your other sessions.
            </p>
            <label className="check">
              <input type="checkbox" required />
              Replace my existing recovery codes
            </label>
          </Form>
          {user.role === "customer" && (
            <Form
              title="Disable authenticator"
              submit={async () => {
                await command("/auth/mfa/disable");
                await refresh();
              }}
            >
              <p>This signs out all your sessions.</p>
              <label className="check">
                <input type="checkbox" required />
                Disable my second factor
              </label>
            </Form>
          )}
        </>
      )}
    </section>
  );
}
function SessionList({ refresh }: { refresh: Refresh }) {
  const [items, setItems] = useState<
    z.infer<typeof sessionsSchema>["sessions"]
  >([]);
  return (
    <section>
      <Form
        title="Active sessions"
        label="Load sessions"
        submit={async () => {
          setItems((await get("/me/sessions", sessionsSchema)).sessions);
        }}
      />
      {items.map((item) => (
        <Form
          key={item.id}
          title={item.current ? "This session" : "Another session"}
          label="Sign out this session"
          submit={async () => {
            await command("/auth/sessions/revoke", { id: item.id, all: false });
            setItems([]);
            await refresh();
          }}
        >
          <p>
            Started {new Date(item.created_at).toLocaleString()}. Expires{" "}
            {new Date(item.expires_at).toLocaleString()}.
          </p>
        </Form>
      ))}
      <Form
        title="Sign out everywhere"
        submit={async () => {
          await command("/auth/sessions/revoke", { id: "", all: true });
          await refresh();
        }}
      >
        <label className="check">
          <input type="checkbox" required />
          End every session
        </label>
      </Form>
    </section>
  );
}
function Account({
  session,
  refresh,
  onCodes,
}: {
  session: Session;
  refresh: Refresh;
  onCodes: (codes: string[]) => void;
}) {
  const user = session.user;
  if (!user) return null;
  return (
    <div className="identity-grid">
      <section>
        <Form
          title="Profile"
          label="Save profile"
          submit={async (data) => {
            await command("/me/profile", {
              display_name: value(data, "display_name"),
              staff_alias: value(data, "staff_alias"),
              notify_updates: data.get("notify_updates") === "on",
            });
            await refresh();
          }}
        >
          <p>{user.email}</p>
          <p className="muted">Account ID: {user.id}</p>
          <label>
            Display name
            <input
              name="display_name"
              defaultValue={user.display_name}
              maxLength={100}
            />
          </label>
          {user.role !== "customer" && (
            <label>
              Customer-facing staff alias
              <input
                name="staff_alias"
                defaultValue={user.staff_alias}
                maxLength={80}
              />
            </label>
          )}
          <label className="check">
            <input
              type="checkbox"
              name="notify_updates"
              defaultChecked={user.notify_updates}
            />
            Email me order updates when orders are available
          </label>
          <p>Security emails are always sent.</p>
        </Form>
        <SessionList refresh={refresh} />
      </section>
      <section>
        <details>
          <summary>Verify identity for sensitive changes</summary>
          <EmailForm purpose="reauth" email={user.email} refresh={refresh} />
          {session.google_enabled && session.google_linked && (
            <Google session={session} purpose="reauth" refresh={refresh} />
          )}
        </details>
        <Security session={session} refresh={refresh} onCodes={onCodes} />
        <details>
          <summary>Email and linked Google account</summary>
          <EmailForm purpose="email_change" refresh={refresh} />
          {session.google_enabled && !session.google_linked && (
            <Google session={session} purpose="link" refresh={refresh} />
          )}{" "}
          {session.google_linked && (
            <Form
              title="Disconnect Google"
              submit={async () => {
                await command("/me/google/unlink");
                await refresh();
              }}
            >
              <p>
                Your verified email remains available. All sessions will end.
              </p>
              <label className="check">
                <input type="checkbox" required />
                Disconnect Google and sign out
              </label>
            </Form>
          )}
        </details>
      </section>
    </div>
  );
}
function UserControls({
  user,
  owner,
  refresh,
}: {
  user: User;
  owner: boolean;
  refresh: Refresh;
}) {
  return (
    <article className="identity-card">
      <h3>{user.email}</h3>
      <p>
        {user.display_name || "No display name"} · {user.role} ·{" "}
        {user.suspended ? "Suspended" : "Active"}
      </p>
      <p className="muted">Internal ID: {user.id}</p>
      {owner && (
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
    </article>
  );
}
function Administration({
  session,
  refresh,
}: {
  session: Session;
  refresh: Refresh;
}) {
  const [users, setUsers] = useState<User[]>([]),
    [audits, setAudits] = useState<z.infer<typeof auditsSchema>["audits"]>([]),
    [recoveries, setRecoveries] = useState<
      z.infer<typeof recoveriesSchema>["recoveries"]
    >([]);
  const owner = session.capabilities.includes("owner");
  async function reload() {
    setUsers(
      (await get("/admin/users", z.object({ users: z.array(userSchema) })))
        .users,
    );
    await refresh();
  }
  return (
    <section>
      <p>
        Identity administration is ready. Order management arrives with the
        order phase.
      </p>
      <p>
        For sensitive changes, first verify your identity in{" "}
        <Link to="/account">account security</Link>.
      </p>
      <Form title="User directory" label="Load users" submit={reload}>
        <p>Displays the latest 100 accounts. Only owners can assign roles.</p>
      </Form>
      <div className="identity-grid">
        {users.map((user) => (
          <UserControls
            key={user.id}
            user={user}
            owner={owner}
            refresh={reload}
          />
        ))}
      </div>
      {owner && (
        <>
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
        </>
      )}
    </section>
  );
}
export default function Identity({
  title,
  capability = "account",
  children,
}: {
  title: string;
  capability?: "account" | "admin" | "booster";
  children?: React.ReactNode;
}) {
  const [search] = useSearchParams();
  const googleError = new Map([
    ["verification", "Google verification failed. Start again or use email."],
    [
      "link_conflict",
      "Sign in to your existing account with email, then link Google from account security.",
    ],
    [
      "terms",
      "Accept the current account terms before continuing with Google.",
    ],
  ]).get(search.get("error") ?? "");
  const [session, setSession] = useState<Session | null>(null),
    [failure, setFailure] = useState(""),
    [codes, setCodes] = useState<string[]>([]);
  const revision = useRef(0);
  const currentUser = useRef<string | null>(null);
  const refresh = useCallback(async () => {
    const requestRevision = ++revision.current;
    try {
      const result = await get("/auth/session", sessionSchema);
      if (requestRevision !== revision.current) return;
      setSession(result);
      if ((result.user?.id ?? null) !== currentUser.current) setCodes([]);
      currentUser.current = result.user?.id ?? null;
      setFailure("");
    } catch (error) {
      if (requestRevision !== revision.current) return;
      setSession(null);
      setFailure(errorMessage(error));
    }
  }, []);
  useEffect(() => {
    const changed = () => {
      void refresh();
    };
    window.addEventListener("boosterplus:session-changed", changed);
    window.addEventListener("focus", changed);
    return () => {
      window.removeEventListener("boosterplus:session-changed", changed);
      window.removeEventListener("focus", changed);
    };
  }, [refresh]);
  useEffect(() => {
    let active = true;
    const requestRevision = ++revision.current;
    void get("/auth/session", sessionSchema)
      .then((result) => {
        if (active && requestRevision === revision.current) {
          setSession(result);
          currentUser.current = result.user?.id ?? null;
        }
      })
      .catch((error: unknown) => {
        if (active && requestRevision === revision.current)
          setFailure(errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <main id="main" className="page identity-page">
      <title>{`${title} | Booster Plus`}</title>
      <p className="eyebrow">Booster Plus account</p>
      <h1>{title}</h1>
      {googleError && <p role="alert">{googleError}</p>}
      {failure ? (
        <div role="alert">
          <p>{failure}</p>
          <button className="button" onClick={() => void refresh()}>
            Retry connection
          </button>
        </div>
      ) : !session ? (
        <p role="status">Loading sign-in…</p>
      ) : (
        <>
          {codes.length > 0 && (
            <section className="secret">
              <h2>Save your recovery codes</h2>
              <p>
                Each code works once, after Google or email verification. Store
                them privately; they will not be shown again.
              </p>
              <ul>
                {codes.map((code) => (
                  <li key={code}>
                    <code>{code}</code>
                  </li>
                ))}
              </ul>
              <button
                className="button"
                onClick={() => {
                  setCodes([]);
                }}
              >
                I saved my recovery codes
              </button>
            </section>
          )}
          {!session.user ? (
            <>
              <p>
                Sign in with Google or an email code. No password is needed.
              </p>
              <div className="identity-grid">
                <EmailForm purpose="login" refresh={refresh} />
                {session.google_enabled ? (
                  <Google session={session} purpose="login" refresh={refresh} />
                ) : (
                  <p>
                    Google sign-in is currently unavailable. Continue with
                    email.
                  </p>
                )}
              </div>
              <details>
                <summary>Lost access to your email?</summary>
                <EmailForm purpose="recovery" refresh={refresh} />
              </details>
            </>
          ) : (
            <>
              <nav className="account-nav" aria-label="Account navigation">
                <Link to="/account">Profile and security</Link>
                <Link to="/orders">My orders</Link>
                <Link to="/sell">Sell an account</Link>
                <Link to="/reviews">My reviews</Link>
                <Link to="/favorites">Favorites</Link>
                <Link to="/support">Support</Link>
                <Link to="/notifications">Activity</Link>
                {session.capabilities.includes("admin") && (
                  <>
                    <Link to="/admin">Administration</Link>
                    <Link to="/admin/catalog">Catalog editor</Link>
                    <Link to="/admin/coupons">Coupons</Link>
                    <Link to="/admin/orders">Order queue</Link>
                    <Link to="/admin/submissions">Account submissions</Link>
                    <Link to="/admin/reviews">Review moderation</Link>
                    <Link to="/admin/calendar">Staff calendars</Link>
                    <Link to="/admin/support">Support inbox</Link>
                  </>
                )}
                {session.capabilities.includes("booster") && (
                  <>
                    <Link to="/booster/orders">Assigned work</Link>{" "}
                    <Link to="/booster/calendar">My calendar</Link>
                  </>
                )}
              </nav>
              <Form
                title="Sign out"
                submit={async () => {
                  await command("/auth/logout");
                  setCodes([]);
                  await refresh();
                }}
              />
              {session.mfa_required ? (
                <>
                  <p role="alert">
                    Authenticator verification is required to finish signing in.
                  </p>
                  <Security
                    session={session}
                    refresh={refresh}
                    onCodes={setCodes}
                  />
                  <details>
                    <summary>Verify email again</summary>
                    <EmailForm
                      purpose="reauth"
                      email={session.user.email}
                      refresh={refresh}
                    />
                  </details>
                </>
              ) : !session.capabilities.includes(capability) ? (
                <p role="alert">You do not have access to this portal.</p>
              ) : children ? (
                children
              ) : capability === "admin" ? (
                <Administration session={session} refresh={refresh} />
              ) : capability === "booster" ? (
                <p>
                  Your assigned-order workspace will be available when order
                  fulfillment launches.
                </p>
              ) : (
                <Account
                  session={session}
                  refresh={refresh}
                  onCodes={setCodes}
                />
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
