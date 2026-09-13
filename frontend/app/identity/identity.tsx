import {
  SignInReturn,
  VerificationLink,
  VerificationReturn,
  rememberGoogleReturn,
  clearGoogleReturn,
  safeReturnPath,
} from "../account/return-path";
import AccountNavigation from "../account/navigation";
import AccountOverview from "../account/overview";
import { PageHeader } from "../ui/page-header";
import { createElement, useContext } from "react";
import { AuthorizedIdentity, IdentityFrame } from "./frame";
import {
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
  type SubmitEvent,
} from "react";
import { Link, NavLink, useSearchParams } from "react-router";
import { z } from "../validation";
import {
  get,
  post,
  command,
  errorMessage,
  sessionSchema,
  codesSchema,
  sessionsSchema,
  type Session,
} from "./api";

type Refresh = () => Promise<void>;
export function Form({
  title,
  children,
  submit,
  label = title,
  compact = false,
  success = "Request completed.",
}: {
  title: string;
  children?: ReactNode;
  submit: (data: FormData) => Promise<void>;
  label?: string;
  compact?: boolean;
  success?: string;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [failed, setFailed] = useState(false),
    [problem, setProblem] = useState<unknown>(null);
  const lock = useRef(false);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (failed) feedback.current?.focus();
  }, [failed]);
  async function send(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    setFailed(false);
    setProblem(null);
    try {
      await submit(data);
      setMessage(success);
    } catch (error) {
      setMessage(errorMessage(error));
      setFailed(true);
      setProblem(error);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className={compact ? "identity-session-action" : "identity-card"}
      onSubmit={(event) => void send(event)}
    >
      {!compact && <h2>{title}</h2>}
      <fieldset disabled={busy}>
        {children}
        <button className="button" type="submit">
          {busy ? "Please wait…" : label}
        </button>
      </fieldset>
      <p ref={feedback} tabIndex={-1} role={failed ? "alert" : "status"}>
        {message}
      </p>
      <VerificationLink error={problem} />
    </form>
  );
}
export function Text({
  name,
  label,
  type = "text",
  required = true,
  autoComplete = "off",
  maxLength = 254,
  inputMode,
  pattern,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  maxLength?: number;
  inputMode?: "numeric" | "text";
  pattern?: string;
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
        inputMode={inputMode}
        pattern={pattern}
      />
    </label>
  );
}
export const value = (data: FormData, name: string) => {
  const field = data.get(name);
  return typeof field === "string" ? field : "";
};
function EmailForm({
  termsVersion = "",
  purpose,
  email = "",
  refresh,
}: {
  purpose: "login" | "reauth" | "email_change" | "recovery";
  termsVersion?: string;
  email?: string;
  refresh: Refresh;
}) {
  const [challenge, setChallenge] = useState(""),
    [done, setDone] = useState(false),
    [requestedEmail, setRequestedEmail] = useState("");
  const codeContainer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (challenge) codeContainer.current?.querySelector("input")?.focus();
  }, [challenge]);
  const title =
    new Map([
      ["login", "Continue with email"],
      ["reauth", "Verify your email again"],
      ["email_change", "Change email"],
      ["recovery", "Request account recovery"],
    ]).get(purpose) ?? "Verify email";
  return (
    <section className="identity-section">
      {!challenge && (
        <Form
          title={title}
          success="Check your inbox for the verification code."
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
                terms_version: termsVersion,
              },
              z.object({ challenge_id: z.string() }),
            );
            setRequestedEmail(email || value(data, "email"));
            setChallenge(result.challenge_id);
            setDone(false);
          }}
        >
          {purpose === "recovery" && (
            <>
              <p>
                Access to a new email address does not prove ownership of an
                existing account. An owner must independently review your
                request. Your authenticator remains required.
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
      )}
      {challenge && !done && (
        <div ref={codeContainer}>
          <Form
            key={challenge}
            title="Check your inbox"
            success="Email verified."
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
            <p>
              If the request is eligible, a code will arrive at {requestedEmail}{" "}
              shortly.
            </p>
            <Text
              name="code"
              label="Email verification code"
              autoComplete="one-time-code"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]{6}"
            />
            <p>
              Codes expire after 10 minutes. You can request another after 60
              seconds.
            </p>
          </Form>
          <button
            className="account-text-action"
            type="button"
            onClick={() => {
              setChallenge("");
              setDone(false);
            }}
          >
            Change email or request another code
          </button>
        </div>
      )}
      {done && (
        <p role="status">
          {purpose === "recovery"
            ? "Your destination email is verified. Eligible requests await an independent ownership review. No account access has been granted."
            : purpose === "email_change"
              ? "Email changed. Sign in again with your new email address."
              : "Email verified."}
          {purpose === "reauth" && (
            <button
              className="account-text-action"
              type="button"
              onClick={() => {
                setChallenge("");
                setDone(false);
              }}
            >
              Verify again
            </button>
          )}
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
          {
            purpose,
            accept_terms: data.get("terms") === "on",
            terms_version: session.terms_version,
          },
          z.object({ url: z.url() }),
        );
        const target = new URL(result.url);
        if (target.origin !== "https://accounts.google.com")
          throw new Error("Unexpected provider");
        await refresh();
        const requested = safeReturnPath(
          new URLSearchParams(window.location.search).get("returnTo"),
        );
        rememberGoogleReturn(
          purpose === "login"
            ? (requested ?? window.location.pathname)
            : "/account/security",
          purpose === "login" ? undefined : (requested ?? undefined),
        );
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
            Add this account to your authenticator app using the setup key, then
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
  section = "profile",
}: {
  session: Session;
  refresh: Refresh;
  onCodes: (codes: string[]) => void;
  section?: "profile" | "security" | "preferences";
}) {
  const user = session.user;
  const [name, setName] = useState(user?.display_name ?? "");
  const [alias, setAlias] = useState(user?.staff_alias ?? "");
  if (!user) return null;
  return (
    <div className="account-settings">
      {section === "security" && <VerificationReturn />}
      <nav className="settings-navigation" aria-label="Account settings">
        <NavLink to="/account/settings">Profile</NavLink>
        <NavLink to="/account/security">Security</NavLink>
        <NavLink to="/account/preferences">Preferences</NavLink>
        <Link to="/privacy">Privacy</Link>
      </nav>
      {section === "profile" && (
        <Form
          title="Profile"
          label="Save profile"
          success="Profile saved."
          submit={async (data) => {
            await command("/me/profile", {
              display_name: value(data, "display_name"),
              staff_alias: value(data, "staff_alias"),
              notify_updates: user.notify_updates,
            });
            await refresh();
            setName(value(data, "display_name").trim());
            setAlias(value(data, "staff_alias").trim());
          }}
        >
          <p className="quiet">
            Choose the name you want to use in your account.
          </p>
          <label>
            Display name
            <input
              name="display_name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
              maxLength={100}
              autoComplete="nickname"
            />
          </label>
          {user.role !== "customer" && (
            <label>
              Customer-facing staff alias
              <input
                name="staff_alias"
                value={alias}
                onChange={(event) => {
                  setAlias(event.target.value);
                }}
                maxLength={80}
              />
            </label>
          )}
          <p>{user.email} · Verified email</p>
          <Link to="/account/security">Manage email and sign-in methods</Link>
          <details>
            <summary>Account reference</summary>
            <p className="quiet">{user.id}</p>
          </details>
        </Form>
      )}
      {section === "preferences" && (
        <Form
          title="Email preferences"
          label="Save preferences"
          success="Email preferences saved."
          submit={async (data) => {
            await command("/me/profile", {
              display_name: user.display_name,
              staff_alias: user.staff_alias,
              notify_updates: data.get("notify_updates") === "on",
            });
            await refresh();
          }}
        >
          <label className="check">
            <input
              type="checkbox"
              name="notify_updates"
              defaultChecked={user.notify_updates}
            />
            Email me order updates
          </label>
          <p>Security emails are always sent.</p>
          <p>
            <Link to="/availability">Manage package availability alerts</Link>{" "}
            separately.
          </p>
        </Form>
      )}
      {section === "security" && (
        <>
          <section className="account-panel">
            <h2>Verify a sensitive change</h2>
            <p>
              Verify your email or Google account and a fresh authenticator code
              before sensitive changes. Then return to the original action and
              review it again.
            </p>
            <EmailForm purpose="reauth" email={user.email} refresh={refresh} />
            {session.google_enabled && session.google_linked && (
              <Google session={session} purpose="reauth" refresh={refresh} />
            )}
          </section>
          <Security session={session} refresh={refresh} onCodes={onCodes} />
          <details>
            <summary>Active sessions and sign-out options</summary>
            <SessionList refresh={refresh} />
          </details>
          <details>
            <summary>Email and linked Google account</summary>
            <EmailForm purpose="email_change" refresh={refresh} />
            {session.google_enabled && !session.google_linked && (
              <Google session={session} purpose="link" refresh={refresh} />
            )}
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
        </>
      )}
    </div>
  );
}
export default function Identity({
  title,
  capability = "account",
  children,
  view = "profile",
}: {
  title: string;
  view?: "overview" | "profile" | "security" | "preferences";
  capability?: "account" | "admin" | "booster" | "owner";
  children?: React.ReactNode;
}) {
  const Frame = useContext(IdentityFrame);
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
  return createElement(Frame, {
    session,
    title,
    navigation:
      session?.user && capability !== "admin" && capability !== "owner" ? (
        <AccountNavigation
          key={session.user.id}
          session={session}
          action={
            <Form
              compact
              title="Sign out"
              submit={async () => {
                await command("/auth/logout");
                clearGoogleReturn();
                setCodes([]);
                await refresh();
              }}
            />
          }
        />
      ) : null,
    children: (
      <main id="main" className="page identity-page">
        <SignInReturn
          ready={
            !!session?.user &&
            !session.mfa_required &&
            session.capabilities.includes(capability) &&
            codes.length === 0
          }
        />
        <title>{`${title} | PLAYORA`}</title>
        <PageHeader
          title={title}
          eyebrow={
            capability === "admin" || capability === "owner"
              ? "Staff workspace"
              : "PLAYORA account"
          }
        />
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
                  Each code works once, after Google or email verification.
                  Store them privately; they will not be shown again.
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
                  <EmailForm
                    purpose="login"
                    refresh={refresh}
                    termsVersion={session.terms_version}
                  />
                  {session.google_enabled ? (
                    <Google
                      session={session}
                      purpose="login"
                      refresh={refresh}
                    />
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
                {(capability === "admin" || capability === "owner") && (
                  <Form
                    compact
                    title="Sign out"
                    submit={async () => {
                      await command("/auth/logout");
                      clearGoogleReturn();
                      setCodes([]);
                      await refresh();
                    }}
                  />
                )}
                {session.mfa_required ? (
                  <>
                    <p role="alert">
                      Authenticator verification is required to finish signing
                      in.
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
                  <AuthorizedIdentity
                    key={session.user.id}
                    value={{ session, refresh }}
                  >
                    {children}
                  </AuthorizedIdentity>
                ) : capability === "booster" ? (
                  <section
                    className="booster-start"
                    aria-label="Booster workspace shortcuts"
                  >
                    <h2>Your work, in focus.</h2>
                    <p>
                      Open your{" "}
                      <Link to="/booster/orders">assigned-order workspace</Link>{" "}
                      or your{" "}
                      <Link to="/booster/calendar">availability calendar</Link>.
                    </p>
                    <div className="catalog-cards">
                      <Link className="workspace-shortcut" to="/booster/orders">
                        <span className="eyebrow">01 · ASSIGNED WORK</span>
                        <h3>Pick up where you left off ↗</h3>
                        <p>
                          Review the agreed scope, update progress and
                          coordinate in the fulfillment conversation.
                        </p>
                      </Link>
                      <Link
                        className="workspace-shortcut"
                        to="/booster/calendar"
                      >
                        <span className="eyebrow">02 · YOUR SCHEDULE</span>
                        <h3>Make room for good work ↗</h3>
                        <p>
                          Manage availability and proposed sessions with an
                          explicit time zone.
                        </p>
                      </Link>
                    </div>
                  </section>
                ) : view === "overview" ? (
                  <AccountOverview key={session.user.id} />
                ) : (
                  <Account
                    key={session.user.id}
                    section={view}
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
    ),
  });
}
