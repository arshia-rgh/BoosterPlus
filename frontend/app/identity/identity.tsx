import { DisplayPreferences } from "./display-preferences";
import {
  portalFromPath,
  portalLogin,
  portalHome,
  portalSecurity,
  sessionEventMatches,
  type Portal,
} from "./portal";
import { Button, Skeleton } from "../ui/primitives";
import {
  FieldValidation,
  TextField as Text,
  ValidationSummary,
  type RegisteredField,
  type FieldIssue,
} from "../ui/form-validation";
export { TextField as Text } from "../ui/form-validation";
import { clearConfigurationDraft } from "../catalog/configuration-draft";
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
import { RetryButton, useRetryPending } from "../ui/retry-button";
import { Feedback, PanelState } from "../ui/feedback";
import "../ui/feedback.css";
import { PageHeader } from "../ui/page-header";
import { createContext, createElement, useContext } from "react";
import { AuthorizedIdentity, IdentityFrame } from "./frame";
import {
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
  type SubmitEvent,
} from "react";
import {
  Link,
  NavLink,
  Navigate,
  useLocation,
  useSearchParams,
} from "react-router";
import { z } from "../validation";
import {
  get,
  post,
  command,
  errorMessage,
  APIError,
  sessionSchema,
  codesSchema,
  sessionsSchema,
  type Session,
} from "./api";

type Refresh = () => Promise<void>;
// Email and Google share entry progression, including a server-supplied cooldown.
const EntryProgress = createContext<{
  busy: boolean;
  acquire: () => boolean;
  release: () => void;
  retryAt: number | undefined;
  setRetryAt: (time: number | undefined) => void;
} | null>(null);
function AuthEntryProgress({ children }: { children: ReactNode }) {
  const [busy, setBusy] = useState(false);
  const [retryAt, setRetryAt] = useState<number | undefined>();
  const lock = useRef(false);
  const acquire = useCallback(() => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    return true;
  }, []);
  const release = useCallback(() => {
    lock.current = false;
    setBusy(false);
  }, []);
  return (
    <EntryProgress value={{ busy, acquire, release, retryAt, setRetryAt }}>
      {children}
    </EntryProgress>
  );
}
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
  const entry = useContext(EntryProgress);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [failed, setFailed] = useState(false),
    [problem, setProblem] = useState<unknown>(null);
  const cooling = useRetryPending(
    Math.max(
      problem instanceof APIError ? (problem.retryAt ?? 0) : 0,
      entry?.retryAt ?? 0,
    ) || undefined,
  );
  const [fields, setFields] = useState<RegisteredField[]>([]);
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const register = useCallback((field: RegisteredField) => {
    setFields((current) => [
      ...current.filter((item) => item.id !== field.id),
      field,
    ]);
    return () => {
      setFields((current) => current.filter((item) => item.id !== field.id));
    };
  }, []);
  const correct = useCallback(
    (name: string) => {
      if (!issues.some((issue) => issue.path === name)) return;
      const remaining = issues.filter((issue) => issue.path !== name);
      setIssues(remaining);
      if (remaining.length === 0) {
        setFailed(false);
        setMessage("Changes entered. Submit again to check them.");
      }
    },
    [issues],
  );
  const lock = useRef(false);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (failed) feedback.current?.focus();
  }, [failed]);
  async function send(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || cooling) return;
    if (entry && !entry.acquire()) return;
    lock.current = true;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    setFailed(false);
    setProblem(null);
    setIssues([]);
    try {
      await submit(data);
      setMessage(success);
    } catch (error) {
      setMessage(errorMessage(error));
      setFailed(true);
      setProblem(error);
      if (error instanceof APIError && error.retryAt !== undefined)
        entry?.setRetryAt(error.retryAt);
      setIssues(error instanceof APIError ? error.issues : []);
    } finally {
      lock.current = false;
      entry?.release();
      setBusy(false);
    }
  }
  return (
    <FieldValidation value={{ issues, register, correct }}>
      <form
        method="post"
        className={compact ? "identity-session-action" : "identity-card"}
        onSubmit={(event) => void send(event)}
      >
        {!compact && <h2>{title}</h2>}
        <fieldset disabled={busy || entry?.busy}>
          {children}
          <Button
            className="button"
            type="submit"
            disabled={cooling}
            busy={busy}
          >
            {cooling ? "Wait before trying again" : label}
          </Button>
        </fieldset>
        <Feedback feedbackRef={feedback} kind={failed ? "error" : "status"}>
          {message}
        </Feedback>
        <ValidationSummary issues={issues} fields={fields} />
        <VerificationLink error={problem} />
      </form>
    </FieldValidation>
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
  const portal = portalFromPath(useLocation().pathname);
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
                  : portal === "customer"
                    ? "Email address"
                    : "Work email address"
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
            : portalSecurity(session.portal),
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
  const heading = useRef<HTMLHeadingElement>(null);
  const pending = session.mfa_required;
  useEffect(() => {
    if (pending) heading.current?.focus();
  }, [pending]);
  const user = session.user;
  if (!user) return null;
  return (
    <section className="identity-section">
      <h2 ref={heading} tabIndex={-1}>
        Authenticator security
      </h2>
      <p>
        {session.portal === "customer"
          ? "When enabled, your authenticator adds a second verification step to sign-in."
          : "Staff must verify an authenticator at every sign-in."}{" "}
        A code can be used only once. Sensitive changes require email or Google
        verification and an authenticator code from the last 10 minutes.
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
      {session.mfa_required && user.mfa_enabled && (
        <details className="auth-recovery-help">
          <summary>Can’t use your authenticator?</summary>
          <p>
            Use one of your unused recovery codes in the field above. Each code
            works once, after your email or Google verification.
          </p>
          <p>
            {session.portal === "customer" ? (
              <>
                If you have no remaining codes, recovery requires a PLAYORA
                support review. Consult the{" "}
                <Link to="/terms">public account terms</Link> or your existing
                PLAYORA correspondence for recovery assistance.
              </>
            ) : (
              "If you have no remaining codes, contact your PLAYORA administrator through your established staff contact channel for an access review."
            )}{" "}
            Do not send your setup key, verification codes or recovery codes.
            Email verification alone cannot remove the authenticator
            requirement.
          </p>
        </details>
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
          title={`${item.portal === "admin" ? "Admin" : item.portal === "booster" ? "Booster" : "Customer"} · ${item.current ? "This session" : "Another session"}`}
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
  const portal = session.portal;
  const base = portal === "customer" ? "/account" : `/${portal}/account`;
  const user = session.user;
  const [name, setName] = useState(user?.display_name ?? "");
  const [alias, setAlias] = useState(user?.staff_alias ?? "");
  if (!user) return null;
  return (
    <div className="account-settings">
      {section === "security" && <VerificationReturn />}
      <nav className="settings-navigation" aria-label="Account settings">
        <NavLink to={`${base}/settings`}>Profile</NavLink>
        <NavLink to={`${base}/security`}>Security</NavLink>
        <NavLink to={`${base}/preferences`}>Preferences</NavLink>
        {portal === "customer" && <Link to="/privacy">Privacy</Link>}
      </nav>
      {section === "profile" && (
        <Form
          title="Profile"
          label="Save profile"
          success="Profile saved."
          submit={async (data) => {
            await command("/me/profile", {
              display_name: value(data, "display_name"),
              staff_alias:
                portal === "customer"
                  ? user.staff_alias
                  : value(data, "staff_alias"),
              notify_updates: user.notify_updates,
            });
            await refresh();
            setName(value(data, "display_name").trim());
            setAlias(
              portal === "customer"
                ? user.staff_alias
                : value(data, "staff_alias").trim(),
            );
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
          {portal !== "customer" && (
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
          <Link to={`${base}/security`}>Manage email and sign-in methods</Link>
          <details>
            <summary>Account reference</summary>
            <p className="quiet">{user.id}</p>
          </details>
        </Form>
      )}
      {section === "preferences" && (
        <>
          <DisplayPreferences />
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
            {portal === "customer" && (
              <p>
                <Link to="/availability">
                  Manage package availability alerts
                </Link>{" "}
                separately.
              </p>
            )}
          </Form>
        </>
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
type IdentityProps = {
  title: string;
  view?: "overview" | "profile" | "security" | "preferences";
  capability?: "self" | "account" | "admin" | "booster" | "owner";
  children?: ReactNode;
};
export default function Identity(props: IdentityProps) {
  const portal = portalFromPath(useLocation().pathname);
  return <PortalIdentity key={portal} {...props} portal={portal} />;
}
function PortalIdentity({
  title,
  capability = "account",
  children,
  view = "profile",
  portal,
}: IdentityProps & { portal: Portal }) {
  const location = useLocation();
  const entry = location.pathname === portalLogin(portal);
  if (entry)
    title =
      portal === "admin"
        ? "Admin sign-in"
        : portal === "booster"
          ? "Booster sign-in"
          : "Sign in";
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
    [failureStatus, setFailureStatus] = useState<number | undefined>(undefined),
    [retryAt, setRetryAt] = useState<number | undefined>(undefined),
    [refreshing, setRefreshing] = useState(false),
    [codes, setCodes] = useState<string[]>([]);
  const revision = useRef(0);
  const currentUser = useRef<string | null>(null);
  const pending = useRef(false);
  const cooldown = useRef<number | undefined>(undefined);
  const refresh = useCallback(
    async (sessionChanged = true) => {
      // Focus and manual retry share the same lock. A completed auth mutation can
      // supersede an older read, but even that must respect the server cooldown.
      if (cooldown.current !== undefined && cooldown.current > Date.now())
        return;
      if (pending.current && !sessionChanged) return;
      const requestRevision = ++revision.current;
      pending.current = true;
      setRefreshing(true);
      try {
        const result = await get("/auth/session", sessionSchema, portal);
        if (requestRevision !== revision.current) return;
        setSession(result);
        if ((result.user?.id ?? null) !== currentUser.current) setCodes([]);
        currentUser.current = result.user?.id ?? null;
        setFailure("");
        setFailureStatus(undefined);
        cooldown.current = undefined;
        setRetryAt(undefined);
      } catch (error) {
        if (requestRevision !== revision.current) return;
        setSession(null);
        setFailure(errorMessage(error));
        setFailureStatus(error instanceof APIError ? error.status : undefined);
        cooldown.current =
          error instanceof APIError ? error.retryAt : undefined;
        setRetryAt(cooldown.current);
      } finally {
        if (requestRevision === revision.current) {
          pending.current = false;
          setRefreshing(false);
        }
      }
    },
    [portal],
  );
  const cancelRefresh = useCallback(() => {
    revision.current++;
    pending.current = false;
  }, []);
  useEffect(() => {
    const changed = (event: Event) => {
      if (sessionEventMatches(event, portal)) void refresh();
    };
    const focused = () => {
      void refresh(false);
    };
    window.addEventListener("boosterplus:session-changed", changed);
    window.addEventListener("focus", focused);
    let active = true;
    // Start the bootstrap read asynchronously; unmount cancels queued work and
    // invalidates any read already in flight without changing another session.
    void Promise.resolve().then(async () => {
      if (active) await refresh();
    });
    return () => {
      active = false;
      window.removeEventListener("boosterplus:session-changed", changed);
      window.removeEventListener("focus", focused);
      cancelRefresh();
    };
  }, [refresh, cancelRefresh, portal]);
  if (!entry && session && (!session.user || session.mfa_required)) {
    const target =
      safeReturnPath(location.pathname + location.search, portal) ??
      portalHome(portal);
    return (
      <Navigate
        replace
        to={`${portalLogin(portal)}?returnTo=${encodeURIComponent(target)}`}
      />
    );
  }
  return createElement(Frame, {
    session: entry ? null : session,
    title,
    navigation:
      session?.user && !entry && portal !== "admin" ? (
        <AccountNavigation
          key={`${portal}:${session.user.id}`}
          session={session}
          action={
            <Form
              compact
              title="Sign out"
              submit={async () => {
                await command("/auth/logout");
                clearGoogleReturn(portal);
                if (portal === "customer") clearConfigurationDraft();
                setCodes([]);
                await refresh();
              }}
            />
          }
        />
      ) : null,
    children: (
      <main
        id="main"
        className={`page identity-page${entry ? " portal-sign-in" : ""}`}
        data-portal={portal}
      >
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
            portal === "admin"
              ? "Admin workspace"
              : portal === "booster"
                ? "Booster workspace"
                : "My account"
          }
        />
        {entry && (
          <ol className="portal-sign-in-steps" aria-label="Sign-in steps">
            <li aria-current={!session?.user ? "step" : undefined}>
              1 · Verify email or Google
            </li>
            {(portal !== "customer" || session?.mfa_required) && (
              <li aria-current={session?.mfa_required ? "step" : undefined}>
                2 · Verify authenticator
              </li>
            )}
          </ol>
        )}
        {googleError && <p role="alert">{googleError}</p>}
        {failure ? (
          <PanelState
            kind="error"
            title={
              failureStatus === 429
                ? "Please wait before trying again"
                : "Connection unavailable"
            }
            description={failure}
          >
            <RetryButton
              deadline={retryAt}
              busy={refreshing}
              onRetry={() => {
                void refresh(false);
              }}
            >
              {refreshing ? "Checking connection…" : "Retry connection"}
            </RetryButton>
          </PanelState>
        ) : !session ? (
          <PanelState
            title="Checking your sign-in"
            description="Loading sign-in…"
          >
            <Skeleton label="" />
          </PanelState>
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
                  {portal === "customer"
                    ? "Sign in or create your account with Google or email. No password needed."
                    : `Use your invited ${portal} account. Email or Google verification is followed by your authenticator.`}
                </p>
                {portal !== "customer" && (
                  <p className="quiet">
                    Access is managed by PLAYORA. This page does not create
                    staff accounts.
                  </p>
                )}
                <AuthEntryProgress>
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
                </AuthEntryProgress>
                <details>
                  <summary>Lost access to your email?</summary>
                  <EmailForm purpose="recovery" refresh={refresh} />
                </details>
              </>
            ) : (
              <>
                {(portal === "admin" || entry) && (
                  <Form
                    compact
                    title="Sign out"
                    submit={async () => {
                      await command("/auth/logout");
                      clearGoogleReturn(portal);
                      if (portal === "customer") clearConfigurationDraft();
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
                ) : entry ? (
                  <p role="status">
                    {codes.length
                      ? "Save your recovery codes to finish signing in."
                      : "Opening your workspace…"}
                  </p>
                ) : children ? (
                  <AuthorizedIdentity
                    key={`${portal}:${session.user.id}`}
                    value={{ session, refresh }}
                  >
                    {children}
                  </AuthorizedIdentity>
                ) : capability === "booster" && view === "overview" ? (
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
                  <AccountOverview key={`${portal}:${session.user.id}`} />
                ) : (
                  <Account
                    key={`${portal}:${session.user.id}`}
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
        {entry && portal !== "customer" && (
          <p className="portal-entry-help">
            <a href="/">Visit the PLAYORA website ↗</a>
          </p>
        )}
      </main>
    ),
  });
}
